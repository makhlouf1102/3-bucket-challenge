# UI Immersion Plan

## Summary
Refresh the current vanilla HTML/CSS/JS frontend into a more intentional, immersive presentation layer without changing the planner model or workflow. The work stays focused on visuals, hierarchy, and motion.

## Implementation Changes
- Rework the page shell into a stronger editorial layout with a richer hero, clearer section hierarchy, and better spacing between setup, interests, and results.
- Redesign the CSS around a more deliberate immersive visual system: stronger type scale, tighter spacing rules, more distinctive bucket theming, refined controls, improved card/table hierarchy, and restrained motion.
- Keep the existing state flow and rendering model, adding only minimal class or markup hooks needed for styling and animation.
- Preserve the current form IDs, table structure, and action wiring so bindings and planner logic continue to work unchanged.

## Test Plan
- Verify desktop and mobile readability.
- Verify focus states, reduced-motion behavior, empty states, and populated states.
- Verify percentage validation, preview messaging, row actions, and bucket expansion still behave correctly.

## Assumptions
- No framework migration, dependency addition, or backend work.
- Planner calculations and persistence remain unchanged.
- The visual direction stays warm and editorial rather than neon or game-like.

## Conventional Commits
1. `feat(style): establish immersive visual system and type scale`
2. `feat(ui): add layout hooks and section polish for hero, setup, and results`
3. `feat(ui): refine motion and state transitions across forms, cards, and tables`
4. `refactor(ui): simplify renderer markup to support new presentation hooks`
5. `test(ui): verify responsive states and reduced-motion behavior`
