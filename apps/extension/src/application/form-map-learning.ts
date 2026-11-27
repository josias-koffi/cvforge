import type { PrefillData } from "../domain/field-match";
import { learnFromForm, type FormMapRule } from "../domain/form-map";
import { siteOf } from "../domain/submission";
import type { FillTab } from "./filling";
import type { JobSparkTools } from "./session";

/**
 * The learned map of application forms (US-205): read before the script
 * pass, taught after the fill. Never blocks a fill: the map is a bonus.
 */
export class FormMapLearning {
  constructor(
    private readonly deps: {
      tools: JobSparkTools;
      tab: Pick<FillTab, "values">;
    },
  ) {}

  /** The rules two candidates at least confirmed for this site. */
  async rules(url: string): Promise<FormMapRule[]> {
    try {
      const answer = (await this.deps.tools.call("get_form_map", {
        site: siteOf(new URL(url).host),
      })) as { rules?: FormMapRule[] };
      return Array.isArray(answer?.rules) ? answer.rules : [];
    } catch {
      return [];
    }
  }

  /**
   * What this fill teaches: read the fields, keep the data names, send them.
   * The values stay in the browser.
   */
  async learn(request: {
    tabId: number;
    url: string;
    data: PrefillData;
    served: FormMapRule[];
    aiUsed: boolean;
  }): Promise<void> {
    try {
      const fields = await this.deps.tab.values(request.tabId);
      const { confirmed, missed } = learnFromForm(
        fields,
        request.data,
        request.served,
      );
      await this.deps.tools.call("report_form_map", {
        aiUsed: request.aiUsed,
        confirmed: confirmed.slice(0, 80),
        missed: missed.slice(0, 80),
        site: siteOf(new URL(request.url).host),
      });
    } catch {
      // The map is a bonus: a fill never fails for it.
    }
  }
}
