<script setup>
import { useData, withBase } from 'vitepress'
import { data as homeData } from '../home.data.mjs'

const { site } = useData()
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
  </div>
</template>

<style scoped>
.home-shell {
  width: min(1200px, calc(100vw - 40px));
  margin: 0 auto;
  padding: 32px 0 88px;
}

.home-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(300px, 0.9fr);
  gap: 28px;
  align-items: stretch;
  padding: 22px 0 48px;
}

.hero-copy,
.hero-metrics,
.section-card,
.recent-card {
  border: 1px solid var(--blog-border);
  background: var(--blog-surface);
  box-shadow: var(--blog-shadow-soft);
}

.hero-copy {
  padding: 32px;
}

.hero-kicker,
.section-kicker {
  margin: 0 0 16px;
  font-size: 12px;
  line-height: 1;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--blog-accent);
}

.hero-title {
  margin: 0;
  font-family: var(--blog-font-display);
  font-size: clamp(48px, 7vw, 88px);
  line-height: 0.96;
  color: var(--blog-ink-strong);
}

.hero-dek {
  max-width: 680px;
  margin: 20px 0 0;
  font-size: 18px;
  line-height: 1.8;
  color: var(--blog-ink);
}

.hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 28px;
}

.home-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--blog-border-strong);
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
  padding: 8px;
}

.metric-card {
  display: grid;
  gap: 12px;
  padding: 22px 20px;
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
  padding-top: 24px;
}

.section-heading {
  display: grid;
  gap: 8px;
  margin-bottom: 22px;
}

.section-heading h2 {
  margin: 0;
  font-family: var(--blog-font-display);
  font-size: clamp(30px, 4vw, 48px);
  line-height: 1.04;
  color: var(--blog-ink-strong);
}

.section-grid,
.recent-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: 16px;
}

.section-card,
.recent-card {
  display: grid;
  gap: 14px;
  min-height: 100%;
  padding: 24px;
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

.section-card:hover,
.recent-card:hover {
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
.recent-meta span:first-child {
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
.recent-card h3 {
  margin: 0;
  font-size: 24px;
  line-height: 1.22;
  color: var(--blog-ink-strong);
}

.section-card p,
.recent-card p {
  margin: 0;
  color: var(--blog-ink);
  line-height: 1.8;
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
  .recent-card {
    grid-template-columns: 1fr;
  }

  .section-card {
    grid-column: span 6;
  }
}

@media (max-width: 900px) {
  .home-shell {
    width: min(100vw - 24px, 1200px);
    padding-bottom: 64px;
  }

  .home-hero {
    grid-template-columns: 1fr;
  }

  .section-card,
  .recent-card {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .home-shell {
    width: min(100vw - 20px, 1200px);
    padding-top: 20px;
  }

  .hero-copy,
  .section-card,
  .recent-card {
    padding: 20px;
  }

  .hero-actions {
    gap: 10px;
  }

  .home-button {
    flex: 1 1 160px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .home-button,
  .section-card,
  .recent-card {
    transition: none;
  }

  .home-button:hover,
  .section-card:hover,
  .recent-card:hover {
    transform: none;
  }
}
</style>
