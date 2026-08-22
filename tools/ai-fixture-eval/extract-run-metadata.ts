#!/usr/bin/env bun
import { readFile, writeFile } from "node:fs/promises";

type Event = {
  type?: string;
  payload?: {
    model?: string;
    effort?: string;
    collaboration_mode?: { settings?: { model?: string; reasoning_effort?: string } };
    cwd?: string;
  };
};
const [logPath, outputPath, requestedModel, requestedEffort] = process.argv.slice(2);
if (!logPath || !outputPath || !requestedModel || !requestedEffort) {
  console.error(
    "usage: bun extract-run-metadata.ts <session.jsonl> <output.json> <model> <effort>",
  );
  process.exit(2);
}
const lines = (await readFile(logPath, "utf8")).split("\n").filter(Boolean);
const events = lines.map((line) => JSON.parse(line) as Event);
const context = events.find((event) => event.type === "turn_context")?.payload;
const effectiveModel = context?.model ?? context?.collaboration_mode?.settings?.model;
const effectiveReasoningEffort =
  context?.effort ?? context?.collaboration_mode?.settings?.reasoning_effort;
if (!effectiveModel || !effectiveReasoningEffort)
  throw new Error("session log has no authoritative turn_context pin");
const metadata = {
  sessionId: events.find((event) => event.type === "session_meta")?.payload,
  source: logPath,
  requestedModel,
  requestedReasoningEffort: requestedEffort,
  effectiveModel,
  effectiveReasoningEffort,
  cwd: context?.cwd,
};
await writeFile(outputPath, `${JSON.stringify(metadata, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(metadata)}\n`);
