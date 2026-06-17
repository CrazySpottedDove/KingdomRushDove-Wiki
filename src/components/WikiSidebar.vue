<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import SidebarNode from './SidebarNode.vue'
import type { WikiEntry } from './SidebarNode.vue'

const route = useRoute()
const entries = ref<WikiEntry[]>([])
const expanded = ref<Set<string>>(new Set())

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}

function toggle(name: string) {
  if (expanded.value.has(name)) expanded.value.delete(name)
  else expanded.value.add(name)
}

onMounted(async () => {
  try {
    const resp = await fetch('/api/wiki/sidebar')
    if (resp.ok) {
      entries.value = await resp.json()
      const currentPath = route.path
      function autoExpand(list: WikiEntry[]) {
        for (const e of list) {
          if (currentPath.startsWith(e.path)) {
            expanded.value.add(e.name)
            autoExpand(e.children)
          }
        }
      }
      autoExpand(entries.value)
    }
  } catch { /* ignore */ }
})
</script>

<template>
  <nav class="wiki-sidebar">
    <router-link to="/wiki" class="sidebar-home" :class="{ active: route.path === '/wiki' }">
      🏠 Wiki 首页
    </router-link>
    <SidebarNode
      v-for="e in entries"
      :key="e.name"
      :entry="e"
      :depth="0"
      :expanded="expanded"
      @toggle="toggle"
    />
  </nav>
</template>

<style scoped>
.wiki-sidebar {
  width: 200px;
  flex-shrink: 0;
  position: sticky;
  top: 60px;
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  padding: 8px 0;
}
.sidebar-home {
  display: block;
  padding: 6px 12px;
  font-size: 0.88rem;
  color: var(--text);
  text-decoration: none;
  border-radius: 6px;
  margin-bottom: 4px;
  font-weight: 600;
}
.sidebar-home:hover, .sidebar-home.active { background: var(--surface); }
</style>
