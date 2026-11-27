import { Filling } from "../application/filling";
import { Preparation } from "../application/preparation";
import { Sending } from "../application/sending";
import { Session } from "../application/session";
import { localAiKeyStore } from "../infrastructure/ai-key-store";
import { ChromeAuthorizer } from "../infrastructure/chrome-authorizer";
import { signedFileDownloader } from "../infrastructure/download";
import { chromeFillTab } from "../infrastructure/fill-tab";
import { chromeFormTab } from "../infrastructure/form-tab";
import { apiEndpoints } from "../infrastructure/config";
import { JobSparkMcp } from "../infrastructure/jobspark-mcp";
import { chromeLocalStore } from "../infrastructure/local-store";
import { ExtensionOAuthProvider } from "../infrastructure/oauth-provider";
import { chromePageReader } from "../infrastructure/page-reader";
import { PanelChannel } from "../infrastructure/panel-channel";
import type { FillerRequest } from "../filler-messages";
import type { PanelRequest, PanelResponse } from "../messages";

export default defineBackground(() => {
  const api = apiEndpoints();
  const store = chromeLocalStore();
  const aiKeys = localAiKeyStore(store);
  const provider = new ExtensionOAuthProvider(
    store,
    browser.identity.getRedirectURL(),
  );
  const tools = new JobSparkMcp(
    api.mcpUrl,
    provider,
    browser.runtime.getManifest().version,
  );
  const session = new Session({
    aiKeys,
    apiHost: api.host,
    authorizer: new ChromeAuthorizer(provider, api, (url) =>
      browser.identity.launchWebAuthFlow({ interactive: true, url }),
    ),
    tools,
  });
  const pages = chromePageReader();
  const preparation = new Preparation({ pages, tools });
  const panel = new PanelChannel();
  const filling = new Filling({
    aiKeys,
    candidate: panel,
    download: signedFileDownloader(),
    pages,
    relay: {
      accessToken: async () => (await provider.tokens())?.access_token ?? null,
      origin: api.origin,
    },
    tab: chromeFillTab(),
    tools,
  });
  const sending = new Sending({
    form: chromeFormTab(),
    lastFill: (tabId) => filling.lastFill(tabId),
    pages,
    tools,
  });

  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  const handle = (request: PanelRequest) => {
    switch (request.type) {
      case "state":
        return session.state();
      case "connect":
        return session.connect();
      case "disconnect":
        return session.disconnect();
      case "save-ai-key":
        return session.saveAiKey(request.settings);
      case "clear-ai-key":
        return session.clearAiKey();
      case "inspect-offer":
        return preparation.inspect();
      case "prepare-offer":
        return preparation.prepare({ cost: request.cost, url: request.url });
      case "fill-options":
        return filling.options();
      case "fill":
        return filling.fill({
          applicationId: request.applicationId,
          completeOptional: request.completeOptional,
          identity: request.identity,
          url: request.url,
        });
      case "review":
        return sending.review();
      case "send":
        return sending.send({
          applicationId: request.applicationId,
          url: request.url,
        });
      case "answer-question":
        panel.answer(request.id, request.answer, request.save);
        return Promise.resolve(null);
    }
  };

  browser.runtime.onMessage.addListener((request, sender, reply) => {
    // Only the extension's own pages (side panel) talk to the service worker,
    // never a script running inside a recruiter's page.
    if (sender.id !== browser.runtime.id) return;
    const ownPage = sender.url?.startsWith(browser.runtime.getURL("/"));
    const type = (request as { type?: unknown })?.type;
    if (!ownPage) {
      // The filler in the recruiter's tab: only its own requests, only for
      // the tab being filled (checked by Filling.handle).
      if (typeof type !== "string" || !type.startsWith("filler/")) return;
      filling
        .handle(sender.tab?.id, request as FillerRequest)
        .then(reply, (error: unknown) => reply({ error: String(error) }));
      return true;
    }
    if (typeof type === "string" && type.startsWith("panel/")) return;
    handle(request as PanelRequest).then(
      (value): void => reply({ ok: true, value } satisfies PanelResponse),
      (error: unknown): void =>
        reply({
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        } satisfies PanelResponse),
    );
    return true;
  });
});
