// Checks that docs/.vitepress/anchor-map.json is in sync with the English source.
//
// Heading ids are canonical English slugs applied to every locale, so the map
// must be regenerated whenever English headings change:
//
//   npm run anchors:build    # after editing any English heading
//   npm run anchors:check    # fails if the map is stale; runs in CI
//
// Editing rules that keep cross-language anchor links working:
//
// - Ids are matched by position, not by heading text. Translated titles are
//   free; what must line up with English is the number and order of headings.
// - Reordering sections without changing the count is not detected here. It
//   would silently mis-map ids, so reorder English and the locale together.
//
// 15 pages have known structure drift and intentionally keep localized ids:
// lecture-11 and lecture-12 in 9 locales each (ar, de, es, fr, ja, ko, ru, tr,
// uz), project-01 in 13, projects 02-06 in zh/zh-TW, six resources pages
// (openai-advanced, reference, templates, plus two repo-template files), and
// harness-designs/codex in zh. Cross-language anchor links do not resolve on
// those pages. This is not a bug to fix: the translations are structurally
// different documents, and for the project pages the Chinese is more complete
// than the English stub. They are reported below as a note and do not fail.
//
// Run from the repo root: node --import tsx scripts/validate-anchors.ts

import { promises as fs } from 'node:fs'
import { readFileSync } from 'node:fs'
import { createMarkdownRenderer } from 'vitepress'
import { collectHeadingIds, localeStrippedPath } from './anchor-map-utils.ts'
import { docsRoot } from './export-site-utils.ts'

const anchorMapPath = `${docsRoot}/.vitepress/anchor-map.json`
const SOURCE_LOCALE = 'en'

type Finding = {
  docPath: string
  message: string
}

async function walkMarkdown(targetDir: string): Promise<string[]> {
  const entries = await fs.readdir(targetDir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const full = `${targetDir}/${entry.name}`
      if (entry.isDirectory()) return walkMarkdown(full)
      return entry.isFile() && entry.name.endsWith('.md') ? [full] : []
    }),
  )
  return nested.flat()
}

async function main() {
  const md = await createMarkdownRenderer(docsRoot, {}, '/')
  const anchorMap = JSON.parse(readFileSync(anchorMapPath, 'utf8')) as Record<
    string,
    { ids: string[]; locales: Record<string, number> }
  >

  const findings: Finding[] = []
  const drifted: Finding[] = []

  const sourceFiles = (await walkMarkdown(`${docsRoot}/${SOURCE_LOCALE}`)).sort()

  for (const file of sourceFiles) {
    const key = localeStrippedPath(file.slice(docsRoot.length + 1).split('\\').join('/'))
    const ids = collectHeadingIds(md, await fs.readFile(file, 'utf8'))
    if (ids.length === 0) continue

    const entry = anchorMap[key]
    if (!entry) {
      findings.push({ docPath: key, message: `missing from anchor-map.json (${ids.length} headings)` })
      continue
    }

    if (JSON.stringify(entry.ids) !== JSON.stringify(ids)) {
      findings.push({ docPath: key, message: 'canonical ids are stale; run scripts/build-anchor-map.ts' })
    }
  }

  for (const [key, entry] of Object.entries(anchorMap)) {
    for (const [locale, count] of Object.entries(entry.locales)) {
      try {
        const source = await fs.readFile(`${docsRoot}/${locale}/${key}`, 'utf8')
        const actualCount = collectHeadingIds(md, source).length
        if (actualCount !== count) {
          findings.push({
            docPath: `${locale}/${key}`,
            message: `heading count is stale (${count} recorded, ${actualCount} actual); run scripts/build-anchor-map.ts`,
          })
        }
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        findings.push({ docPath: `${locale}/${key}`, message: 'mapped source file is missing' })
      }
      if (count !== entry.ids.length) {
        drifted.push({
          docPath: key,
          message: `${locale} has ${count} headings, English has ${entry.ids.length}; keeps localized ids`,
        })
      }
    }
  }

  if (findings.length > 0) {
    console.error(`Anchor map is out of date (${findings.length}):`)
    for (const finding of findings) console.error(`- ${finding.docPath}: ${finding.message}`)
    process.exitCode = 1
    return
  }

  console.log(`OK: anchor map matches the English source (${Object.keys(anchorMap).length} pages).`)
  if (drifted.length > 0) {
    const pages = new Set(drifted.map((d) => d.docPath)).size
    console.log(`Note: ${pages} page(s) have locale structure drift; those locales keep localized ids.`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
