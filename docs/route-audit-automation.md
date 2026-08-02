# Visual route audit automation

This audit runs during production, never in the browser. It sends each generated scene to two independent Codex CLI vision passes in parallel, reconciles their route counts, compares the consensus with the registered click masks, and stores the evidence in `production/route-audits.json`. Multiple scenes use a bounded worker pool rather than launching the entire batch at once.

## What counts as a route

A route is any visually distinct passage-like click target suggested by the image. The audit is deliberately about interaction coverage rather than proving the hidden architectural topology. Auditors inspect both sides of every freestanding or staggered wall mass and include narrow, partially occluded, or geometrically ambiguous carpet channels. Visually separated channels are not merged merely because they might reconnect or form successive bends of one real corridor. A chain of `N` offset wall masses may therefore produce `N+1` visible targets when channels appear on the outer sides and between the masses. The near wall that continuously frames the camera and touches an image boundary is excluded from `N`; adjacent front and side faces of one wall thickness are also merged as one mass.

The auditors do not receive the existing masks, target route count, or regression answer. This prevents the expected result from being copied into the visual judgment. Two agreeing Terra scouts keep their count instead of letting a third pass degrade the result. When their counts disagree, or both report one route while at least one is ambiguous, a stronger Sol adjudicator re-inspects the image and unions distinct candidate routes from both reports. This catches the case where both scouts say “one route” but each found a different side of the same wall mass.

## Commands

Run the three human-confirmed regressions first:

```powershell
npm run audit:regressions
```

They must visually recover these counts:

- `L0-0002B`: 2 routes
- `L0-0003B`: 3 routes
- `L0-0004B`: 2 routes

Audit every scene in the current generation batch:

```powershell
npm run audit:batch
```

Audit selected scenes or override the default model:

```powershell
npm run audit:routes -- --scene L0-0005A --scene L0-0006B
npm run audit:routes -- --scene L0-0005A --model gpt-5.6-terra
npm run audit:routes -- --scene L0-0005A --adjudicator-model gpt-5.6-sol
npm run audit:batch -- --concurrency 2 --timeout-seconds 300
```

`--concurrency` controls how many scenes run together (default `2`, range `1..8`). Each scene still uses two parallel independent auditors, so the default produces at most four Codex processes. `--timeout-seconds` is a per-auditor hard limit (default five minutes). Prompts are supplied through stdin and explicitly closed; leaving stdin open causes Codex CLI to wait indefinitely at `Reading additional input from stdin...`.

Validate saved results:

```powershell
npm run validate:audit
npm run validate:release
```

The checked-in `@openai/codex` CLI must be signed in with ChatGPT. This makes audits consume the user's Codex plan allowance instead of separately billed API usage. `OPENAI_API_KEY` and `CODEX_API_KEY` are deliberately removed from each audit subprocess so an ambient API key cannot silently change the billing path.

```powershell
node node_modules/@openai/codex/bin/codex.js login status
npm run audit:regressions
```

The status command must print `Logged in using ChatGPT`. If dependency installation reports `UNABLE_TO_VERIFY_LEAF_SIGNATURE` on Windows, rerun `npm install` with `$env:NODE_USE_SYSTEM_CA = "1"`; runtime audit subprocesses already enable the Windows system certificate store.

## Automatic blocking rules

A scene is blocked when:

- the two auditors disagree;
- either auditor reports ambiguity or low confidence;
- the visual count differs from the registered click-mask count;
- the visual count differs from the generation target or a human-confirmed regression;
- the consensus contains four or more routes.

Four-plus scenes always require manual review, even when both auditors agree. This enforces the intended extreme rarity of those images. A human-confirmed regression may carry `rareRouteApproved: true`; this clears only the rarity-review reason and never clears a missing-mask, disagreement, ambiguity, confidence, or count mismatch. None of the current B-branch regression cases requires that exception.

An existing regression may carry `humanTopologyApproved: true` only after the user directly confirms its visible-route count. The override applies only while the registered mask count still equals that confirmed count; it can supersede model disagreement, ambiguity, low confidence, count misclassification, and a false AI four-plus classification when the human-confirmed count is below four. It does not apply to generated batch scenes, and a human-confirmed four-plus scene still requires the separate rarity approval.

Release validation requires complete audit coverage for both the current generation batch and every regression fixture. Running only one scene or only the new batch cannot accidentally satisfy the gate. Every audit also stores a deterministic fingerprint of path IDs, states, and desktop/mobile polygons, so moving a mask invalidates the old result even when the route count stays the same.

Each route also includes a normalized `0..1000` entry rectangle. It is supporting evidence for mask authoring, not an automatically published click mask. Human testing remains responsible for the exact polygon shape and for confirming that clicking every visible route progresses correctly.

## Reliability boundary

The automation is a fail-closed production screen, not a replacement for human route labels. The stdin fix reduced a single-scene run from an indefinite wait to roughly 20 seconds for two scouts, or about one minute when adjudication is required. `L0-0002B` was recovered as `2/2`, but repeated vision runs did not reliably recover the human-confirmed `L0-0003B = 3` and `L0-0004B = 2` counts. Those mismatches remain blocked in `production/route-audits.json` and must not create or approve masks automatically. Human-confirmed counts remain authoritative for mask authoring; the AI audit supplies candidate regions and catches easy mismatches before playtesting.
