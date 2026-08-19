# MultiTerm Astro

A quiet, text-first Astro blog based on MultiTerm.

## Content structure

- The homepage is a compact list of date, title, and one-sentence summary.
- Articles contain a title, publication date, body, and tags.
- The archive groups every article by year.
- Tag pages reuse the same compact article list.

## Writing features

- Markdown and MDX
- LaTeX math with KaTeX
- Mermaid diagrams
- Syntax-highlighted code blocks
- RSS, sitemap, SEO metadata, and social cards

The interface uses the Snazzy Light palette with a muted water-blue accent,
Source Serif 4 for reading, and JetBrains Mono for code.

## Development

```bash
npm install
npm run dev
```

Build the static site with:

```bash
npm run build
```

Site metadata, navigation, and the accent color live in
`src/site.config.ts`. Add articles under `src/content/posts`.

## License

[MIT](LICENSE.txt)
