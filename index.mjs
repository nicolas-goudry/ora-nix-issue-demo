import ora from 'ora'

const withFix = !!process.argv[2]

async function triggerError() {
  return new Promise((_, reject) => {
    setTimeout(() => reject("oh no"), 5000)
  })
}

const okMark = '\x1b[32m✓\x1b[0m'
const failMark = '\x1b[31m✗\x1b[0m'
const spinner = ora({ discardStdin: false, isEnabled: withFix ? !!process.stdin.isTTY : true })

// This will never render without 'withFix'
spinner.start("Processing...")

try {
  await triggerError()
} catch (e) {
  spinner.stopAndPersist({ symbol: failMark })
  throw e
}

spinner.stopAndPersist({ symbol: okMark })
