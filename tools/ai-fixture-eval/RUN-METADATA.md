# Run metadata gate

Every generator and reviewer run persists the CLI-requested and runtime-effective model plus
reasoning effort before mutation. Use the authoritative `turn_context` event from the Codex
session JSONL (not a model prose claim) to create the record:

```sh
bun tools/ai-fixture-eval/extract-run-metadata.ts SESSION.jsonl RUN-METADATA.json gpt-5.6-luna max
bun tools/ai-fixture-eval/run-metadata.ts RUN-METADATA.json gpt-5.6-luna max
```

Any mismatch is a hard stop. The fixture matrix uses `gpt-5.6-luna` with `max` reasoning for
generation, bounded repair, and review. Legacy reviewer metadata is not accepted.
