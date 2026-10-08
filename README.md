# tanmaymba20272-ai.github.io

Portfolio site for Tanmay Mohanta, Applied AI & AI Platform PM. It is a static site with no build step.

## How it evolves

- **Live evidence:** the chart and figures read `results/public.json` from the [conductos](https://github.com/tanmaymba20272-ai/conductos) repo, which a weekly GitHub Action updates.
- **Changelog:** add an entry to `data/changelog.json` for each release.
- **Links:** set `notion_url` and `linkedin_url` in `data/site.json`.

To preview with a local results file, run `python -m http.server` and open `http://localhost:8000/?results=path/to/public.json`.
