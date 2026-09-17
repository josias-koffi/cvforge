import { resolve } from "node:path";
import type { InterviewConfig } from "./interview.types";

const DEFAULT_STATE_FILE = resolve(
  process.cwd(),
  ".data",
  "interviews-state.json",
);

export function resolveInterviewConfig(
  env: NodeJS.ProcessEnv,
): InterviewConfig {
  return {
    stateFilePath: env.INTERVIEW_STATE_FILE?.trim() || DEFAULT_STATE_FILE,
  };
}
