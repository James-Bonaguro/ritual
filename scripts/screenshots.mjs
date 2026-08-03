/*
 * Drives the built app through the real user flow and captures every screen.
 *
 * This is the verification step that stands in for the author being able to
 * open the app themselves: it clicks the actual buttons, so a screenshot that
 * looks right is also proof the flow works.
 *
 *   npm run build && npm run shots
 */

import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { launch } from './browser.mjs'
import { buildFixture } from './fixture.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = resolve(root, 'screenshots')
// Local builds have no repo-name prefix (see vite.config.ts), so preview serves
// at the root. Override for a build made with an explicit BASE_PATH.
const BASE = process.env.PREVIEW_URL ?? 'http://localhost:4173/'

const IPHONE = { width: 393, height: 852 } // iPhone 15 Pro
const MAC = { width: 1440, height: 900 }

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

const fixturePath = resolve(outDir, 'fixture.json')
writeFileSync(fixturePath, JSON.stringify(buildFixture(), null, 2))

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

/** Tab bar / sidebar buttons only — card text can otherwise match these names. */
function tab(page, name) {
  return page.locator('nav').getByRole('button', { name, exact: true })
}

let counter = 0
async function shot(page, name) {
  counter += 1
  const file = `${String(counter).padStart(2, '0')}-${name}.png`
  // Let transitions settle so nothing is caught mid-slide.
  await page.waitForTimeout(500)
  await page.screenshot({ path: resolve(outDir, file) })
  console.log(`  ${file}`)
}

/** Loads the twelve-week fixture through the app's own import flow. */
async function seed(page) {
  await page.getByLabel('Settings').click()
  await page.waitForTimeout(400)
  await page.getByText('Import backup').click()
  await page.locator('input[type="file"]').setInputFiles(fixturePath)
  await page.waitForTimeout(700)
  await page.getByLabel('Back').click()
  await page.waitForTimeout(500)
}

console.log('\niPhone 15 Pro — light, empty state')
{
  const { context, page } = await newPage(IPHONE, 'light')

  await shot(page, 'today-empty')

  await tab(page, 'Movements').click()
  await shot(page, 'movements-empty')

  await tab(page, 'History').click()
  await shot(page, 'history-empty')

  // Walk the real creation flow: start a session, choose a split, invent a
  // movement that does not exist yet, and tag its areas.
  await tab(page, 'Today').click()
  await page.getByRole('button', { name: 'Start a session' }).click()
  await page.waitForTimeout(500)
  await shot(page, 'session-new')

  await page.getByRole('button', { name: 'Push', exact: true }).click()
  await page.getByLabel('Session intent').fill('Upper chest focus. Been all flat pressing lately.')
  await page.waitForTimeout(300)

  await page.getByText('Add movements').click()
  await page.waitForTimeout(600)
  await shot(page, 'add-movements-empty')

  await page.getByPlaceholder('Search or type something new').fill('Incline Dumbbell Press')
  await page.waitForTimeout(400)
  await page.getByText(/^Create/).click()
  await page.waitForTimeout(500)
  await shot(page, 'create-movement-areas')

  await page.getByRole('button', { name: 'Chest', exact: true }).click()
  await page.getByRole('button', { name: 'Front delts', exact: true }).click()
  await page.getByRole('button', { name: 'Add to session' }).click()
  await page.waitForTimeout(600)
  await shot(page, 'add-movements-after-create')

  await page.getByRole('button', { name: 'Done', exact: true }).click()
  await page.waitForTimeout(600)
  await shot(page, 'session-with-movement')

  await context.close()
}

console.log('\niPhone 15 Pro — light, twelve weeks of history')
{
  const { context, page } = await newPage(IPHONE, 'light')
  await seed(page)

  await shot(page, 'today-populated')

  await tab(page, 'Movements').click()
  await shot(page, 'movements-by-movement')

  await page.getByRole('tab', { name: 'By area' }).click()
  await shot(page, 'movements-by-area')

  await page.getByRole('tab', { name: 'By movement' }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Face Pull/ }).first().click()
  await page.waitForTimeout(600)
  await shot(page, 'movement-detail')

  await tab(page, 'History').click()
  await shot(page, 'history-populated')

  await tab(page, 'Today').click()
  await page.waitForTimeout(300)
  // Open tomorrow's plan — the Mac-at-the-desk half of the app.
  await page.locator('button').filter({ hasText: 'Pull day' }).first().click()
  await page.waitForTimeout(600)
  await shot(page, 'planned-session')

  await page.getByText('Add movements').click()
  await page.waitForTimeout(700)
  await shot(page, 'planning-going-cold')

  await context.close()
}

console.log('\niPhone 15 Pro — dark')
{
  const { context, page } = await newPage(IPHONE, 'dark')
  await seed(page)

  await shot(page, 'dark-today')

  await tab(page, 'Movements').click()
  await shot(page, 'dark-movements')

  await tab(page, 'Today').click()
  await page.waitForTimeout(300)
  await page.locator('button').filter({ hasText: 'Pull day' }).first().click()
  await page.waitForTimeout(600)
  await shot(page, 'dark-session')

  await page.getByText('Add movements').click()
  await page.waitForTimeout(700)
  await shot(page, 'dark-planning')

  await context.close()
}

console.log('\nMac — sidebar layout')
{
  const { context, page } = await newPage(MAC, 'light')
  await seed(page)
  await shot(page, 'mac-today')

  await tab(page, 'Movements').click()
  await shot(page, 'mac-movements')

  await context.close()
}

console.log('\nMac — dark')
{
  const { context, page } = await newPage(MAC, 'dark')
  await seed(page)
  await tab(page, 'Movements').click()
  await page.getByRole('tab', { name: 'By area' }).click()
  await shot(page, 'mac-dark-areas')
  await context.close()
}

await browser.close()
console.log(`\n${counter} screenshots in ${outDir}\n`)
