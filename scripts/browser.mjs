import { existsSync } from 'node:fs'
import { chromium } from 'playwright'

/*
 * This environment ships a preinstalled Chromium that may not match the
 * revision the pinned Playwright expects, so point at it explicitly rather
 * than downloading a second copy. Falls back to Playwright's own resolution
 * anywhere that path doesn't exist.
 */
const PREINSTALLED = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'

export function launch(options = {}) {
  const executablePath = existsSync(PREINSTALLED) ? PREINSTALLED : undefined
  return chromium.launch({ ...options, ...(executablePath ? { executablePath } : {}) })
}
