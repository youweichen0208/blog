<script setup>
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { data as homeData } from '../home.data.mjs'

const { site } = useData()

const featuredRoutes = [
  '/go/func',
  '/openclaw/boss-recruiting-practice',
  '/mcp/inspector',
  '/stock/',
]

const featuredPosts = computed(() =>
  featuredRoutes
    .map((route) => homeData.searchItems.find((item) => item.link === route))
    .filter(Boolean),
)

const readingPaths = [
  {
    title: 'Go 工程基础',
    text: '从指针、函数、结构体、接口一路读到 goroutine 和 channel。',
    link: '/go/',
    label: '8 篇',
  },
  {
    title: 'Agent 工具链',
    text: '先看 MCP 协议，再看 CLI 工具边界，最后进入 OpenClaw 浏览器实战。',
    link: '/mcp/',
    label: 'MCP / CLI / OpenClaw',
  },
  {
    title: '运维实践',
    text: '用 Linux 命令排障，用 Hysteria2 搭网络，用 Jenkins 建自动部署链路。',
    link: '/tutorials/',
    label: '3 篇教程',
  },
]

const writingQueue = [
  'Go context 与并发退出控制',
  'Docker Compose 排障速查',
  'Agent 工具 schema 设计',
  '数组、滑动窗口与前缀和',
]
</script>

<template>
  <div class="home-shell">
    <section class="home-hero">
      <div class="hero-copy">
        <p class="hero-kicker">Technical Journal</p>
        <h1 class="hero-title">{{ site.title }}</h1>
        <p class="hero-dek">{{ site.description }}</p>

        <div class="hero-actions">
          <a href="#recent-updates" class="home-button home-button-primary">最近更新</a>
          <a
            v-if="homeData.sections[0]"
            :href="withBase(homeData.sections[0].link)"
            class="home-button home-button-secondary"
          >
            浏览专题
          </a>
        </div>

        <div class="hero-focus">
          <span>当前主线</span>
          <strong>Go 基础、MCP / Agent、OpenClaw 实战、工程部署</strong>
        </div>
      </div>

      <dl class="hero-metrics">
        <div class="metric-card">
          <dt>文章总数</dt>
          <dd>{{ homeData.stats.totalArticles }}</dd>
        </div>
        <div class="metric-card">
          <dt>专题分类</dt>
          <dd>{{ homeData.stats.totalSections }}</dd>
        </div>
        <div class="metric-card">
          <dt>最近更新</dt>
          <dd class="metric-date">{{ homeData.stats.latestUpdate }}</dd>
        </div>
      </dl>
    </section>

    <section class="home-band home-featured">
      <div class="section-heading section-heading-row">
        <div>
          <p class="section-kicker">Featured</p>
          <h2>精选阅读</h2>
        </div>
        <p class="section-note">优先展示适合作为入口的长文和实战记录。</p>
      </div>

      <div class="featured-grid">
        <a
          v-for="post in featuredPosts"
          :key="post.link"
          :href="withBase(post.link)"
          class="featured-card"
        >
          <span>{{ post.section }}</span>
          <h3>{{ post.title }}</h3>
          <p>{{ post.excerpt }}</p>
        </a>
      </div>
    </section>

    <section class="home-band">
      <div class="section-heading">
        <p class="section-kicker">Collections</p>
        <h2>按主题进入</h2>
      </div>

      <div class="section-grid">
        <a
          v-for="section in homeData.sectionHighlights"
          :key="section.link"
          :href="withBase(section.link)"
          class="section-card"
        >
          <div class="section-card-top">
            <span class="section-count">{{ section.count }} 篇</span>
            <span class="section-link">查看专题</span>
          </div>
          <h3>{{ section.title }}</h3>
          <p>{{ section.description }}</p>
          <div v-if="section.latestTitle" class="section-latest">
            <span>最近一篇</span>
            <strong>{{ section.latestTitle }}</strong>
          </div>
        </a>
      </div>
    </section>

    <section class="home-band">
      <div class="section-heading section-heading-row">
        <div>
          <p class="section-kicker">Paths</p>
          <h2>学习路径</h2>
        </div>
        <p class="section-note">把散落的文章按真实阅读目标重新串起来。</p>
      </div>

      <div class="path-list">
        <a
          v-for="path in readingPaths"
          :key="path.title"
          :href="withBase(path.link)"
          class="path-row"
        >
          <span>{{ path.label }}</span>
          <strong>{{ path.title }}</strong>
          <p>{{ path.text }}</p>
        </a>
      </div>
    </section>

    <section id="recent-updates" class="home-band">
      <div class="section-heading">
        <p class="section-kicker">Latest</p>
        <h2>最近更新</h2>
      </div>

      <div class="recent-grid">
        <a
          v-for="post in homeData.recentPages"
          :key="post.link"
          :href="withBase(post.link)"
          class="recent-card"
        >
          <div class="recent-meta">
            <span>{{ post.section }}</span>
            <span v-if="post.date">{{ post.date }}</span>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.excerpt }}</p>
          <span class="recent-cta">阅读全文</span>
        </a>
      </div>
    </section>

    <section class="home-band home-notes">
      <div class="section-heading section-heading-row">
        <div>
          <p class="section-kicker">Next</p>
          <h2>写作计划</h2>
        </div>
        <p class="section-note">这些主题会继续补进对应专题，先作为公开草稿队列。</p>
      </div>

      <ul class="queue-list">
        <li v-for="item in writingQueue" :key="item">{{ item }}</li>
      </ul>
    </section>
  </div>
</template>

<style scoped>
.home-shell {
  width: min(1320px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 48px 0 92px;
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.9fr);
  gap: 22px;
  align-items: stretch;
  padding: 18px 0 42px;
}

.hero-copy,
.hero-metrics,
.section-card,
.recent-card,
.featured-card,
.path-row,
.queue-list {
  border: 1px solid var(--blog-border);
  background: var(--blog-surface);
  box-shadow: var(--blog-shadow-soft);
}

.hero-copy {
  padding: 36px;
}

.hero-kicker,
.section-kicker {
  margin: 0 0 14px;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blog-accent);
}

.hero-title {
  margin: 0;
  font-family: var(--blog-font-display);
  font-size: clamp(46px, 6vw, 78px);
  line-height: 0.98;
  color: var(--blog-ink-strong);
}

.hero-dek {
  max-width: 680px;
  margin: 18px 0 0;
  font-size: 18px;
  line-height: 1.76;
  color: var(--blog-ink);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 30px;
}

.hero-focus {
  display: grid;
  gap: 8px;
  margin-top: 30px;
  padding-top: 22px;
  border-top: 1px solid var(--blog-border);
}

.hero-focus span,
.section-note {
  color: var(--blog-ink-soft);
  font-size: 14px;
  line-height: 1.6;
}

.hero-focus strong {
  color: var(--blog-ink-strong);
  font-size: 18px;
  line-height: 1.5;
}

.home-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 46px;
  padding: 0 20px;
  border: 1px solid var(--blog-border-strong);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease,
    transform 0.2s ease;
}

.home-button:hover {
  transform: translateY(-1px);
}

.home-button-primary {
  background: var(--blog-ink-strong);
  color: var(--blog-surface-strong);
}

.home-button-primary:hover {
  background: var(--blog-accent);
  border-color: var(--blog-accent);
}

.home-button-secondary {
  background: transparent;
  color: var(--blog-ink-strong);
}

.home-button-secondary:hover {
  background: var(--blog-surface-muted);
}

.hero-metrics {
  display: grid;
  grid-template-columns: 1fr;
  padding: 10px;
}

.metric-card {
  display: grid;
  gap: 12px;
  padding: 24px 22px;
  border-bottom: 1px solid var(--blog-border);
}

.metric-card:last-child {
  border-bottom: 0;
}

.metric-card dt {
  font-size: 12px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--blog-ink-soft);
}

.metric-card dd {
  margin: 0;
  font-family: var(--blog-font-display);
  font-size: clamp(28px, 4vw, 42px);
  line-height: 1.05;
  color: var(--blog-ink-strong);
}

.metric-date {
  font-size: clamp(24px, 3vw, 34px);
}

.home-band {
  padding-top: 30px;
}

.section-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 20px;
}

.section-heading-row {
  grid-template-columns: minmax(0, 1fr) minmax(220px, 420px);
  align-items: end;
  gap: 20px;
}

.section-heading h2 {
  margin: 0;
  font-family: var(--blog-font-display);
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.04;
  color: var(--blog-ink-strong);
}

.section-grid,
.recent-grid,
.featured-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 18px;
}

.section-card,
.recent-card,
.featured-card,
.path-row {
  display: grid;
  gap: 14px;
  min-height: 100%;
  padding: 26px;
  border-radius: 14px;
  text-decoration: none;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease,
    background-color 0.2s ease,
    box-shadow 0.2s ease;
}

.section-card {
  grid-column: span 4;
}

.recent-card {
  grid-column: span 6;
}

.featured-card {
  grid-column: span 3;
  align-content: start;
}

.path-list {
  display: grid;
  gap: 12px;
}

.path-row {
  grid-template-columns: 160px 220px minmax(0, 1fr);
  align-items: center;
  min-height: auto;
}

.section-card:hover,
.recent-card:hover,
.featured-card:hover,
.path-row:hover {
  transform: translateY(-2px);
  border-color: var(--blog-border-strong);
  background: var(--blog-surface-strong);
  box-shadow: var(--blog-shadow-strong);
}

.section-card-top,
.recent-meta,
.section-latest {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.section-count,
.recent-meta span:first-child,
.featured-card > span,
.path-row > span {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--blog-accent);
}

.section-link,
.recent-meta span:last-child,
.section-latest span {
  font-size: 12px;
  color: var(--blog-ink-soft);
}

.section-card h3,
.recent-card h3,
.featured-card h3 {
  margin: 0;
  font-size: 26px;
  line-height: 1.18;
  color: var(--blog-ink-strong);
}

.section-card p,
.recent-card p,
.featured-card p,
.path-row p {
  margin: 0;
  color: var(--blog-ink);
  line-height: 1.8;
}

.path-row strong {
  color: var(--blog-ink-strong);
  font-size: 18px;
  line-height: 1.35;
}

.queue-list {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.queue-list li {
  min-height: 88px;
  padding: 22px;
  border-right: 1px solid var(--blog-border);
  color: var(--blog-ink-strong);
  font-weight: 700;
  line-height: 1.55;
}

.queue-list li:last-child {
  border-right: 0;
}

.section-latest strong {
  color: var(--blog-ink-strong);
  font-size: 14px;
  font-weight: 600;
}

.recent-cta {
  font-size: 14px;
  font-weight: 600;
  color: var(--blog-ink-strong);
}

@media (max-width: 1100px) {
  .home-hero,
  .section-card,
  .recent-card,
  .featured-card {
    grid-template-columns: 1fr;
  }

  .section-card,
  .featured-card {
    grid-column: span 6;
  }

  .path-row {
    grid-template-columns: 130px minmax(0, 1fr);
  }

  .path-row p {
    grid-column: 1 / -1;
  }

  .queue-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .queue-list li:nth-child(2) {
    border-right: 0;
  }
}

@media (max-width: 900px) {
  .home-shell {
    width: min(100vw - 24px, 1320px);
    padding-top: 40px;
    padding-bottom: 64px;
  }

  .home-hero {
    grid-template-columns: 1fr;
  }

  .section-card,
  .recent-card,
  .featured-card {
    grid-column: 1 / -1;
  }

  .section-heading-row,
  .path-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .home-shell {
    width: min(100vw - 20px, 1320px);
    padding-top: 20px;
  }

  .hero-copy,
  .section-card,
  .recent-card,
  .featured-card,
  .path-row {
    padding: 20px;
  }

  .hero-title {
    font-size: clamp(34px, 13vw, 52px);
    line-height: 1.02;
  }

  .hero-dek {
    margin-top: 16px;
    font-size: 16px;
    line-height: 1.72;
  }

  .section-heading h2 {
    font-size: clamp(28px, 10vw, 36px);
  }

  .section-card h3,
  .recent-card h3,
  .featured-card h3 {
    font-size: 21px;
  }

  .section-card p,
  .recent-card p,
  .featured-card p,
  .path-row p {
    line-height: 1.72;
  }

  .hero-actions {
    gap: 10px;
  }

  .home-button {
    flex: 1 1 100%;
    min-height: 42px;
  }

  .queue-list {
    grid-template-columns: 1fr;
  }

  .queue-list li,
  .queue-list li:nth-child(2) {
    min-height: auto;
    border-right: 0;
    border-bottom: 1px solid var(--blog-border);
  }

  .queue-list li:last-child {
    border-bottom: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-button,
  .section-card,
  .recent-card,
  .featured-card,
  .path-row {
    transition: none;
  }

  .home-button:hover,
  .section-card:hover,
  .recent-card:hover,
  .featured-card:hover,
  .path-row:hover {
    transform: none;
  }
}
</style>
