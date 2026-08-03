/*
 * Renders the source SVG to the PNGs iOS and the manifest need.
 *
 * Uses the Chromium already present in this environment rather than adding an
 * image-processing dependency for what is a handful of one-off rasterisations.
 * Run with `npm run icons` after editing public/icons/icon.svg.
 */

import { launch } from './browser.mjs'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const source = readFileSync(resolve(root, 'public/icons/icon.svg'), 'utf8')

/*
 * Maskable icons get cropped to whatever shape the platform prefers, so the
 * mark is scaled to 62% and centred to stay inside the safe zone. The apple
 * touch icon is the opposite case: iOS applies its own squircle mask, so the
 * artwork must be full-bleed square with no rounding of our own.
 */
const targets = [
  { file: 'icon-192.png', size: 192, mode: 'rounded' },
  { file: 'icon-512.png', size: 512, mode: 'rounded' },
  { file: 'icon-maskable-512.png', size: 512, mode: 'maskable' },
  { file: 'apple-touch-icon.png', size: 180, mode: 'square' },
]

function page(size, mode) {
  const inner = mode === 'maskable' ? size * 0.62 : size
  const offset = (size - inner) / 2
  const radius = mode === 'square' ? 0 : mode === 'maskable' ? 0 : size * 0.223

  // Maskable and square variants paint the gradient edge-to-edge underneath,
  // so a platform crop can never expose a transparent corner.
  const backdrop =
    mode === 'rounded'
      ? ''
      : `<rect width="${size}" height="${size}" fill="url(#bg)" />`

  const svg = source
    .replace(/width="512" height="512"/, `width="${size}" height="${size}"`)
    .replace(/<rect width="512" height="512" rx="114"/, `<rect width="512" height="512" rx="${mode === 'rounded' ? 114 : 0}"`)

  return `<!doctype html><html><body style="margin:0;background:transparent">
    <div style="width:${size}px;height:${size}px;position:relative;overflow:hidden;border-radius:${radius}px">
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" style="position:absolute;inset:0">
        <defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#5E5CE6"/><stop offset="1" stop-color="#0A84FF"/>
        </linearGradient></defs>
        ${backdrop}
      </svg>
      <div style="position:absolute;left:${offset}px;top:${offset}px;width:${inner}px;height:${inner}px">
        ${svg.replace(/width="\d+" height="\d+"/, `width="${inner}" height="${inner}"`)}
      </div>
    </div>
  </body></html>`
}

const browser = await launch()

for (const target of targets) {
  const tab = await browser.newPage({
    viewport: { width: target.size, height: target.size },
    deviceScaleFactor: 1,
  })
  await tab.setContent(page(target.size, target.mode))
  const buffer = await tab.screenshot({ omitBackground: true })
  writeFileSync(resolve(root, 'public/icons', target.file), buffer)
  console.log(`wrote ${target.file} (${target.size}px)`)
  await tab.close()
}

await browser.close()
