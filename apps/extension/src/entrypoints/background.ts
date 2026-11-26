import { Session } from "../application/session";
import { localAiKeyStore } from "../infrastructure/ai-key-store";
import { ChromeAuthorizer } from "../infrastructure/chrome-authorizer";
import { apiEndpoints } from "../infrastructure/config";
import { JobSparkMcp } from "../infrastructure/jobspark-mcp";
import { chromeLocalStore } from "../infrastructure/local-store";
import { ExtensionOAuthProvider } from "../infrastructure/oauth-provider";
import type { PanelRequest, PanelResponse } from "../messages";

export default defineBackground(() => {
  const api = apiEndpoints();
  const store = chromeLocalStore();
  const provider = new ExtensionOAuthProvider(
    store,
    browser.identity.getRedirectURL(),
  );
  const session = new Session({
    aiKeys: localAiKeyStore(store),
    apiHost: api.host,
    authorizer: new ChromeAuthorizer(provider, api, (url) =>
      browser.identity.launchWebAuthFlow({ interactive: true, url }),
    ),
    tools: new JobSparkMcp(
      api.mcpUrl,
      provider,
      browser.runtime.getManifest().version,
    ),
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
    }
  };

  browser.runtime.onMessage.addListener((request, sender, reply) => {
    // Only the extension's own pages (side panel) talk to the service worker,
    // never a script running inside a recruiter's page.
    const ownPage = sender.url?.startsWith(browser.runtime.getURL("/"));
    if (sender.id !== browser.runtime.id || !ownPage) return;
    handle(request as PanelRequest).then(
      (state): void => reply({ ok: true, state } satisfies PanelResponse),
      (error: unknown): void =>
        reply({
          error: error instanceof Error ? error.message : String(error),
          ok: false,
        } satisfies PanelResponse),
    );
    return true;
  });
});
