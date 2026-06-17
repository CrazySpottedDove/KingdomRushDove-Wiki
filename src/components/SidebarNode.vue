<script setup lang="ts">
import { useRoute } from 'vue-router'

export interface WikiEntry {
  name: string
  title: string
  path: string
  is_dir: boolean
  children: WikiEntry[]
}

defineProps<{
  entry: WikiEntry
  depth: number
  expanded: Set<string>
}>()

const emit = defineEmits<{
  toggle: [name: string]
}>()

const route = useRoute()

function isActive(path: string) {
  return route.path === path || route.path.startsWith(path + '/')
}
</script>

<template>
  <div>
    <template v-if="entry.is_dir">
      <div
        class="sidebar-item"
        :class="{ active: isActive(entry.path), expanded: expanded.has(entry.name) }"
        :style="{ paddingLeft: depth * 12 + 12 + 'px' }"
        @click="emit('toggle', entry.name)"
      >
        <span class="sidebar-icon">{{ expanded.has(entry.name) ? '📂' : '📁' }}</span>
        <span class="sidebar-label">{{ entry.title || entry.name }}</span>
      </div>
      <div v-if="expanded.has(entry.name)" class="sidebar-children">
        <router-link
          :to="entry.path"
          class="sidebar-child sidebar-child-index"
          :class="{ active: route.path === entry.path }"
        >
          📖 概览
        </router-link>
        <SidebarNode
          v-for="c in entry.children"
          :key="c.name"
          :entry="c"
          :depth="depth + 1"
          :expanded="expanded"
          @toggle="emit('toggle', $event)"
        />
      </div>
    </template>
    <router-link
      v-else
      :to="entry.path"
      class="sidebar-item sidebar-link-item"
      :style="{ paddingLeft: depth * 12 + 12 + 'px' }"
      :class="{ active: route.path === entry.path }"
    >
      <span class="sidebar-icon">📄</span>
      {{ entry.title || entry.name }}
    </router-link>
  </div>
</template>

<style scoped>
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
.sidebar-link-item { text-decoration: none; cursor: pointer; }
.sidebar-icon { font-size: 0.85rem; flex-shrink: 0; }
.sidebar-label { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
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
