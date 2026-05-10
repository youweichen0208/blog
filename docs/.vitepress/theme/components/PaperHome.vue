<script setup>
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as homeData } from '../home.data.mjs'

const posts = computed(() => homeData.searchItems.filter((item) => item.link !== '/').slice(0, 9))
const leadPost = computed(() => posts.value[0] || null)
const secondaryPosts = computed(() => posts.value.slice(1))
const totalReadMinutes = computed(() =>
  homeData.searchItems.reduce((total, item) => total + (item.readingMinutes || 0), 0),
)

function postImage(post) {
  return post.image ? withBase(post.image) : null
}
</script>

<template>
  <main class="popular-home">
    <header class="popular-header">
      <h1>Popular posts</h1>
      <div class="popular-stats" aria-label="站点统计">
        <span>Last 24h:</span>
        <span class="stat-dot" aria-hidden="true"></span>
        <strong>{{ homeData.stats.totalArticles }}</strong>
        <span>articles</span>
        <strong>{{ totalReadMinutes }}</strong>
        <span>min read</span>
      </div>
    </header>

    <div class="section-rule">
      <span class="section-dot" aria-hidden="true"></span>
      <span>New &amp; Popular</span>
    </div>

    <a
      v-if="leadPost"
      :href="withBase(leadPost.link)"
      class="lead-card"
      :class="{ 'has-image': leadPost.image }"
    >
      <div class="lead-media">
        <img v-if="postImage(leadPost)" :src="postImage(leadPost)" :alt="leadPost.title" />
        <div v-else class="generated-cover">
          <span>{{ leadPost.section }}</span>
          <strong>{{ leadPost.title }}</strong>
        </div>
      </div>

      <div class="lead-content">
        <span class="live-pill">
          <span aria-hidden="true"></span>
          Featured
        </span>
        <h2>{{ leadPost.title }}</h2>
        <p>{{ leadPost.excerpt }}</p>
        <div class="post-meta">
          <span>{{ leadPost.section }}</span>
          <span v-if="leadPost.date">{{ leadPost.date }}</span>
          <span>{{ leadPost.readingMinutes }} min</span>
        </div>
        <div class="lead-action">Read article</div>
      </div>
    </a>

    <div class="post-grid">
      <a
        v-for="post in secondaryPosts"
        :key="post.link"
        :href="withBase(post.link)"
        class="post-card"
      >
        <div class="post-thumb">
          <img v-if="postImage(post)" :src="postImage(post)" :alt="post.title" />
          <div v-else class="generated-cover small">
            <span>{{ post.section }}</span>
            <strong>{{ post.title }}</strong>
          </div>
        </div>

        <div class="post-body">
          <div class="post-meta">
            <span>{{ post.section }}</span>
            <span v-if="post.date">{{ post.date }}</span>
            <span>{{ post.readingMinutes }} min</span>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.excerpt }}</p>
        </div>
      </a>
    </div>
  </main>
</template>

<style scoped>
.popular-home {
  width: min(1420px, calc(100vw - 48px));
  margin: 0 auto;
  padding: 20px 0 80px;
}

.popular-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 34px;
}

.popular-header h1 {
  margin: 0;
  color: var(--blog-ink-strong);
  font-size: 28px;
  line-height: 1.1;
  font-weight: 800;
}

.popular-stats {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #7b838e;
  font-size: 26px;
  line-height: 1;
  white-space: nowrap;
}

.popular-stats strong {
  color: #6b7280;
  font-weight: 500;
}

.stat-dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #10b981;
}

.section-rule {
  display: grid;
  grid-template-columns: auto auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  margin-bottom: 48px;
  color: #7b838e;
  font-size: 28px;
  font-weight: 800;
  letter-spacing: 0.14em;
  line-height: 1;
  text-transform: uppercase;
}

.section-rule::after {
  content: "";
  height: 1px;
  background: #cfd5dc;
}

.section-dot {
  width: 16px;
  height: 16px;
  border-radius: 999px;
  background: #2563eb;
}

.lead-card {
  display: grid;
  grid-template-columns: minmax(320px, 0.48fr) minmax(0, 1fr);
  gap: 40px;
  align-items: center;
  min-height: 430px;
  margin-bottom: 48px;
  padding: 40px;
  border: 1px solid #cfd5dc;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.88);
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.lead-card:hover,
.post-card:hover {
  transform: translateY(-2px);
  border-color: #aeb7c2;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
}

.lead-media {
  overflow: hidden;
  border-radius: 18px;
  aspect-ratio: 1.9 / 1;
  background: #111827;
}

.lead-media img,
.post-thumb img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generated-cover {
  display: grid;
  align-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  padding: 34px;
  background:
    linear-gradient(135deg, rgba(16, 185, 129, 0.28), transparent 34%),
    linear-gradient(315deg, rgba(37, 99, 235, 0.4), transparent 42%),
    #101827;
  color: #ffffff;
}

.generated-cover span {
  color: #a7f3d0;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.generated-cover strong {
  max-width: 520px;
  font-size: 28px;
  line-height: 1.08;
}

.generated-cover.small {
  gap: 10px;
  padding: 18px;
}

.generated-cover.small span {
  font-size: 10px;
}

.generated-cover.small strong {
  font-size: 17px;
  line-height: 1.15;
}

.lead-content {
  display: grid;
  justify-items: start;
}

.live-pill {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 42px;
  margin-bottom: 22px;
  padding: 0 20px;
  border-radius: 999px;
  background: #34a853;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}

.live-pill span {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
}

.lead-content h2 {
  margin: 0 0 24px;
  color: var(--blog-ink-strong);
  font-size: clamp(38px, 4.4vw, 52px);
  font-weight: 900;
  line-height: 1.04;
}

.lead-content p {
  display: -webkit-box;
  max-width: 760px;
  margin: 0 0 26px;
  overflow: hidden;
  color: #20242a;
  font-size: 32px;
  line-height: 1.45;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  color: #808892;
  font-size: 26px;
  line-height: 1.25;
}

.post-meta span + span::before {
  content: "·";
  margin-right: 10px;
  color: #808892;
}

.post-meta span:first-child {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 800;
}

.lead-action {
  margin-top: 28px;
  padding: 16px 28px;
  border-radius: 12px;
  background: #2559db;
  color: #ffffff;
  font-size: 24px;
  font-weight: 800;
}

.post-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 64px;
  border-top: 1px solid transparent;
}

.post-card {
  display: grid;
  grid-template-columns: minmax(150px, 256px) minmax(0, 1fr);
  gap: 24px;
  min-height: 220px;
  padding: 32px 0;
  border-top: 1px solid #cfd5dc;
  color: inherit;
  text-decoration: none;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.post-card:nth-child(1),
.post-card:nth-child(2) {
  border-top: 0;
}

.post-card:nth-child(odd) {
  padding-right: 34px;
  border-right: 1px solid #cfd5dc;
}

.post-card:nth-child(even) {
  padding-left: 34px;
}

.post-thumb {
  overflow: hidden;
  align-self: start;
  border-radius: 14px;
  aspect-ratio: 1.92 / 1;
  background: #111827;
}

.post-body {
  min-width: 0;
}

.post-body h3 {
  display: -webkit-box;
  margin: 12px 0 10px;
  overflow: hidden;
  color: var(--blog-ink-strong);
  font-size: 30px;
  font-weight: 900;
  line-height: 1.28;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.post-body p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: #5f6874;
  font-size: 18px;
  line-height: 1.55;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

@media (max-width: 1100px) {
  .popular-stats,
  .post-meta {
    font-size: 20px;
  }

  .lead-card {
    grid-template-columns: 1fr;
  }

  .lead-media {
    max-width: 720px;
  }

  .post-grid {
    grid-template-columns: 1fr;
  }

  .post-card:nth-child(1),
  .post-card:nth-child(2) {
    border-top: 1px solid #cfd5dc;
  }

  .post-card:nth-child(odd),
  .post-card:nth-child(even) {
    padding-right: 0;
    padding-left: 0;
    border-right: 0;
  }
}

@media (max-width: 760px) {
  .popular-home {
    width: min(100vw - 24px, 1420px);
    padding-top: 4px;
    padding-bottom: 56px;
  }

  .popular-header {
    align-items: flex-start;
    flex-direction: column;
    gap: 14px;
    margin-bottom: 28px;
  }

  .popular-header h1 {
    font-size: 24px;
  }

  .popular-stats {
    gap: 8px;
    font-size: 16px;
  }

  .stat-dot {
    width: 9px;
    height: 9px;
  }

  .section-rule {
    gap: 10px;
    margin-bottom: 28px;
    font-size: 18px;
    letter-spacing: 0.12em;
  }

  .section-dot {
    width: 12px;
    height: 12px;
  }

  .lead-card {
    gap: 22px;
    min-height: 0;
    margin-bottom: 26px;
    padding: 18px;
    border-radius: 20px;
  }

  .lead-media {
    border-radius: 14px;
  }

  .live-pill {
    min-height: 32px;
    margin-bottom: 16px;
    padding: 0 13px;
    font-size: 15px;
  }

  .live-pill span {
    width: 10px;
    height: 10px;
  }

  .lead-content h2 {
    margin-bottom: 14px;
    font-size: 32px;
  }

  .lead-content p {
    margin-bottom: 16px;
    font-size: 20px;
  }

  .lead-action {
    margin-top: 18px;
    padding: 12px 18px;
    font-size: 16px;
  }

  .post-card {
    grid-template-columns: 132px minmax(0, 1fr);
    gap: 14px;
    min-height: 0;
    padding: 22px 0;
  }

  .post-body h3 {
    margin-top: 8px;
    font-size: 20px;
  }

  .post-body p {
    display: none;
  }

  .post-meta {
    gap: 6px;
    font-size: 14px;
  }

  .post-meta span + span::before {
    margin-right: 6px;
  }

  .generated-cover {
    padding: 20px;
  }

  .generated-cover strong {
    font-size: 20px;
  }

  .generated-cover.small {
    padding: 12px;
  }

  .generated-cover.small strong {
    font-size: 13px;
  }
}

@media (max-width: 460px) {
  .post-card {
    grid-template-columns: 1fr;
  }

  .post-thumb {
    max-width: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .lead-card,
  .post-card {
    transition: none;
  }

  .lead-card:hover,
  .post-card:hover {
    transform: none;
  }
}
</style>
