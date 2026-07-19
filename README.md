<p align="center">
  <img src="https://img.shields.io/badge/VS%20Code-1.85+-blue" alt="VS Code">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
</p>

# Pandoc Cite

Browse, insert, and preview Pandoc-style citations with a sidebar panel. Supports bib/json/yaml databases, citeproc rendering, and one-click DOCX export via Pandoc.

> [中文说明](README.zh-CN.md)

<p align="center">
  <img src="assets/screenshot.png" alt="Screenshot" width="700" />
</p>

## Features

- **Sidebar Citations** — Search and browse references in Library or Reference (cited in document) mode
- **Click to Insert** — Insert Pandoc markers (`[@citekey]`, `[@citekey, p. 42]`) at cursor
- **Live Preview** — `(Author, Year)` rendering in Markdown preview with colored styling
- **Editor Highlight** — Dashed underline for `[@key]` markers; hover for bibliography detail
- **Pandoc DOCX Export** — One-click export with `--citeproc`, `--bibliography`, `--csl`
- **Database Formats** — `.bib`, `.json`, `.yaml` / `.yml` (BibLaTeX + BibTeX)
- **Dependent CSL Styles** — Auto-fetches parent styles from GitHub

## Quick Start

1. Install the extension
2. Configure your bibliography in `settings.json`:

```jsonc
{
  "citation.bibliography": "path/to/refs.bib",
  "citation.cslPath": ""                  // empty = built-in Chicago author-date
}
```

3. Open a Markdown file — the 📖 **Citations** panel appears in the Activity Bar
4. Click an entry to insert `[@citekey]` at cursor
5. Press `Ctrl+Shift+V` to preview — citations render as `(Author, Year)`
6. Click **📦 Export DOCX** in the sidebar to export via Pandoc

## Settings

| Key | Default | Description |
|-----|---------|-------------|
| `citation.enabled` | `true` | Enable / disable the panel |
| `citation.bibliography` | `""` | Path to database file |
| `citation.cslPath` | `""` | CSL style path (built-in default: Chicago author-date) |
| `citation.pandocPath` | `""` | Pandoc executable (auto-detect from PATH) |
| `citation.referenceDocPath` | `""` | DOCX reference document |

## Commands

| Command | Description |
|---------|-------------|
| `Citation: Open Panel` | Open the citation sidebar |
| `Citation: Export DOCX` | Export current document via Pandoc |

## Requirements

- [Pandoc](https://pandoc.org/installing.html) (for DOCX export only — the sidebar and preview work without it)

## License

MIT
