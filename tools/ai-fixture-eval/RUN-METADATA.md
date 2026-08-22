# Run metadata gate

Every generator or reviewer run must persist the CLI-requested and runtime-effective
model plus reasoning effort before mutation. Use the authoritative `turn_context` event
from the Codex session JSONL (not the model's prose claim) to create the record:

```sh
bun tools/ai-fixture-eval/extract-run-metadata.ts SESSION.jsonl RUN-METADATA.json gpt-5.6-luna medium
bun tools/ai-fixture-eval/run-metadata.ts RUN.json gpt-5.6-luna medium
```

Any mismatch is a hard stop. The same gate is used for Terra reviewers with
`gpt-5.6-terra high`; a generic prose response such as `GPT-5/default` is not used as
runtime evidence.
