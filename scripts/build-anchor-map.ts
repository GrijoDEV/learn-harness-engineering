// Generates docs/.vitepress/anchor-map.json.
//
// Heading ids are auto-slugged from heading text, so every locale gets ids in
// its own language. The language switcher carries the URL hash across locales
// (vitepress/dist/client/theme-default/composables/langs.js appends hash.value
// unconditionally), so a shared link such as "#實際案例" dead-ends after
// switching to English.
//
// This script records the English ids as canonical so the VitePress config can
// apply them to every locale, matching how vitepress.dev itself behaves: ids are
// locale-invariant, heading text is translated.
//
// Run from the repo root: node --import tsx scripts/build-anchor-map.ts

import path from 'node:path'
import { promises as fs } from 'node:fs'
import { createMarkdownRenderer } from 'vitepress'
import { collectHeadingIds, localeStrippedPath } from './anchor-map-utils.ts'
import { docsRoot } from './export-site-utils.ts'

const anchorMapPath = path.resolve(docsRoot, '.vitepress/anchor-map.json')

export type AnchorMapEntry = {
  // Canonical ids in document order, covering heading levels 1..3.
  ids: string[]
  // Heading count per locale, so the validator can tell an intentionally
  // unanchored page (structure drift) from a regression.
  locales: Record<string, number>
}

export type AnchorMap = Record<string, AnchorMapEntry>

const SOURCE_LOCALE = 'en'

async function listLocales(): Promise<string[]> {
  const entries = await fs.readdir(docsRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory() && entry.name !== 'public' && entry.name !== '.vitepress')
    .map((entry) => entry.name)
    .sort()
}

async function walkMarkdown(targetDir: string): Promise<string[]> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = path.join(targetDir, entry.name)
      if (entry.isDirectory()) return walkMarkdown(full)
      return entry.isFile() && entry.name.endsWith('.md') ? [full] : []
    }),
  )
  return nested.flat()
}

async function main() {
  const md = await createMarkdownRenderer(docsRoot, {}, '/')
  const locales = await listLocales()

  if (!locales.includes(SOURCE_LOCALE)) {
    throw new Error(`Source locale "${SOURCE_LOCALE}" not found under ${docsRoot}`)
  }

  const anchorMap: AnchorMap = {}
  const sourceFiles = (await walkMarkdown(path.join(docsRoot, SOURCE_LOCALE))).sort()
  const sourceKeys = new Set<string>()

  for (const file of sourceFiles) {
    const relativePath = path.relative(docsRoot, file).split(path.sep).join('/')
    const key = localeStrippedPath(relativePath)
    const ids = collectHeadingIds(md, await fs.readFile(file, 'utf8'))

    if (ids.length === 0) continue
    sourceKeys.add(key)
    anchorMap[key] = { ids, locales: {} }
  }

  // Record how many headings each locale actually has, so the config applies the
  // canonical ids only where the structure lines up.
  for (const locale of locales) {
    const files = await walkMarkdown(path.join(docsRoot, locale))
    for (const file of files) {
      const key = localeStrippedPath(path.relative(docsRoot, file).split(path.sep).join('/'))
      if (!sourceKeys.has(key)) continue
      const ids = collectHeadingIds(md, await fs.readFile(file, 'utf8'))
      anchorMap[key].locales[locale] = ids.length
    }
  }

  await fs.writeFile(anchorMapPath, `${JSON.stringify(anchorMap, null, 2)}\n`, 'utf8')

  const pages = Object.keys(anchorMap).length
  const aligned = Object.values(anchorMap).filter((entry) =>
    Object.entries(entry.locales).every(([, count]) => count === entry.ids.length),
  ).length

  console.log(`Wrote ${path.relative(process.cwd(), anchorMapPath)}`)
  console.log(`  pages: ${pages}`)
  console.log(`  all-locales-aligned: ${aligned}`)
  console.log(`  with drift: ${pages - aligned}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
