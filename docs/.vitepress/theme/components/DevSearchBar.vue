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
      placeholder="Search"
      aria-label="Search blog content"
    />
    <div class="dev-search-shortcuts" aria-hidden="true">
      <span class="dev-search-key">⌘</span>
      <span class="dev-search-key">⇧</span>
      <span class="dev-search-key">P</span>
    </div>

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
  gap: 8px;
  width: min(320px, 100%);
  min-width: 0;
  min-height: 44px;
  padding: 0 10px 0 12px;
  border: 1px solid rgba(15, 23, 42, 0.16);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: none;
}

.dev-search-icon {
  flex: 0 0 auto;
  color: #111827;
  font-size: 15px;
}

.dev-search-input {
  flex: 1 1 auto;
  min-width: 0;
  height: 42px;
  border: 0;
  background: transparent;
  color: #111827;
  font-size: 14px;
  font-weight: 500;
  outline: 0;
}

.dev-search-input::placeholder {
  color: #475569;
}

.dev-search-shortcuts {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
}

.dev-search-key {
  flex: 0 0 auto;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 6px;
  color: #64748b;
  font-size: 10px;
  font-weight: 600;
  line-height: 18px;
  text-align: center;
  white-space: nowrap;
  background: #fff;
}

.dev-search-dropdown {
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  right: 0;
  display: grid;
  gap: 0;
  padding: 8px 0;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.98);
  box-shadow: 0 22px 50px rgba(15, 23, 42, 0.12);
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
  padding: 11px 14px;
  text-decoration: none;
}

.dev-search-item:hover {
  background: rgba(37, 99, 235, 0.05);
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
    width: min(280px, 100%);
    min-height: 42px;
    padding: 0 10px;
  }

  .dev-search-input {
    height: 40px;
    font-size: 14px;
  }

  .dev-search-shortcuts {
    display: none;
  }
}

@media (max-width: 767px) {
  .dev-search-bar {
    display: none;
  }
}
</style>
