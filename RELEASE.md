# Safe HTML Reader v1.0.6

Compatibility release that bypasses EdgeEver v1.51.1's non-mounting host panel dialog.

## Highlights

- Uses `getSelection()` only to identify the active note on EdgeEver v1.51.1, then reads its complete saved Markdown through `notes.get()`.
- Uses `getDocument()` on newer builds to include unsaved editor changes.
- Removes only the panel instance's own DOM root during cleanup, so a delayed Strict Mode disposer cannot erase a replacement mount.
- Provides an immutable v1.0.6 manifest URL so the manifest, JavaScript, and stylesheet always come from the same release tag.
- Opens a plugin-owned accessible reading dialog through the command menu on EdgeEver v1.51.1, while newer builds continue to use the official host panel.
- Restores only allowlisted portable HTML that EdgeEver's legacy rich editor escapes, while all restored output still passes through the existing sanitizer.
- Uses the panel menu directly on v1.51.1 and keeps the **Open Safe HTML Reading View** command where programmatic panel opening is supported.
- Renders standard Markdown plus a strict allowlist of portable HTML.
- Provides accessible hover, keyboard-focus, and tap tooltips for `<abbr title="…">` vocabulary.
- Displays `<sup>[n]</sup>` as academic-style references with preview and jump-to-note behavior.
- Supports `<mark>`, `<sub>`, `<sup>`, `<u>`, `<details>`, `<summary>`, `<del>`, and `<kbd>`.
- Includes responsive light/dark styling and handles long bilingual articles with delegated events.
- Uses a DOMPurify allowlist, per-tag attribute checks, and URL validation.
- Requests read-only note/editor access and UI permissions; it has no write, delete, network, storage, or secret permission.

## Required release assets

Upload the following files from `dist/` as separate GitHub Release assets:

- `manifest.json`
- `main.js`
- `styles.css`

The release tag must be `1.0.6` or `v1.0.6`. The release manifest must exactly match the `manifest.json` on the repository default branch.

## Validation

Before publishing, run:

```sh
npm ci
npm run check
```
