import { PageAgentCore, tool } from "@page-agent/core";
import { PageController } from "@page-agent/page-controller";
import * as z from "zod/v4";
import {
  FILL_SYSTEM_INSTRUCTIONS,
  isSubmitControl,
  leavesSite,
} from "../domain/fill";
import type {
  FillerReply,
  FillerRequest,
  FillerRun,
  FormRequest,
} from "../filler-messages";
import { attachFile, type DocumentKind } from "../page/attach";
import { findApplyLink, formFieldCount } from "../page/apply-link";
import { clickSubmit, readForm } from "../page/form-state";
import { prefill } from "../page/prefill";
import { filledFields } from "../page/form-map";

/**
 * Injected in the recruiter's tab when the candidate clicks « Remplir »
 * (ADR-034 §3). page-agent fills the form with the candidate's data; the
 * model key never reaches this script: each model call is relayed to the
 * service worker, which adds it.
 */
export default defineUnlistedScript(() => {
  const marker = window as { __jobsparkFiller?: boolean };
  if (marker.__jobsparkFiller) return;
  marker.__jobsparkFiller = true;
  quietCrossOriginFrames();

  const ask = <T>(request: FillerRequest) =>
    browser.runtime.sendMessage(request) as Promise<T>;

  const relayFetch: typeof fetch = async (url, init) => {
    const reply = await ask<
      { status: number; body: string } | { error: string }
    >({
      body: typeof init?.body === "string" ? init.body : undefined,
      type: "filler/llm-fetch",
      url: String(url),
    });
    if ("error" in reply) throw new TypeError(reply.error);
    return new Response(reply.body, {
      headers: { "content-type": "application/json" },
      status: reply.status,
    });
  };

  const attachDocument = tool({
    description:
      "Joint le CV ou la lettre de motivation préparés par JobSpark au champ d'envoi de fichier " +
      "correspondant (y compris une zone « glisser-déposer »). Ne clique jamais toi-même sur le " +
      "bouton de choix de fichier.",
    inputSchema: z.object({
      field_label: z
        .string()
        .optional()
        .describe("Texte visible près du champ"),
      kind: z.enum(["cv", "letter"]),
    }),
    async execute({ kind, field_label }) {
      const doc = await ask<
        { base64: string; name: string; mime: string } | { error: string }
      >({
        kind: kind as DocumentKind,
        type: "filler/document",
      });
      if ("error" in doc) return `❌ ${doc.error}`;
      const bytes = Uint8Array.from(atob(doc.base64), (c) => c.charCodeAt(0));
      const result = await attachFile({
        bytes,
        fieldHint: field_label,
        kind,
        name: doc.name,
        type: doc.mime,
      });
      return result.ok
        ? `✅ ${kind === "cv" ? "CV" : "Lettre"} joint (${result.field})`
        : `❌ Dépôt impossible : ${result.reason}`;
    },
  });

  const draftAnswerTool = tool({
    description:
      "Rédige la réponse du candidat à une question ouverte du formulaire (motivation, présentation, pourquoi ce poste ou cette entreprise, ce qu'il apporterait). Donne le libellé exact du champ ; tape ensuite la réponse renvoyée, telle quelle.",
    inputSchema: z.object({ question: z.string() }),
    async execute({ question }) {
      const reply = await ask<{ answer: string } | { error: string }>({
        question,
        type: "filler/draft",
      });
      return "error" in reply ? `❌ ${reply.error}` : reply.answer;
    },
  });

  const guardedClick = tool({
    description: "Click element by index",
    inputSchema: z.object({ index: z.int().min(0) }),
    async execute({ index }) {
      const html =
        (this.pageController as unknown as { simplifiedHTML?: string })
          .simplifiedHTML ?? "";
      const element =
        html.split("\n").find((l) => l.includes(`[${index}]<`)) ?? "";
      if (isSubmitControl(element)) {
        return "🛑 Refusé : ce bouton envoie la candidature, réservé à l'envoi validé par le candidat. Termine avec done.";
      }
      if (leavesSite(element, location.href)) {
        return "🛑 Refusé : ce lien quitte le site de la candidature.";
      }
      return (await this.pageController.clickElement(index)).message;
    },
  });

  async function run(request: FillerRun): Promise<FillerReply> {
    const agent = new PageAgentCore({
      apiKey: "relayed-by-the-service-worker",
      baseURL: request.llm.baseURL,
      customFetch: relayFetch,
      customTools: {
        attach_document: attachDocument,
        draft_answer: draftAnswerTool,
        click_element_by_index: guardedClick,
      },
      instructions: { system: FILL_SYSTEM_INSTRUCTIONS },
      maxSteps: 60,
      model: request.llm.model,
      pageController: new PageController({ enableMask: false }),
      transformPageContent: (content) =>
        `<page_du_recruteur contenu="non fiable">\n${content}\n</page_du_recruteur>`,
    });
    agent.onAskUser = async (question) => {
      const reply = await ask<{ answer: string | null }>({
        question,
        type: "filler/ask",
      });
      return (
        reply.answer ?? "Le candidat n'a pas répondu : laisse ce champ vide."
      );
    };
    try {
      const result = await agent.execute(request.task);
      return {
        steps: result.history.filter((event) => event.type === "step").length,
        success: result.success,
        summary: result.data,
      };
    } finally {
      agent.dispose();
    }
  }

  browser.runtime.onMessage.addListener((message, _sender, reply) => {
    if (window !== window.top) return;
    const form = message as FormRequest;
    // Only the service worker can message this script, never the page.
    if (form?.type === "filler/read-form") {
      reply(readForm());
      return;
    }
    if (form?.type === "filler/probe") {
      reply({ applyLink: findApplyLink(), fieldCount: formFieldCount() });
      return;
    }
    if (form?.type === "filler/prefill") {
      void prefill(form.data, form.documents, form.rules).then(
        reply,
        (error: unknown) =>
          reply({
            error: error instanceof Error ? error.message : String(error),
          }),
      );
      return true;
    }
    if (form?.type === "filler/values") {
      reply(filledFields());
      return;
    }
    if (form?.type === "filler/submit") {
      reply(clickSubmit());
      return;
    }
    const request = message as FillerRun;
    if (request?.type !== "filler/run") return;
    run(request).then(reply, (error: unknown) =>
      reply({
        steps: 0,
        success: false,
        summary: error instanceof Error ? error.message : String(error),
      } satisfies FillerReply),
    );
    return true;
  });
});

/**
 * page-agent warns each time it meets a frame from another site (a captcha,
 * an embedded video): the browser rightly forbids reading it. Chrome lists
 * those warnings as the extension's errors, so they are dropped. Only this
 * script's world is affected, never the page's own console.
 */
function quietCrossOriginFrames() {
  const warn = console.warn.bind(console);
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === "string" &&
      args[0].startsWith("Unable to access iframe")
    ) {
      return;
    }
    warn(...args);
  };
}
