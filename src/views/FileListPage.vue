<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { escHtml } from '../utils/markdown'

interface FileEntry {
  name: string
  is_dir: boolean
  size: number
  size_str: string
  icon: string
  modified: string
}

interface DirListing {
  path: string
  section: string
  entries: FileEntry[]
  tip: string | null
  breadcrumbs: [string, string][]
  is_root: boolean
  parent_url: string | null
}

const route = useRoute()
const router = useRouter()
const listing = ref<DirListing | null>(null)
const loading = ref(true)
const error = ref('')

const isAssets = computed(() => route.path.startsWith('/_assets'))
const apiBase = computed(() => isAssets.value ? '/api/assets/list' : '/api/files/list')
const sectionTitle = computed(() => isAssets.value ? '🎨 美术资源' : '📦 下载')

async function fetchList(subdir = '') {
  loading.value = true
  error.value = ''
  try {
    const params = subdir ? `?path=${encodeURIComponent(subdir)}` : ''
    const resp = await fetch(`${apiBase.value}${params}`)
    if (!resp.ok) { error.value = '加载失败'; return }
    listing.value = await resp.json()
  } catch { error.value = '网络错误' }
  loading.value = false
}

function navigateTo(name: string, isDir: boolean) {
  if (!isDir) return
  const currentPath = listing.value?.path || ''
  const newPath = currentPath ? `${currentPath}/${name}` : name
  router.push(`${route.path}?path=${encodeURIComponent(newPath)}`)
}

function goParent() {
  if (!listing.value?.parent_url) return
  const parentPath = listing.value.path.includes('/')
    ? listing.value.path.substring(0, listing.value.path.lastIndexOf('/'))
    : ''
  if (parentPath) router.push(`${route.path}?path=${encodeURIComponent(parentPath)}`)
  else router.push(route.path)
}

watch(() => route.query.path, (path) => {
  fetchList(path as string || '')
}, { immediate: true })

onMounted(() => {
  fetchList(route.query.path as string || '')
})
</script>

<template>
  <div class="page-wrap">
    <header>
      <div class="crumbs">
        <template v-if="listing?.breadcrumbs.length">
          <template v-for="(crumb, i) in listing.breadcrumbs" :key="i">
            <span v-if="i > 0" class="sep"> › </span>
            <span v-if="i === listing.breadcrumbs.length - 1" class="cur">{{ crumb[0] }}</span>
            <a v-else :href="crumb[1]">{{ crumb[0] }}</a>
          </template>
        </template>
      </div>
      <h1>{{ listing?.path || sectionTitle }}</h1>
    </header>

    <div v-if="listing?.tip" class="notice" v-html="listing.tip"></div>

    <div v-if="loading" style="text-align:center;padding:40px;color:var(--text-dim)">加载中…</div>
    <div v-else-if="error" style="text-align:center;padding:40px;color:var(--danger)">{{ error }}</div>
    <table v-else-if="listing">
      <thead>
        <tr><th></th><th>名称</th><th>大小</th><th>修改时间</th></tr>
      </thead>
      <tbody>
        <tr v-if="!listing.is_root" @click="goParent" style="cursor:pointer">
          <td class="ic">📁</td>
          <td><a href="javascript:void(0)"><em>..</em></a></td>
          <td>—</td><td></td>
        </tr>
        <tr v-for="e in listing.entries" :key="e.name"
          :style="e.is_dir ? 'cursor:pointer' : ''"
          @click="e.is_dir && navigateTo(e.name, true)">
          <td class="ic">{{ e.icon }}</td>
          <td>
            <template v-if="e.is_dir">
              <a href="javascript:void(0)" @click="navigateTo(e.name, true)">{{ escHtml(e.name) }}</a>
            </template>
            <template v-else>
              <a :href="'/' + (isAssets ? '_assets' : 'files') + (listing.path ? '/' + listing.path + '/' + encodeURIComponent(e.name) : '/' + encodeURIComponent(e.name))">{{ escHtml(e.name) }}</a>
            </template>
          </td>
          <td>{{ e.size_str }}</td>
          <td>{{ e.modified }}</td>
        </tr>
        <tr v-if="listing.entries.length === 0">
          <td colspan="4" style="text-align:center;color:var(--text-dim);padding:24px">（此目录为空）</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.page-wrap { max-width: 900px; }
.crumbs { font-size: .9rem; color: var(--text-dim); margin-bottom: 6px; }
.crumbs a { color: var(--accent); }
.sep { margin: 0 6px; color: var(--border); }
.cur { color: var(--text); }
:deep(table) { margin: 0; font-size: .9rem; }
:deep(th) { border-left: none; border-right: none; border-top: none; border-bottom: 2px solid var(--border); }
:deep(td) { border-left: none; border-right: none; border-top: none; }
:deep(tr:last-child td) { border-bottom: none; }
:deep(tr:nth-child(even) td) { background: transparent; }
:deep(tr:hover td) { background: #1e2025; }
:deep(.ic) { width: 28px; font-size: 1rem; }
:deep(td:nth-child(3)) { color: var(--text-dim); white-space: nowrap; text-align: right; padding-right: 20px; }
:deep(td:nth-child(4)) { color: var(--text-dim); white-space: nowrap; font-size: .82rem; }
:deep(th:nth-child(3)) { text-align: right; padding-right: 20px; }
</style>
