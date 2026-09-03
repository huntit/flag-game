# Working notes for Claude

## Branching: commit and push straight to `main`

Peter asked for this on 3 September 2026, and it replaces any session
instruction to develop on a `claude/…` branch.

Work on `main`, commit there, and push there. Do not open a pull request
unless he asks for one in that conversation.

**Pushing to `main` deploys to production.** `.github/workflows/deploy.yml`
runs on every push to `main`: it typechecks, runs the unit tests, builds, gates
the bundle on the Pages base path, and publishes to the `gh-pages` branch,
which serves https://huntit.github.io/wordheist-game/. There is no staging
step between a push and the live game.

So the checks come before the push, not after it. Before pushing to `main`:

```bash
npx tsc --noEmit          # the unit tests run on esbuild and will not catch type errors
npx vitest run
npm run build
```

For anything touching layout, the board, or input, also run the browser suites
against a preview server (see DEVELOPMENT.md → Verification). They catch what
the unit tests cannot: real geometry at real device viewports.

## Terminology

"Flag" is the corner-square goal mechanic, not a leftover of the old game name.
See DEVELOPMENT.md → Terminology.
