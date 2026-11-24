# PC launcher: stale dependency repair

## Symptom and immediate recovery

After pulling an update, `start.bat` can fail with `ERR_MODULE_NOT_FOUND` for
`@noble/hashes` even though `node_modules` exists. This package is already pinned
in both package.json and package-lock.json; an old local installation can lack it.
Double-click `install.bat`, wait for `[OK] Installation complete`, then double-click
`start.bat`. No terminal command is required. You can also run these files from a terminal.

The installer requires Node.js 20 or newer with npm already installed; if missing,
it explains how to install Node.js LTS. It does not download or alter system runtimes
automatically. It runs `npm ci --include=dev` against the committed lockfile, so it
recreates node_modules (close any running server first) and includes tsx/Vite even
when NODE_ENV=production. It preserves existing `.env` and project data, creates
`.env` from the example only when absent, and verifies startup dependencies before
reporting success. Installation needs network access; ordinary launches with healthy
dependencies do not reinstall. Optional Python scientific engines and external API
credentials remain separate, opt-in setup—not requirements for launching the app.

No Python installation or scientific feature flag is needed to fix this Node error.
The Node DEP0190 warning is separate from the missing-package crash.

## Fix and acceptance

Both `start.bat` and the managed PC runner now invoke a plain-Node preflight,
`scripts/check-pc-dependencies.mjs`. It checks metadata for all direct runtime and
development dependencies, exact-version pins, and selected real startup entry
points including the hashes subpaths. Missing/stale dependencies trigger the
shared `install.bat --no-pause` step on Windows (lockfile-based npm ci on other platforms). A second check must pass before server launch;
installation/verification failure exits instead of starting a broken server.
This is a startup sanity check, not a full dependency-tree integrity audit or a
replacement for `npm ci` on a clean checkout.

The application server is launched as `node --import tsx server.ts` through
`process.execPath` with `shell: false`, not through a Windows `.cmd` shim or an
`npx` fallback. This avoids DEP0190's shell argument concatenation and preserves
spaced paths. The browser-opening behavior is unchanged.

## Regression checks

```sh
node scripts/test-pc-launcher.mjs
node scripts/check-pc-dependencies.mjs
npm run lint:types
```

The regression uses isolated temporary node_modules fixtures to cover a missing
new scoped dependency, broken exported files, an incorrect exact pinned version,
and a healthy installation. It exercises direct Node + real tsx with a spaced
TypeScript script path and a literal shell-metacharacter argument. It also checks
that the launcher delegates repair to the installer, pre/post-install checks are
present, failures return a nonzero code, `.env` is preserved, and automated calls
can suppress the installer pause. The batch checks are source-contract assertions,
not a native cmd.exe execution test.

A development server was started using the new direct-Node command and returned
HTTP 200 from `/api/health` in Linux. Native Windows `cmd.exe` / double-click
execution was not available in this environment and is not claimed as tested.

No numerical, energy-adoption, or finance behavior changes. No new dependency is
introduced. Rollback is limited to the preflight integration and server-spawn
change; removing it restores the previous launcher behavior (and its stale-install
failure risk).
