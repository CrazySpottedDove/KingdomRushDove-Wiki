<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import WikiSidebar from '../components/WikiSidebar.vue'

marked.setOptions({ gfm: true, breaks: false })

marked.use({
  renderer: {
    code({ text, lang }) {
      if (lang === 'tree') {
        const escaped = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
        return `<div class="tree">${escaped}</div>\n`
      }
      if (lang === 'lua') {
        return `<pre><code>${highlightLua(text)}</code></pre>\n`
      }
      const langClass = lang ? ` class="language-${lang}"` : ''
      return `<pre><code${langClass}>${escapedCode(text)}</code></pre>\n`
    }
  }
})

function highlightLua(code: string): string {
  let escaped = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  const out: string[] = []
  let i = 0

  while (i < escaped.length) {
    if (escaped.substring(i, i + 4) === '--[[') {
      const end = escaped.indexOf(']]', i + 4)
      if (end !== -1) {
        out.push(`<span class="cmt">${escaped.substring(i, end + 2)}</span>`)
        i = end + 2
        continue
      }
    }

    if (escaped.substring(i, i + 2) === '--') {
      const end = escaped.indexOf('\n', i)
      const comment = end !== -1 ? escaped.substring(i, end) : escaped.substring(i)
      out.push(`<span class="cmt">${comment}</span>`)
      i += comment.length
      continue
    }

    if (escaped[i] === '"' || escaped[i] === "'") {
      const quote = escaped[i]
      let j = i + 1
      while (j < escaped.length) {
        if (escaped[j] === '\\') { j += 2; continue }
        if (escaped[j] === quote) { j++; break }
        j++
      }
      out.push(`<span class="str">${escaped.substring(i, j)}</span>`)
      i = j
      continue
    }

    if (/\d/.test(escaped[i]) && (i === 0 || !/[a-zA-Z_]/.test(escaped[i - 1]))) {
      let j = i
      while (j < escaped.length && /[\d.eE+\-xXa-fA-F]/.test(escaped[j])) j++
      out.push(`<span class="num">${escaped.substring(i, j)}</span>`)
      i = j
      continue
    }

    if (/[a-zA-Z_]/.test(escaped[i])) {
      let j = i
      while (j < escaped.length && /[a-zA-Z0-9_]/.test(escaped[j])) j++
      const word = escaped.substring(i, j)
      const keywords = ['and', 'break', 'do', 'else', 'elseif', 'end', 'false', 'for', 'function', 'if', 'in', 'local', 'nil', 'not', 'or', 'repeat', 'return', 'then', 'true', 'until', 'while']
      if (keywords.includes(word)) {
        out.push(`<span class="kw">${word}</span>`)
      } else if (j < escaped.length && escaped[j] === '(') {
        out.push(`<span class="fn">${word}</span>`)
      } else {
        out.push(word)
      }
      i = j
      continue
    }

    out.push(escaped[i])
    i++
  }

  return out.join('')
}

function escapedCode(code: string): string {
  return code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

const route = useRoute()
const content = ref('')
const loading = ref(true)
const notFound = ref(false)
const error = ref('')

// Base path for relative images: same directory as the markdown file
// e.g. /wiki/heroes/gerald → /static/wiki/heroes/
const imgBase = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const relDir = parts.slice(1, -1).join('/')
  return relDir ? `/static/wiki/${relDir}/` : '/static/wiki/'
})

function fixImagePaths(html: string): string {
  return html.replace(/<img\s+src="(?!https?:\/\/|\/)([^"]+)"/gi, (_, src) => {
    return `<img src="${imgBase.value}${src}"`
  })
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
        html = fixImagePaths(html)
        content.value = html
        loading.value = false
        return
      }
    } catch { /* continue */ }
  }

  notFound.value = true
  loading.value = false
}

function resolveMdPath(): string[] {
  const parts = route.path.split('/').filter(Boolean)
  const relParts = parts.slice(1)
  if (relParts.length === 0) return ['index.md']
  const joined = relParts.join('/')
  return [
    `${joined}.md`,
    `${joined}/index.md`,
  ]
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

:deep(.kw) { color: #cc99cd; }
:deep(.fn) { color: #6fb3d2; }
:deep(.str) { color: #7ec699; }
:deep(.cmt) { color: #616e88; font-style: italic; }
:deep(.num) { color: #f08d49; }

:deep(.tree) {
  font-family: monospace;
  font-size: 0.875rem;
  background: var(--code-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 16px 20px;
  line-height: 1.8;
  color: #ced4da;
  margin: 12px 0 18px;
  white-space: pre-wrap;
}
</style>
