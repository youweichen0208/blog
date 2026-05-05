<script setup>
import { computed } from 'vue'
import { useData, useRoute } from 'vitepress'

const route = useRoute()
const { frontmatter, site } = useData()

const sectionLabelMap = {
  agent: 'Agent',
  aiops: 'AIOps',
  cli: 'CLI',
  'data-structures': '数据结构',
  go: 'Go',
  mcp: 'MCP',
  openclaw: 'OpenClaw',
  posts: '博客文章',
  skill: 'Skill',
  stock: '股票',
  tutorials: '教程',
}

const normalizedDate = computed(() => {
  const raw = frontmatter.value.date

  if (!raw) {
    return null
  }

  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) {
    return raw
  }

  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(parsed)
})

const sectionLabel = computed(() => {
  if (frontmatter.value.section) {
    return frontmatter.value.section
  }

  const siteBase = site.value.base || '/'
  const normalizedPath = route.path.startsWith(siteBase)
    ? `/${route.path.slice(siteBase.length)}`
    : route.path
  const sectionKey = normalizedPath.split('/').filter(Boolean)[0]
  return sectionLabelMap[sectionKey] || null
})

const authorLabel = computed(() => frontmatter.value.author || null)

const showIntro = computed(() => {
  if (frontmatter.value.layout === 'home') {
    return false
  }

  return Boolean(sectionLabel.value || normalizedDate.value || authorLabel.value)
})
</script>

<template>
  <div v-if="showIntro" class="doc-intro">
    <div class="doc-intro-kicker">{{ sectionLabel || 'Article' }}</div>
    <div v-if="normalizedDate || authorLabel" class="doc-intro-meta">
      <span v-if="normalizedDate">{{ normalizedDate }}</span>
      <span v-if="authorLabel">{{ authorLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.doc-intro {
  display: grid;
  gap: 10px;
  margin-bottom: 22px;
}

.doc-intro-kicker {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--blog-accent);
}

.doc-intro-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  color: var(--blog-ink-soft);
  font-size: 14px;
}

.doc-intro-meta span {
  position: relative;
}

.doc-intro-meta span + span::before {
  content: "";
  position: absolute;
  top: 50%;
  left: -9px;
  width: 3px;
  height: 3px;
  border-radius: 999px;
  background: currentColor;
  transform: translateY(-50%);
  opacity: 0.75;
}

@media (max-width: 640px) {
  .doc-intro {
    gap: 8px;
    margin-bottom: 16px;
  }

  .doc-intro-meta {
    gap: 12px;
    font-size: 13px;
  }

  .doc-intro-meta span + span::before {
    left: -7px;
  }
}
</style>
