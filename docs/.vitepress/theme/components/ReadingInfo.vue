<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { onContentUpdated, useData } from 'vitepress'

const { page } = useData()
const count = ref(0)
const progress = ref(0)
const minutes = computed(() => Math.max(1, Math.ceil(count.value / 400)))
const updated = computed(() => page.value.lastUpdated
  ? new Intl.DateTimeFormat('zh-CN').format(new Date(page.value.lastUpdated))
  : null)
let frame = 0

function measureProgress() {
  const article = document.querySelector('.vp-doc')
  if (!article) return
  const bounds = article.getBoundingClientRect()
  const distance = bounds.height - window.innerHeight
  progress.value = distance > 0
    ? Math.round(Math.min(1, Math.max(0, -bounds.top / distance)) * 100)
    : 100
}

function queueProgress() {
  cancelAnimationFrame(frame)
  frame = requestAnimationFrame(measureProgress)
}

onContentUpdated(() => {
  const article = document.querySelector('.vp-doc')
  if (!article) return
  // Count Chinese characters individually and Latin words as words.
  count.value = (article.textContent.match(/[\u3400-\u9fff]|[\p{L}\p{N}]+/gu) || []).length
  queueProgress()
})

onMounted(() => {
  window.addEventListener('scroll', queueProgress, { passive: true })
  window.addEventListener('resize', queueProgress)
})
onUnmounted(() => {
  cancelAnimationFrame(frame)
  window.removeEventListener('scroll', queueProgress)
  window.removeEventListener('resize', queueProgress)
})
</script>

<template>
  <section v-if="count" class="reading-info" aria-label="阅读信息">
    <div class="reading-info-heading">阅读信息</div>
    <dl>
      <div><dt>预计阅读</dt><dd>约 {{ minutes }} 分钟</dd></div>
      <div><dt>全文字数</dt><dd>约 {{ count.toLocaleString('zh-CN') }} 字</dd></div>
      <div v-if="updated"><dt>最后更新</dt><dd>{{ updated }}</dd></div>
    </dl>
    <div class="reading-progress-label"><span>阅读进度</span><span>{{ progress }}%</span></div>
    <progress :value="progress" max="100" aria-label="文章阅读进度" />
  </section>
</template>

<style scoped>
.reading-info {
  margin: 24px 0 12px 16px;
  padding: 16px;
  border: 1px solid var(--blog-border);
  border-radius: 10px;
  background: var(--blog-bg-muted);
  color: var(--blog-ink-soft);
  font-size: 12px;
  line-height: 1.6;
}
.reading-info-heading { color: var(--blog-ink); font-weight: 600; }
dl { margin: 12px 0 16px; }
dl > div, .reading-progress-label { display: flex; justify-content: space-between; gap: 12px; }
dl > div + div { margin-top: 6px; }
dd { margin: 0; color: var(--blog-ink); }
progress { display: block; width: 100%; height: 4px; margin-top: 8px; border: 0; border-radius: 4px; overflow: hidden; background: var(--blog-border); }
progress::-webkit-progress-bar { background: var(--blog-border); }
progress::-webkit-progress-value { background: var(--blog-accent); }
progress::-moz-progress-bar { background: var(--blog-accent); }
</style>
