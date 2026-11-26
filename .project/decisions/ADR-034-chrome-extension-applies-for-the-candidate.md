# ADR-034: A JobSpark Chrome extension applies on the recruiter's site

Date: 2026-11-26
Status: accepted (owner's go on 2026-11-26, US-194 then US-195 launched)

Builds on ADR-032 (MCP server) and ADR-033 (OAuth). Epic E33. Owner request
of 2026-11-26: "je voudrais vraiment à terme qu'on puisse laisser l'agent tout
faire et postuler en toute confiance […] décharger l'utilisateur de la charge
mentale de postuler".

## Context

On 2026-11-26 the owner ran a real application from claude.ai: the JobSpark
connector in production (`/mcp`, OAuth) plus Claude in Chrome, for a Wavestone
offer hosted on SmartRecruiters. Claude found the offer, prepared the
application, generated the CV and the letter, opened the form and filled
every text field. It stopped at the **CV file field**: Claude in Chrome, used
from claude.ai, can click and type but can neither download a file nor put
one into an `<input type="file">`. `get_document_download_url` returned a
valid signed link (10 min), but nothing could carry the PDF into the page.

So the whole flow works except attaching the document, and a generic browser
agent cannot attach it. Claude Code can (its Chrome tool uploads a local file),
but that is a developer tool, not something candidates use.

A study of 2026-11-25 (owner session, not written in the repo until now)
compared the open-source bases:

- **`alibaba/page-agent`** (MIT, npm `page-agent`, 1.12.4 read from its
  types): it drives a page from its text, without screenshots. It supports
  `customTools` (experimental, zod v4), `onAskUser`,
  `onBeforeStep`/`onAfterStep`, `getPageInstructions(url)`,
  `transformPageContent` and an OpenAI-compatible model (`model`, `baseURL`,
  `apiKey`). It has **no tool to attach a file**, its UI is English/Chinese
  only, and it has one maintainer.
- **Nanobrowser** (Apache-2.0): a complete side-panel extension. It is a good
  reference for the UI, but too large to fork and keep in sync.
- To avoid: WebBrain (GPL-3.0); AIHawk (formerly AGPL, auto-apply now closed
  and commercial).

What that study decided, and what changes here:

- It chose **assisted mode**: the extension fills the form and the user clicks
  "Envoyer", and an internal click guard refuses submit buttons.
- The owner now wants the agent to be able to submit on its own, within limits
  the candidate trusts. This ADR keeps the base and replaces the permanent
  click guard with **earned autonomy levels** (decision 6).
- What stays: **no automated applying on LinkedIn or Indeed**. Their terms
  forbid it, and the candidate's account would be the one banned.

## Decision

1. **A new app `apps/extension`** (Manifest V3) in the monorepo.
   - Built with **WXT** (MIT) and React, reusing `packages/types`. There is
     no shared UI package in the repo: the side panel uses Tailwind CSS v4 with
     the same colour tokens as `apps/web`. React goes through
     `@vitejs/plugin-react` 5 directly: `@wxt-dev/module-react` pulls
     plugin-react 6, which needs Vite 8 while the repo is on Vite 7.
   - French UI, our own side panel, inspired by Nanobrowser, with nothing
     forked.
   - The manifest `key` pins the extension id.
2. **page-agent as an engine, not a framework**:
   - We use `@page-agent/core` at an exact version (no `^`); a needed fix
     goes through `pnpm patch`. No fork.
   - It sits behind our own small interface (`fillPage`, `askUser`, `stop`),
     so the engine can be replaced if the project stops.
3. **Where each part runs**:
   - **The service worker** is the MCP client of `/mcp` and calls the API
     through `host_permissions`, so no CORS is involved. It holds the OAuth
     tokens in `chrome.storage.local` and relays the model calls, so neither
     the token nor the model key ever reaches a page.
   - **The side panel**: connection, the current offer, "Préparer",
     "Postuler", progress and proof.
   - **The script injected into the recruiter's tab**, on demand
     (`scripting` + the optional `<all_urls>` host permission, asked from the
     side panel at first use; `<all_urls>` because `captureVisibleTab`, used
     for the proof, needs it): page-agent plus the JobSpark tools.
4. **Connection by OAuth**, through ADR-033's flow:
   - `chrome.identity.launchWebAuthFlow`, redirect
     `https://<extension id>.chromiumapp.org/`, the `extension` scope preset
     (no `profile:write`).
   - `chrome-extension://<id>` is added to `MCP_ALLOWED_ORIGINS`.
   - The preset includes `credits:read`, so the extension can announce a cost
     against the balance before spending, and `answers:write` (US-197), so an
     answer the candidate gives in the side panel can be kept for later forms.
     Only the candidate's own replies are saved; the in-page model has no tool
     that writes them.
   - The consent page starts on the narrowest preset that covers the request,
     and the server never grants more than the client asked for.
   - No pasted `jsk_` token in the normal path.
5. **JobSpark tools given to the in-page agent**:
   - `get_candidate_profile` → MCP `get_profile`.
   - **`attach_document`**: the service worker downloads the PDF from the
     signed link and hands its bytes to the page. The script builds a `File`
     and sets it on the field with a `DataTransfer`, then fires
     `input`/`change`. For drop zones, it dispatches `dragenter`/`drop` with
     the same `DataTransfer`. The PDF never goes through a third party.
   - `answer_screening_question`: the answer comes from the candidate's
     **saved answers**: availability, salary expectation, work authorisation,
     driving licence, mobility, notice period. A question without a saved
     answer stops the flow and asks the candidate through `onAskUser` or a
     push notification. **The agent never invents an answer.**
   - `submit_application`: the only way to click the final button (decision 6).
     It is not a model tool: the extension's own code finds the one final
     button and clicks it after « Valider et envoyer »; the model's click tool
     refuses submit buttons.
   - `record_submission` → a new MCP tool. It stores the proof (decision 7)
     and sets the status to `sent`.
6. **Earned autonomy levels**, chosen by the candidate and stored with the
   account:
   - **Level 1, per application** (default): the agent prepares and fills,
     then shows a summary in the side panel (offer, documents, every answer
     given). The candidate presses "Valider et envoyer", and only then does
     `submit_application` click. This is what sprint 040 ships.
   - **Level 2, daily batch**: complete applications wait in a JobSpark list;
     the candidate approves them together, and the extension submits them.
   - **Level 3, under mandate**: the extension submits on its own when the
     offer fits the **mandate**: jobs, areas, minimum salary, contract
     types, excluded companies, applications per day.
   - Levels 2 and 3 open only after several level-1 applications sent with no
     correction. The candidate can step down or stop everything at any time.
     They come in a later sprint and need the mandate stored in the API.
   - In every level, `submit_application` refuses:
     - a host on the blocklist (LinkedIn, Indeed and any site whose terms
       forbid automation);
     - a host that is not the offer's application host;
     - an application already sent;
     - a form with a required field still empty.
7. **Proof of every submission**: the confirmation page URL, a screenshot of
   it (`chrome.tabs.captureVisibleTab`), the documents and the answers sent,
   and the time. Everything is stored with the application and shown in its
   timeline. A submission with no confirmation page detected is recorded as
   "to check", never as sent.
8. **Model** (amended 2026-11-26, US-202): by default **JobSpark's model,
   paid in credits** — most candidates will never create an API key.
   - The in-page agent's calls go to `POST /agent/llm/chat/completions`
     (OpenAI-compatible), admitted like `/mcp` (agent token, allowed origin,
     rate limit) inside a **fill session** opened by the MCP tool
     `start_form_fill`: **2 credits**, 15 minutes, 60 calls at most.
   - The server picks the model (`form_fill` in `/admin/ai-models`, default
     `openai/gpt-4.1-mini`) and calls OpenRouter with its own key, no prompt
     logging, ZDR providers when enabled; each call is filed in the AI cost
     cockpit. Claude Sonnet/Opus 5.x get reasoning on and a free tool choice
     (they refuse otherwise).
   - Measured on real Lever and Ashby forms: gpt-4.1-mini 1.5–3.2 US cents a
     fill (10–16 calls), claude-sonnet-5.5 18–26 cents, claude-haiku-5.5
     looped. A credit is worth 3.4 to 6.6 euro cents: 2 credits cover
     gpt-4.1-mini even at the cheapest pack. Choosing Sonnet would need about
     7 credits.
   - **The candidate's own OpenAI-compatible key stays an advanced option**:
     with it, a fill costs no credit and calls go straight to their provider.

9. **Prompt injection**: recruiter pages are untrusted.
   - Page text reaches the model wrapped like `<untrusted_offer_content>`.
   - The agent cannot leave the application host while filling.
   - The token has no `profile:write`, and the credit cap per connection
     still applies.
10. **Compatibility**: older extension versions stay installed for a while.
    MCP tools are only added to, or given optional parameters; a tool is
    never renamed or removed without a transition period.

## Consequences

- One more app to build, test, publish (Chrome Web Store, from CI) and support.
- New API surface:
  - `record_submission`, proof storage in the object store, saved answers to
    screening questions;
  - later, the mandate and the autonomy level.
- The MCP server instructions ("N'envoie jamais de candidature sans que
  l'utilisateur l'ait validée") stay true at level 1. They must be reworded
  when levels 2 and 3 exist.
- The privacy policy must cover the extension: what it reads on recruiter
  pages, the screenshots kept as proof, and the candidate's model key stored
  locally.
- The repository has no `LICENSE` file: decide before redistributing
  MIT/Apache code (keep their notices in any case).
- Risk: page-agent has one maintainer and an experimental `customTools`. The
  wrapper (decision 2) and the prototype (US-194) limit it.

## Alternatives considered

- **Claude in Chrome from claude.ai**: no file download or upload, the gap
  observed on 2026-11-26. We do not control it.
- **Claude Code + Claude in Chrome**: works for attaching from disk, but it is
  a developer tool. It stays the owner's own path (ADR-032).
- **Making the signed links CORS-readable** and letting a generic agent inject
  the file with page JavaScript: fragile on each site, and it puts a download
  link in third-party pages. Rejected.
- **Applying through the ATS APIs** (SmartRecruiters, Greenhouse, Lever…): the
  most reliable submit, but each needs a partner agreement. Kept for later;
  the extension covers every site today.
- **Fork Nanobrowser**: a whole extension to keep in sync with upstream.
  Rejected; reference only.
- **Assisted mode forever** (the 2026-11-25 decision): it leaves the candidate
  doing the last step on every application, which defeats the owner's goal.
  Replaced by the autonomy levels.
- **Applying by e-mail**: already covered by E29 (ADR-028) for offers with an
  address. It does not cover career-site forms.
