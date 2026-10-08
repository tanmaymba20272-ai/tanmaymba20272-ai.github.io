# Working on the portfolio site

Follow the Karpathy guidelines for all code in this repo:

1. **Think before coding.** State assumptions. If a request has more than one reading, lay them out instead of picking silently. Ask when something is unclear.
2. **Simplicity first.** Write the minimum code that solves the request. No speculative features, abstractions or configurability.
3. **Surgical changes.** Every changed line should trace to the request. Match the existing style. Remove only what your own change made unused. Mention unrelated dead code instead of deleting it.
4. **Goal-driven execution.** Turn each task into a verifiable goal and check it before pushing. State a short plan with a check for each step.

Repo facts:
- Static site with no build step: `index.html`, `style.css`, `app.js` and `data/`. GitHub Pages serves `main`.
- Live numbers come from `results/public.json` in the conductos repo. Never hand-type evaluation numbers into the page.
- Add a `data/changelog.json` entry for each release. Links live in `data/site.json`.
- Keep the colour meanings: teal = act, amber = review, brick = abstain or quarantine. Chart series colours come from the validated dataviz palette.
