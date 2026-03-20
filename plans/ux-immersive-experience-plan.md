# UX Plan: Guided Weekly Planning Loop

## Summary
Reframe the app as a guided three-step flow: set weekly time, define interests, then inspect the allocation outcome. Keep the vanilla HTML/CSS/JS architecture and the existing bucket math, but improve onboarding, reduce interaction friction, and make the experience feel more intentional and immersive.

## Implementation Changes
- Add a compact first-run explainer and persistent status strip so the three panels read as an ordered sequence instead of equal blocks.
- Extend UI-only state for onboarding and focus handoff so the app can guide users after save, edit, delete, and reset without changing the planner data model.
- Update renderer copy and feedback behavior so incomplete totals, invalid input, empty states, and allocation changes feel guided rather than merely reactive.
- Keep planner state shape, local storage schema, and allocation math unchanged; only UI state and presentation logic expand.

## Test Plan
- Verify the empty app explains the workflow clearly instead of feeling unfinished.
- Verify a 100% bucket split unlocks allocation details and per-interest hours.
- Verify save, edit, delete, and reset return focus to the expected control and surface the right message state.
- Verify the mobile layout still reads cleanly and the table/card fallbacks remain usable.
- Verify `prefers-reduced-motion` disables new motion without breaking guidance or state transitions.

## Assumptions
- The app remains a single-page vanilla implementation.
- The immersive direction stays warm and editorial, not neon or game-like.
- No framework migration, dependency addition, or backend work.

## Conventional Commits
1. `refactor(ui): add guided-flow state and onboarding flags`
2. `feat(ui): rework page hierarchy into a three-step planning flow`
3. `feat(ux): add contextual guidance, empty states, and focus handoff`
4. `feat(style): deepen the immersive visual system and motion treatment`
5. `test(ui): cover guided flow, feedback states, and reduced motion`
