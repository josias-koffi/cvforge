/**
 * The few rules of a robots.txt we have to honour, no more: the groups that
 * name us or `*`, and `Allow` / `Disallow` as path prefixes with `*` and `$`.
 * The most specific (longest) matching rule wins and `Allow` wins a tie, as in
 * RFC 9309. A path no rule matches is allowed.
 */
interface Rule {
  allow: boolean;
  pattern: string;
}

export function isPathAllowed(robotsTxt: string, agent: string, path: string): boolean {
  const rules = rulesFor(robotsTxt, agent.toLowerCase());
  let best: Rule | null = null;

  for (const rule of rules) {
    if (!matches(rule.pattern, path)) continue;
    if (
      !best ||
      rule.pattern.length > best.pattern.length ||
      (rule.pattern.length === best.pattern.length && rule.allow)
    ) {
      best = rule;
    }
  }

  return best ? best.allow : true;
}

/** The rules of the group naming `agent`, otherwise of the `*` group. */
function rulesFor(robotsTxt: string, agent: string): Rule[] {
  const groups: Array<{ agents: string[]; rules: Rule[] }> = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let collectingAgents = false;

  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;

    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (field === "user-agent") {
      if (!collectingAgents || !current) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      collectingAgents = true;
    } else if (field === "allow" || field === "disallow") {
      collectingAgents = false;
      // An empty Disallow means "allow everything": it adds no rule.
      if (current && value) current.rules.push({ allow: field === "allow", pattern: value });
    }
  }

  const named = groups.filter((group) =>
    group.agents.some((name) => name !== "*" && agent.includes(name)),
  );
  const chosen = named.length > 0 ? named : groups.filter((group) => group.agents.includes("*"));

  return chosen.flatMap((group) => group.rules);
}

function matches(pattern: string, path: string): boolean {
  const anchored = pattern.endsWith("$");
  const body = anchored ? pattern.slice(0, -1) : pattern;
  const expression = body
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");

  return new RegExp(`^${expression}${anchored ? "$" : ""}`).test(path);
}
