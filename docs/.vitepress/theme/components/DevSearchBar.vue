<script setup>
import { computed, ref } from 'vue'
import { useRoute, withBase } from 'vitepress'
import { data as homeData } from '../home.data.mjs'

const route = useRoute()
const query = ref('')

const filteredItems = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const items = homeData.searchItems.filter((item) => item.link !== route.path)

  if (!keyword) {
    return items.slice(0, 6)
  }

  return items
    .filter((item) => {
      const haystack = `${item.title} ${item.excerpt} ${item.section}`.toLowerCase()
      return haystack.includes(keyword)
    })
    .slice(0, 6)
})
</script>

<template>
  <div class="dev-search-bar">
    <span class="dev-search-icon">⌕</span>
    <input
      v-model="query"
      type="text"
      class="dev-search-input"
      placeholder="Find notes, guides, and posts..."
      aria-label="Search blog content"
    />
    <div class="dev-search-label">Powered by local index</div>

    <div class="dev-search-dropdown">
      <a
        v-for="item in filteredItems"
        :key="item.link"
        :href="withBase(item.link)"
        class="dev-search-item"
      >
        <strong>{{ item.title }}</strong>
        <span>{{ item.section }}<template v-if="item.date"> · {{ item.date }}</template></span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.dev-search-bar {
  position: relative;
  display: flex;
  align-items: center;
  width: min(420px, 100%);
  min-width: 0;
  min-height: 42px;
  padding: 0 12px;
  border: 1px solid rgba(37, 99, 235, 0.16);
  border-radius: 12px;
  background: rgba(248, 250, 252, 0.96);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.dev-search-icon {
  flex: 0 0 auto;
  margin-right: 8px;
  color: #2563eb;
  font-size: 16px;
}

.dev-search-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 40px;
  border: 0;
  background: transparent;
  color: #0f172a;
  font-size: 14px;
  outline: 0;
}

.dev-search-input::placeholder {
  color: #94a3b8;
}

.dev-search-label {
  flex: 0 0 auto;
  margin-left: 10px;
  color: #64748b;
  font-size: 12px;
  white-space: nowrap;
}

.dev-search-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  display: grid;
  gap: 0;
  padding: 8px 0;
  border: 1px solid rgba(37, 99, 235, 0.14);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.dev-search-bar:focus-within .dev-search-dropdown {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.dev-search-item {
  display: grid;
  gap: 4px;
  padding: 10px 14px;
  text-decoration: none;
}

.dev-search-item:hover {
  background: rgba(37, 99, 235, 0.06);
}

.dev-search-item strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 800;
  line-height: 1.35;
}

.dev-search-item span {
  color: #64748b;
  font-size: 12px;
}

@media (max-width: 960px) {
  .dev-search-bar {
    width: 100%;
  }

  .dev-search-label {
    display: none;
  }
}

@media (max-width: 767px) {
  .dev-search-bar {
    display: none;
  }
}
</style>
