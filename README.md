# GitHub Wiki TOC Generator

An Obsidian community plugin that automatically generates a Table of Contents for GitHub wiki-style vaults. It writes a structured, wikilink-based TOC to one or more configurable target files (e.g. `_Sidebar.md`).

## Features

- Generates a TOC from the vault's file and folder structure
- **Folder notes** (files named exactly after their parent folder) are rendered as bold wikilinks
- Regular files are listed as bullet-point wikilinks
- Configurable heading depth — optionally include H1, H2, H3, … from each file
- Gitignore-style exclusion patterns (e.g. `/images`, `*.draft.md`, `private/`)
- Supports multiple TOC target files (e.g. separate sidebars for different sub-wikis)
- **GitHub Wiki URL injection** — automatically writes a `wiki_url` frontmatter property to every note so you can share the live GitHub Wiki link with colleagues
- URLs stay current: updated automatically whenever a file is renamed or created, and on every manual TOC run
- Trigger manually via the command palette or the ribbon icon

## Installation

### From Community Plugins (once published)

1. Open Obsidian → **Settings → Community plugins → Browse**
2. Search for **GitHub Wiki TOC Generator**
3. Click **Install**, then **Enable**

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/PittBie/github-toc/releases/latest)
2. Copy them into your vault at `.obsidian/plugins/github-wiki-toc/`
3. Reload Obsidian and enable the plugin under **Settings → Community plugins**

## Configuration

Open **Settings → GitHub Wiki TOC Generator**.

### TOC Target Files

Vault-relative paths to the files the TOC should be written into, one per line.

```
_Sidebar.md
docs/_Sidebar.md
```

If a target file is inside a subfolder (e.g. `docs/_Sidebar.md`), the TOC only covers that subfolder and its descendants downward.

### Heading Depth

Controls whether file headings are included in the TOC.

| Value | Effect |
|---|---|
| *(blank)* | No headings included |
| `#` | Include H1 headings only |
| `##` | Include H1 and H2 headings |
| `###` | Include H1, H2, and H3 headings |

### Ignore Folder Notes

When enabled, files whose name matches their parent folder (folder notes) are excluded from the TOC. The folder still appears as a plain bold entry without a wikilink.

### Ignore Patterns

Gitignore-style patterns for excluding files and folders. One pattern per line. Lines starting with `#` are comments.

| Pattern | Effect |
|---|---|
| `/images` | Exclude the top-level `images` folder only |
| `images/` | Exclude any folder named `images` at any depth |
| `*.draft.md` | Exclude all files matching this glob |
| `private/` | Exclude any folder named `private` |
| `!important.md` | Un-ignore a specific file (negation) |

### GitHub Wiki URLs

When enabled, the plugin writes a `wiki_url` property to the YAML frontmatter of every note (except TOC files and ignored files):

```yaml
---
wiki_url: https://github.com/owner/repo/wiki/My-Page-Name
---
```

The URL is derived from the **Wiki base URL** you set (e.g. `https://github.com/owner/repo/wiki`) plus the note's filename, with spaces replaced by hyphens — exactly how GitHub Wiki constructs its page URLs.

URLs are kept current automatically:
- **On rename or new file** — the affected note is updated immediately
- **On manual TOC run** — all notes are updated in bulk

## Usage

Once the plugin is enabled and configured:

1. Open the **command palette** (`Ctrl/Cmd + P`) and run **"Generate Table of Contents"**
2. Or click the **list icon** in the left ribbon

The configured target file(s) will be created or overwritten with the generated TOC.

## TOC Output Format

Given this vault structure:

```
_Sidebar.md          ← TOC target (always excluded from TOC)
Home.md
API.md               ← sibling folder note for API/
API/
  Authentication.md
  Endpoints.md
Setup/               ← no folder note exists
  Installation.md
  Configuration.md
images/              ← excluded via /images pattern
```

The generated `_Sidebar.md` (with heading depth `##`) looks like:

```markdown
- [[Home]]
**[[API]]**
  - [[Authentication]]
    - Overview
    - Token types
  - [[Endpoints]]
**Setup**
  - [[Installation]]
  - [[Configuration]]
```

**Folder note rules:**

1. If a `.md` file exists *at the same level* as a folder with the same basename (e.g. `API.md` next to `API/`), it becomes the folder's note — rendered as `**[[API]]**` and removed from the flat file list.
2. If no sibling note exists, the plugin checks *inside* the folder for a file with the same name (e.g. `API/API.md`).
3. If neither exists, the folder name is rendered as plain bold text with no link.

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm

### Setup

```bash
git clone https://github.com/PittBie/github-toc.git
cd github-toc
npm install
```

### Build

```bash
# Development — watch mode with inline sourcemaps
npm run dev

# Production — minified bundle
npm run build
```

Both commands produce `main.js` in the repository root.

## Testing the Plugin Locally

1. **Build the plugin:**
   ```bash
   npm run build
   ```

2. **Copy the plugin into your vault's plugin directory:**
   ```
   <your-vault>/.obsidian/plugins/github-wiki-toc/
   ├── main.js
   ├── manifest.json
   └── styles.css
   ```

   For a faster dev loop, symlink the repository folder instead of copying:
   ```bash
   # Windows (run as Administrator in cmd.exe)
   mklink /D "C:\path\to\vault\.obsidian\plugins\github-wiki-toc" "C:\path\to\github-toc"

   # macOS / Linux
   ln -s /path/to/github-toc /path/to/vault/.obsidian/plugins/github-wiki-toc
   ```

3. **Enable the plugin:** In Obsidian → Settings → Community plugins, toggle **GitHub Wiki TOC Generator** on (reload Obsidian first if the plugin doesn't appear).

4. **Configure:** Open the plugin settings (Settings → GitHub Wiki TOC Generator), set your target file paths, heading depth, and ignore patterns.

5. **Run:** Open the command palette (`Ctrl/Cmd + P`) and run **"Generate Table of Contents"**, or click the ribbon icon. Verify that `_Sidebar.md` is created/updated as expected.

> **Tip:** Use `npm run dev` while testing so that `main.js` is rebuilt automatically whenever you edit a source file. Then disable and re-enable the plugin in Obsidian (or use the [Hot Reload](https://github.com/pjeby/hot-reload) community plugin) to pick up changes without restarting Obsidian.

## Publishing to Obsidian Community Plugins

### Step 1 — Prepare a GitHub release

1. Ensure `manifest.json` and `versions.json` have matching, correct version numbers.
2. Run `npm run build` to produce the final `main.js`.
3. Create a GitHub Release:
   - The **tag must match the version in `manifest.json` exactly** — e.g. `0.1.0`, **no** `v` prefix.
   - Attach `main.js`, `manifest.json`, and `styles.css` as release assets.

### Step 2 — Submit to the community registry

1. Fork [obsidianmd/obsidian-releases](https://github.com/obsidianmd/obsidian-releases).
2. Add an entry to `community-plugins.json` — the four fields **must match `manifest.json` exactly**:
   ```json
   {
     "id": "github-wiki-toc",
     "name": "GitHub Wiki TOC Generator",
     "author": "Pitt Biebach",
     "description": "Generates a Table of Contents for GitHub wiki-style vaults and injects GitHub Wiki URLs into note frontmatter for easy sharing.",
     "repo": "PittBie/github-toc"
   }
   ```
3. Open a pull request against `obsidianmd/obsidian-releases`.
4. A bot validates the manifest fields automatically. The Obsidian team reviews for quality and security.
5. Once merged, the plugin appears in the community plugins search within a few hours.

> **Before submitting**, verify your plugin `id` is unique by searching [community-plugins.json](https://github.com/obsidianmd/obsidian-releases/blob/master/community-plugins.json).

## License

MIT © 2026 Pitt Biebach
