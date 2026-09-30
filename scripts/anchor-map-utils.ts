// Heading-id helpers shared by the anchor-map generator, the VitePress config,
// and the anchor validator.
//
// The slugifier below is a transcription of VitePress's default
// (node_modules/vitepress/dist/node/chunk-D3CUZ4fa.js). It is deliberately not
// github-slugger, which is declared in package.json but unused: the two disagree
// on underscores ("foo_bar" -> "foo-bar" vs "foo_bar") and on leading digits
// ("1. Getting Started" -> "_1-getting-started" vs "1-getting-started").

const rControl = new RegExp('[\\u0000-\\u001f]', 'g')
const rCombining = new RegExp('[\\u0300-\\u036f]', 'g')
const rSpecial = /[\s~`!@#$%^&*()\-_+=[\]{}|\\;:"'“”‘’<>,.?/]+/g

export function defaultSlugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(rCombining, '')
    .replace(rControl, '')
    .replace(rSpecial, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/^(\d)/, '_$1')
    .toLowerCase()
}

export function localeStrippedPath(relativePath: string): string {
  return relativePath.replace(/^[^/]+\//, '')
}

// Heading levels that get anchor ids. VitePress's anchor plugin defaults to
// level 1, and its unique-slug counter starts at the H1, so ids must be
// collected from level 1 or every index shifts.
export const MAX_ANCHOR_LEVEL = 3

// Fence-aware: parse with the real renderer rather than matching /^##/ , which
// counts pseudo-headings inside ```markdown blocks (lecture-04 has 9 real
// headings and 12 by naive regex).
export function collectHeadingIds(md: any, source: string): string[] {
  const tokens = md.parse(source, {})
  const ids: string[] = []
  // markdown-it-anchor keeps a set of taken ids and suffixes collisions with a
  // per-slug counter: "dup", "dup-1", "dup-2".
  const taken = new Set<string>()

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]
    if (token.type !== 'heading_open') continue

    const level = Number(token.tag.slice(1))
    if (level > MAX_ANCHOR_LEVEL) continue

    const title = tokens[i + 1]?.content ?? ''
    const base = defaultSlugify(title)

    let candidate = base
    let suffix = 1
    while (taken.has(candidate)) {
      candidate = `${base}-${suffix}`
      suffix++
    }

    taken.add(candidate)
    ids.push(candidate)
  }

  return ids
}
