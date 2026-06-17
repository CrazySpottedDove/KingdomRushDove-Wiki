<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import WikiSidebar from '../components/WikiSidebar.vue'

marked.setOptions({ gfm: true, breaks: false })

const route = useRoute()
const content = ref('')
const loading = ref(true)
const notFound = ref(false)
const error = ref('')

const pageTitle = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  if (parts.length <= 1) return 'Wiki 首页'
  return parts[parts.length - 1]
})

function resolveMdPath(): string[] {
  const parts = route.path.split('/').filter(Boolean)
  // Remove the first segment ('wiki')
  const relParts = parts.slice(1)
  if (relParts.length === 0) return ['index.md']
  // Build candidate paths
  const joined = relParts.join('/')
  return [
    `${joined}.md`,        // e.g. towers/archer.md
    `${joined}/index.md`,  // e.g. towers/archer/index.md
  ]
}

async function fetchPage() {
  loading.value = true
  notFound.value = false
  error.value = ''

  const candidates = resolveMdPath()
  for (const candidate of candidates) {
    try {
      const resp = await fetch(`/static/wiki/${candidate}`)
      if (resp.ok) {
        const md = await resp.text()
        let html = marked.parse(md) as string
        if (DOMPurify) html = DOMPurify.sanitize(html)
        content.value = html
        loading.value = false
        return
      }
    } catch { /* continue */ }
  }

  notFound.value = true
  loading.value = false
}

watch(() => route.path, fetchPage, { immediate: true })
</script>

<template>
  <div class="wiki-layout">
    <WikiSidebar />
    <main class="wiki-content">
      <div v-if="loading" class="loading">加载中…</div>
      <div v-else-if="notFound" class="not-found">
        <h2>📄 页面未找到</h2>
        <p>Wiki 中不存在此页面。</p>
        <router-link to="/wiki" class="btn btn-primary" style="margin-top:16px;display:inline-block">← 返回 Wiki 首页</router-link>
      </div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else class="md-body" v-html="content"></div>
    </main>
  </div>
</template>

<style scoped>
.wiki-layout {
  max-width: min(1400px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 0 16px 60px;
  display: flex;
  gap: 32px;
}
.wiki-content {
  flex: 1;
  min-width: 0;
  max-width: 900px;
}
.loading, .not-found, .error {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-dim);
}
.not-found h2 { color: #fff; margin-bottom: 12px; }
.md-body { line-height: 1.8; }
.md-body :deep(h1) { font-size: 1.8rem; color: #fff; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin: 0 0 24px; }
.md-body :deep(h2) { font-size: 1.35rem; color: #fff; border-left: 4px solid var(--accent); padding-left: 12px; margin: 40px 0 16px; }
.md-body :deep(h3) { font-size: 1.05rem; color: var(--accent); margin: 24px 0 10px; }
.md-body :deep(h4) { font-size: 0.95rem; color: var(--accent2); margin: 16px 0 8px; }
.md-body :deep(p) { margin-bottom: 1em; }
.md-body :deep(ul), .md-body :deep(ol) { padding-left: 1.5em; margin-bottom: 1em; }
.md-body :deep(li) { margin: 4px 0; }
.md-body :deep(blockquote) { border-left: 4px solid var(--border); margin: 16px 0; padding: 8px 16px; color: var(--text-dim); background: var(--surface); border-radius: 0 6px 6px 0; }
.md-body :deep(table) { margin: 16px 0; width: 100%; border-collapse: collapse; }
.md-body :deep(th), .md-body :deep(td) { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
.md-body :deep(th) { background: var(--surface); color: #fff; font-weight: 600; }
.md-body :deep(img) { max-width: 100%; border-radius: 6px; border: 1px solid var(--border); display: block; margin: 16px auto; }
.md-body :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
.md-body :deep(a) { color: var(--accent); }
.md-body :deep(code) { font-family: "Fira Code", "Cascadia Code", "Consolas", monospace; font-size: 0.875rem; background: var(--code-bg); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; color: #ffa8a8; }
.md-body :deep(pre) { font-family: "Fira Code", "Cascadia Code", "Consolas", monospace; font-size: 0.875rem; background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin: 12px 0 18px; line-height: 1.6; }
.md-body :deep(pre code) { background: none; border: none; padding: 0; color: #ced4da; }
</style>
