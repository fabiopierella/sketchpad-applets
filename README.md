# Sketchpad applets

Interactive teaching pages. Each tool is a self-contained HTML file that runs in
any browser with no build step, no server and no dependencies.

## Two consumers, on purpose

**Students** get the published site:
<https://fabiopierella.github.io/sketchpad-applets/>. Hand them a link to a tool
and it opens.

**The sketchpad** gets a *copy*, not a link. It vendors the tools into its own
`public/applets/` at build time and commits them, so a lecture works with the
network unplugged. See `scripts/sync-applets.py` in the sketchpad repo. The
sketchpad never fetches from this site while presenting — that is the whole
point of copying.

So a change here reaches students as soon as Pages rebuilds, and reaches the
sketchpad when someone runs the sync and commits the result. Those are different
moments, deliberately: nothing you push here can alter a talk that is already
prepared.

## Adding a tool

```
tools/
  manifest.json          add the slug here
  <slug>/
    index.html           the tool itself, standalone
    tool.json            name, description, status, entry, tags
    verify.mjs           optional: checks the maths, run by `npm test`
```

Nothing else needs editing. `index.html` at the repo root builds its list from
`manifest.json` and each `tool.json`, because a static host cannot list a
directory.

## Constraints that matter

These follow from how the sketchpad embeds a tool — in an iframe with
`sandbox="allow-scripts"` and no `allow-same-origin`:

- **No storage.** `localStorage`, `sessionStorage` and cookies all throw or
  silently fail in an opaque origin. Keep state in memory.
- **No third-party requests.** No CDN scripts, no Google Fonts, no analytics. A
  tool must work offline, because a vendored copy has no network behind it. Use
  system font stacks.
- **No same-origin assumptions.** A tool cannot reach the page embedding it.
- **Resize gracefully.** A tool is placed as a rectangle on the board at
  arbitrary proportions, and at 100% zoom one world unit is one CSS pixel.

## Testing

```sh
npm test        # runs every tools/*/verify.mjs
```

A `verify.mjs` checks a tool's maths against something independent — closed-form
theory, a reference result — rather than re-implementing it. `modal-beam` pulls
the solver straight out of its own `index.html` so the test exercises the code
that actually ships.

## Licence

MIT, see [LICENSE](LICENSE).
