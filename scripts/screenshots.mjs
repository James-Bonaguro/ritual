/*
 * Drives the built app through the real user flow and captures every screen.
 *
 * This stands in for the author being able to run it: it clicks the actual
 * buttons, so a screenshot that looks right is also proof the flow works.
 *
 * It also carries one hard assertion. The add-movement bug shipped because
 * this pass clicked row *labels* and never the checkmark itself — and tapping
 * the checkmark was the broken path. Every run now taps the checkmark
 * precisely and fails loudly if the selection doesn't stick.
 *
 *   npm run build && npm run preview   # in one shell
 *   npm run shots                      # in another
 */

import { mkdirSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './browser.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'screenshots')
const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173/'

// iPhone 14: 390x844 CSS px at 3x.
const IPHONE = { width: 390, height: 844 }
const MAC = { width: 1440, height: 900 }

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const browser = await launch()

async function newPage(viewport, colorScheme) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: viewport === IPHONE ? 3 : 2,
    colorScheme,
    isMobile: viewport === IPHONE,
    hasTouch: viewport === IPHONE,
    userAgent:
      viewport === IPHONE
        ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
        : undefined,
  })
  const page = await context.newPage()
  await page.goto(BASE, { waitUntil: 'networkidle' })
  return { context, page }
}

/** Tab bar / sidebar only — card text can otherwise match these names. */
function tab(page, name) {
  return page.locator('nav').getByRole('button', { name, exact: true })
}

let counter = 0
async function shot(page, name) {
  counter += 1
  const file = `${String(counter).padStart(2, '0')}-${name}.png`
  await page.waitForTimeout(450) // let transitions settle
  await page.screenshot({ path: resolve(outDir, file) })
  console.log(`  ${file}`)
}

const failures = []
function check(condition, message) {
  if (condition) return
  failures.push(message)
  console.error(`  ✗ ${message}`)
}

/** Opens a fresh session and selects a split, returning the page mid-flow. */
async function openSession(page, split = 'Push') {
  await page.getByRole('button', { name: 'Start a session' }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: split, exact: true }).click()
  await page.waitForTimeout(400)
}

console.log('\niPhone 14 — light')
{
  const { context, page } = await newPage(IPHONE, 'light')

  await shot(page, 'today')

  await tab(page, 'Movements').click()
  await shot(page, 'movements-library')

  await tab(page, 'Today').click()
  await page.waitForTimeout(250)
  await openSession(page)
  await shot(page, 'session-push-library')

  /* ---- Regression: tap the checkmark, not the label -------------------- */
  const firstRow = page.locator('button[aria-pressed]').filter({ hasText: /Last done|Never logged/ }).first()
  const movementName = (await firstRow.innerText()).split('\n')[0]

  // Click the checkmark's own bounding box. Under the old markup this was a
  // nested <button>, so the click fired the toggle twice and cancelled itself.
  const mark = firstRow.locator('span').first()
  await mark.click()
  await page.waitForTimeout(300)

  check(
    (await firstRow.getAttribute('aria-pressed')) === 'true',
    `tapping the checkmark did not select "${movementName}"`,
  )
  check(await page.getByText('1 picked').isVisible(), 'selection count did not reach "1 picked"')

  // And a second one via the label, to prove both paths agree.
  const secondRow = page.locator('button[aria-pressed]').filter({ hasText: /Last done|Never logged/ }).nth(1)
  await secondRow.click()
  await page.waitForTimeout(300)
  check(await page.getByText('2 picked').isVisible(), 'second selection did not stick')

  await shot(page, 'session-picked')

  // Tick a couple of visit steps.
  await page.getByRole('button', { name: /Massage bed/ }).click()
  await page.getByRole('button', { name: /Hot tub/ }).click()
  await page.waitForTimeout(300)
  await shot(page, 'session-visit')

  await page.getByLabel('Session notes').fill('Superset the last two. Left shoulder fine today.')
  await page.waitForTimeout(250)
  await shot(page, 'session-notes')

  await context.close()
}

console.log('\niPhone 14 — dark')
{
  const { context, page } = await newPage(IPHONE, 'dark')
  await shot(page, 'dark-today')

  await openSession(page, 'Pull')
  await shot(page, 'dark-session-library')

  await tab(page, 'Movements').click()
  await shot(page, 'dark-movements')

  await context.close()
}

console.log('\nMac')
{
  const { context, page } = await newPage(MAC, 'light')
  await shot(page, 'mac-today')
  await context.close()
}

await browser.close()

console.log(`\n${counter} screenshots in ${outDir}`)
if (failures.length > 0) {
  console.error(`\n${failures.length} CHECK(S) FAILED:`)
  for (const f of failures) console.error(`  - ${f}`)
  process.exit(1)
}
console.log('all checks passed\n')
