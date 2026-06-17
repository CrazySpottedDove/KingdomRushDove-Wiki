<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'

interface WikiEntry {
  name: string
  path: string
  is_dir: boolean
  children: WikiEntry[]
}

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

function entryIcon(e: WikiEntry) {
  if (e.is_dir) return '📁'
  return '📄'
}

onMounted(async () => {
  try {
    const resp = await fetch('/api/wiki/sidebar')
    if (resp.ok) {
      entries.value = await resp.json()
      // Auto-expand active section
      const currentPath = route.path
      for (const e of entries.value) {
        if (currentPath.startsWith(e.path)) {
          expanded.value.add(e.name)
          for (const child of e.children) {
            if (!child.is_dir) continue
            if (currentPath.startsWith(child.path)) {
              expanded.value.add(child.name)
            }
          }
        }
      }
    }
  } catch { /* ignore */ }
})
</script>

<template>
  <nav class="wiki-sidebar">
    <router-link to="/wiki" class="sidebar-home" :class="{ active: route.path === '/wiki' }">
      🏠 Wiki 首页
    </router-link>
    <div v-for="e in entries" :key="e.name" class="sidebar-section">
      <div class="sidebar-item" :class="{ active: isActive(e.path), expanded: expanded.has(e.name) }"
        @click="e.is_dir ? toggle(e.name) : undefined">
        <span class="sidebar-icon">{{ e.is_dir ? (expanded.has(e.name) ? '📂' : '📁') : entryIcon(e) }}</span>
        <router-link v-if="!e.is_dir" :to="e.path" class="sidebar-link" @click.stop>
          {{ e.name }}
        </router-link>
        <span v-else class="sidebar-label">{{ e.name }}</span>
      </div>
      <div v-if="e.is_dir && expanded.has(e.name)" class="sidebar-children">
        <router-link v-for="child in e.children" :key="child.name" :to="child.path"
          class="sidebar-child" :class="{ active: route.path === child.path }">
          {{ child.name }}
        </router-link>
        <router-link :to="e.path" class="sidebar-child sidebar-child-index"
          :class="{ active: route.path === e.path }">
          📖 概览
        </router-link>
      </div>
    </div>
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
.sidebar-section { margin-bottom: 2px; }
.sidebar-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 0.85rem;
  border-radius: 6px;
  cursor: pointer;
  color: var(--text-dim);
  transition: background .15s;
}
.sidebar-item:hover { background: var(--surface); color: var(--text); }
.sidebar-item.active { color: var(--accent); font-weight: 600; }
.sidebar-icon { font-size: 0.85rem; flex-shrink: 0; }
.sidebar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-link {
  color: inherit;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sidebar-link:hover { text-decoration: none; color: var(--accent); }
.sidebar-children { padding-left: 8px; margin: 2px 0 4px; border-left: 1px solid var(--border); }
.sidebar-child {
  display: block;
  padding: 3px 12px;
  font-size: 0.82rem;
  color: var(--text-dim);
  text-decoration: none;
  border-radius: 4px;
}
.sidebar-child:hover { background: var(--surface); color: var(--text); }
.sidebar-child.active { color: var(--accent); font-weight: 600; }
.sidebar-child-index { font-size: 0.78rem; font-style: italic; }
</style>
