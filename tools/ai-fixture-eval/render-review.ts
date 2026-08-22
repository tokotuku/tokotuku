#!/usr/bin/env bun
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

interface Review {
  score: number;
  verdict: "pass" | "needs_revision" | "blocked";
  rubric: {
    checks_routes: number;
    architecture: number;
    tier_fit: number;
    content_ux_assets: number;
    maintainability: number;
  };
  strengths: string[];
  gaps: Issue[];
  recommendations: Recommendation[];
  production_gaps: Issue[];
  over_engineered: Issue[];
  under_engineered: Issue[];
  evidence: string[];
}
interface Issue {
  summary: string;
  severity: "blocker" | "high" | "medium" | "low" | "info";
  location: string;
}
interface Recommendation {
  priority: "P0" | "P1" | "P2" | "P3";
  action: string;
  location: string;
}

const fixtureRoot = path.resolve(process.argv[2] ?? "");
if (!fixtureRoot)
  throw new Error("Usage: bun tools/ai-fixture-eval/render-review.ts <fixture-path>");
const review = JSON.parse(readFileSync(path.join(fixtureRoot, "review.json"), "utf8")) as Review;
const facts = JSON.parse(readFileSync(path.join(fixtureRoot, "FACTS.json"), "utf8")) as {
  findings: { severity: string; code: string; message: string }[];
};
const blockingFacts = facts.findings.filter((finding) => finding.severity === "error");
const verdict = blockingFacts.length > 0 ? "blocked" : review.verdict;
const list = (items: string[]) =>
  items.length ? items.map((item) => `- ${item}`).join("\n") : "- None reported";
const issues = (items: Issue[]) =>
  items.length
    ? items
        .map((item) => `- **${item.severity.toUpperCase()}** ${item.summary} — ${item.location}`)
        .join("\n")
    : "- None reported";
const recommendations = (items: Recommendation[]) =>
  items.length
    ? items.map((item) => `- **${item.priority}** ${item.action} — ${item.location}`).join("\n")
    : "- None reported";
const rubricTotal = Object.values(review.rubric).reduce((sum, value) => sum + value, 0);
const markdown = `# Terra Review: ${path.basename(fixtureRoot)}

## Verdict

**${verdict.toUpperCase()} — ${review.score}/100**

${blockingFacts.length ? `Deterministic checker blockers: ${blockingFacts.map((finding) => finding.message).join("; ")}` : "All deterministic invariants passed."}

## Rubric (100 points)

| Area | Score | Max |
| --- | ---: | ---: |
| Checks, migration, seed, route | ${review.rubric.checks_routes} | 30 |
| Takontuku module/data architecture | ${review.rubric.architecture} | 25 |
| Category and tier fit | ${review.rubric.tier_fit} | 20 |
| Content, UX, responsive design, assets | ${review.rubric.content_ux_assets} | 15 |
| Maintainability and proportionality | ${review.rubric.maintainability} | 10 |
| **Total reported by rubric** | **${rubricTotal}** | **100** |

## Evidence

${list(review.evidence)}

## Strengths

${list(review.strengths)}

## Gaps

${issues(review.gaps)}

## Recommendations

${recommendations(review.recommendations)}

## Production gaps

${issues(review.production_gaps)}

## Over-engineered

${issues(review.over_engineered)}

## Under-engineered

${issues(review.under_engineered)}
`;
writeFileSync(path.join(fixtureRoot, "EVALUATION.md"), markdown);
