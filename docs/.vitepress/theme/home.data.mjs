import { defineLoader } from 'vitepress'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const docsRoot = fileURLToPath(new URL('../../', import.meta.url))

const sectionLabelMap = {
  agent: 'Agent',
  aiops: 'AIOps',
  cli: 'CLI',
  'data-structures': '数据结构',
  go: 'Go',
  mcp: 'MCP',
  openclaw: 'OpenClaw',
  posts: '博客',
  tutorials: '教程',
}

const sectionOrder = [
  'posts',
  'go',
  'data-structures',
  'mcp',
  'aiops',
  'agent',
  'cli',
  'tutorials',
  'openclaw',
]

function stripFrontmatter(src) {
  return src.replace(/^---[\s\S]*?---\s*/u, '')
}

function extractFrontmatter(src) {
  const match = src.match(/^---\n([\s\S]*?)\n---/u)
  if (!match) {
    return {}
  }

  return match[1]
    .split('\n')
    .map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.+)$/u))
    .filter(Boolean)
    .reduce((acc, [, key, value]) => {
      acc[key] = value.trim().replace(/^['"]|['"]$/gu, '')
      return acc
    }, {})
}

function extractTitle(src, fallback) {
  const body = stripFrontmatter(src)
  const heading = body.match(/^#{1,6}\s+(.+)$/mu)
  return heading ? heading[1].trim() : fallback
}

function extractExcerpt(src, fallback = '') {
  const body = stripFrontmatter(src)
  const blocks = body
    .split(/\n\s*\n/u)
    .map((block) => block.trim())
    .filter(Boolean)

  const paragraph = blocks.find((block) => {
    if (/^#{1,6}\s/u.test(block)) return false
    if (/^```/u.test(block)) return false
    if (/^[-*]\s/u.test(block)) return false
    if (/^\d+\.\s/u.test(block)) return false
    if (/^\|/u.test(block)) return false
    return true
  })

  if (!paragraph) {
    return fallback
  }

  return paragraph
    .replace(/\[(.*?)\]\((.*?)\)/gu, '$1')
    .replace(/[`*_>#-]/gu, '')
    .replace(/\s+/gu, ' ')
    .trim()
}

function toRoute(relativePath) {
  const normalized = relativePath.split(path.sep).join('/')

  if (normalized === 'index.md') {
    return '/'
  }

  if (normalized.endsWith('/index.md')) {
    return `/${normalized.slice(0, -'index.md'.length)}`
  }

  if (normalized.endsWith('/README.md')) {
    return `/${normalized.slice(0, -'README.md'.length)}`
  }

  return `/${normalized.replace(/\.md$/u, '')}`
}

function sectionLabel(sectionKey, title) {
  return sectionLabelMap[sectionKey] || sectionKey.replace(/-/gu, ' ')
}

function sectionRank(sectionKey) {
  const index = sectionOrder.indexOf(sectionKey)
  return index === -1 ? sectionOrder.length : index
}

function formatDateLabel(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(parsed)
}

export default defineLoader({
  watch: ['../../**/*.md'],
  async load(watchedFiles) {
    const mdFiles = watchedFiles
      .filter((file) => file.endsWith('.md'))
      .filter((file) => !file.includes(`${path.sep}.vitepress${path.sep}`))
      .sort()

    const pages = await Promise.all(
      mdFiles.map(async (file) => {
        const relativePath = path.relative(docsRoot, file)
        const src = await fs.readFile(file, 'utf8')
        const stat = await fs.stat(file)
        const frontmatter = extractFrontmatter(src)
        const title = frontmatter.title || extractTitle(src, path.basename(file, '.md'))
        const description = frontmatter.description || extractExcerpt(src, '')
        const link = toRoute(relativePath)
        const sectionKey = relativePath.split(path.sep)[0]

        return {
          relativePath,
          link,
          title,
          description,
          date: frontmatter.date || null,
          mtimeMs: stat.mtimeMs,
          sectionKey,
          sectionLabel: sectionLabel(sectionKey, title),
        }
      }),
    )

    const sections = pages
      .filter((page) => /^[^/]+\/index\.md$/u.test(page.relativePath))
      .map((page) => ({
        text: page.sectionLabel,
        link: page.link,
        sectionKey: page.sectionKey,
        description: page.description,
      }))
      .sort((a, b) => {
        const rank = sectionRank(a.sectionKey) - sectionRank(b.sectionKey)
        return rank || a.text.localeCompare(b.text, 'zh-CN')
      })
      .map(({ text, link, description, sectionKey }) => ({
        text,
        link,
        description,
        sectionKey,
      }))

    const sectionHighlights = sections
      .map((section) => {
        const sectionPages = pages
          .filter((page) => page.sectionKey === section.sectionKey)
          .filter((page) => page.link !== section.link)
          .filter((page) => !/\/(?:index|README)\.md$/u.test(page.relativePath))
          .sort((a, b) => {
            const aTime = a.date ? Date.parse(a.date) : a.mtimeMs
            const bTime = b.date ? Date.parse(b.date) : b.mtimeMs
            return bTime - aTime
          })

        const latestPage = sectionPages[0]

        return {
          title: section.text,
          link: section.link,
          description:
            section.description ||
            latestPage?.description ||
            `${section.text} 相关的工程笔记与整理。`,
          count: sectionPages.length,
          latestTitle: latestPage?.title || null,
          latestLink: latestPage?.link || section.link,
          latestDate: formatDateLabel(latestPage?.date) || null,
        }
      })
      .filter((section) => section.count > 0)

    const recentPages = pages
      .filter((page) => page.link !== '/')
      .filter((page) => !/\/(?:index|README)\.md$/u.test(page.relativePath))
      .filter((page) => page.relativePath !== 'README.md')
      .filter((page) => page.relativePath !== 'IMAGE_GUIDE.md')
      .sort((a, b) => {
        const aTime = a.date ? Date.parse(a.date) : a.mtimeMs
        const bTime = b.date ? Date.parse(b.date) : b.mtimeMs
        return bTime - aTime
      })
      .slice(0, 6)
      .map((page) => ({
        title: page.title,
        excerpt: page.description,
        link: page.link,
        section: page.sectionLabel,
        date: formatDateLabel(page.date),
      }))

    const searchItems = pages
      .filter((page) => page.link !== '/')
      .filter((page) => page.relativePath !== 'README.md')
      .map((page) => ({
        title: page.title,
        excerpt: page.description,
        link: page.link,
        section: page.sectionLabel,
        sectionKey: page.sectionKey,
        date: formatDateLabel(page.date),
      }))

    const totalArticles = pages
      .filter((page) => page.link !== '/')
      .filter((page) => !/\/(?:index|README)\.md$/u.test(page.relativePath))
      .filter((page) => page.relativePath !== 'README.md')
      .filter((page) => page.relativePath !== 'IMAGE_GUIDE.md').length

    const newestTimestamp = pages.reduce((latest, page) => {
      const timestamp = page.date ? Date.parse(page.date) : page.mtimeMs
      return Number.isNaN(timestamp) ? latest : Math.max(latest, timestamp)
    }, 0)

    return {
      sections,
      sectionHighlights,
      recentPages,
      searchItems,
      stats: {
        totalSections: sectionHighlights.length,
        totalArticles,
        latestUpdate: newestTimestamp
          ? new Intl.DateTimeFormat('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(newestTimestamp)
          : null,
      },
    }
  },
})
