# Deployment Best Practices for Completed Systems (Grudge Studio)

## Rule
**Only completed, isolated, reviewed work ships.** Never mix WIP, client experiments, or unrelated refactors into a production deploy.

## Pattern used for gruda-ai-router

1. **Isolate the change**
   - Create a dedicated branch from the exact commit that finished the feature: `git checkout -b deploy/<slug> <sha>`
   - The branch must contain **only** the files that belong to the completed system.

2. **Name the branch clearly**
   - `deploy/<feature>` (e.g. `deploy/ai-router`)
   - Never reuse long-lived feature branches that have accumulated other work.

3. **Document the deploy surface**
   - `DEPLOY.md` inside the skill/package with:
     - One-time token / secret steps
     - Mount point in the host Express/Fastify app
     - Verification curl or health check
     - Rollback note

4. **Push the clean branch**
   - `git push -u origin deploy/<slug>`
   - Open PR titled exactly what the change does (no “WIP”, no client noise).

5. **Deploy order (fail-closed)**
   a. Merge or fast-forward the deploy branch into the Railway target.
   b. Set any required env vars on Railway **before** the deploy.
   c. `railway up --service <name>`
   d. Immediate smoke: the health or models endpoint must return the expected shape.

6. **Verification gate**
   - The live URL (api.grudge-studio.com, etc.) must answer the verification command listed in DEPLOY.md.
   - If the gate fails, do not proceed to client migration or production traffic.

7. **Client migration (after gate)**
   - Only pages listed in the skill (warlords_craft, ai_root, …) are updated to call the new endpoint.
   - Direct `puter.ai.chat` calls are removed in a follow-up PR.

## Anti-patterns
- Mixing the completed system with 40+ client files that are still in flight.
- Deploying from a dirty working tree.
- Setting secrets after the deploy has already run.
- Skipping the verification curl because “it looked fine locally”.

Follow this pattern for every future completed system (combat runtime, character handoff, VFX catalog, etc.).
