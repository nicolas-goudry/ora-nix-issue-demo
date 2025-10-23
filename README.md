[act]: https://github.com/nektos/act
[action-run]: https://github.com/nicolas-goudry/ora-nix-issue-demo/actions/runs/18747502517
[index]: ./index.mjs
[nix]: https://nixos.org
[ora]: https://github.com/sindresorhus/ora

# Ora spinner hangs in Nix builds - minimal repro

This repository demonstrates an issue where an animated spinner from the [`ora`][ora] library can cause a Node.js process to “hang” and hide errors when running in a non-TTY environment like [Nix][nix] builds.

The demo shows how gating `ora` by TTY presence fixes the problem.

**Key files:**

- `index.mjs` - minimal ora usage with/without the fix
- `default.nix` - Nix expression to reproduce in a non-TTY context
- `.github/workflows` - GitHub Actions workflow to reproduce in CI
- `package.json` - uses `ora@^9`

## The Issue

When `ora` renders an animated spinner in a non-interactive terminal, its control sequences and cursor handling can suppress or overwrite error output. This often looks like the build is “stuck,” while the real error never shows up.

### Reproducing

- the [`index.mjs` script][index] starts an `ora` spinner and then intentionally rejects a promise to simulate a build error
- without gating `ora` by TTY, the error gets hidden and the process appears to hang indefinitely
- with a TTY gate, the spinner is disabled in non-interactive environments and the error is visible

```js
import ora from 'ora'

const withFix = !!process.argv[2] // pass any arg to enable the fix

async function triggerError() {
  return new Promise((_, reject) => {
    setTimeout(() => reject('oh no'), 5000)
  })
}

const okMark = '\x1b[32m✓\x1b[0m'
const failMark = '\x1b[31m✗\x1b[0m'

// When withFix is false, we enable the spinner (which is the default behavior)
// When withFix is true, we gate the spinner by TTY (the fix)
const spinner = ora({
  discardStdin: false,
  isEnabled: withFix ? !!process.stdin.isTTY : true
})

// This will never render in non-TTY unless the fix is enabled
spinner.start('Processing...')

try {
  await triggerError()
} catch (e) {
  spinner.stopAndPersist({ symbol: failMark })
  throw e
}

spinner.stopAndPersist({ symbol: okMark })
```

### Reproducing locally

#### With Nix

The `default.nix` in this repo builds and executes the script in a non-interactive environment, reproducing the bug:

```sh
$ nix-build
```

It allows an optional argument `withFix` to enable the fix:

```sh
$ nix-build --arg withFix true
```

#### Reproducing in GitHub Actions

This repo includes a minimal workflow under `.github/workflows/` that runs two jobs:

- `without-fix`
- `with-fix`

Both jobs use the same setup, the only difference is that `with-fix` does enable the fix.

The jobs are expected to fail, but with different outcome:

- `without-fix` should timeout after 2 minutes (exit code 124)
- `with-fix` should fail with a build error (exit code 1)

Look at this [example run][action-run] for a comparison.

> [!NOTE]
>
> As an alternative, one could run the action jobs locally using [act][act].

## Root cause

Animated terminal UIs assume a TTY. In non-TTY contexts, `ora`'s updates and cursor control sequences can:

- Buffer or overwrite lines via carriage returns
- Fail to restore cursor visibility
- Make errors non-visible, giving the impression of a hang

The fix is to gate the spinner behind a TTY check, as demonstrated in this repository.
