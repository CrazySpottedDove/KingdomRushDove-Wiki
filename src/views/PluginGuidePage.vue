<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

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

const content = ref('')
const tocItems = ref<{ id: string; text: string }[]>([])
const loading = ref(true)
const notFound = ref(false)

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

async function fetchGuide() {
  loading.value = true
  notFound.value = false

  try {
    const resp = await fetch('/static/wiki/plugin_guide.md')
    if (!resp.ok) {
      notFound.value = true
      loading.value = false
      return
    }

    const md = await resp.text()
    let html = marked.parse(md) as string
    html = DOMPurify.sanitize(html, { ADD_ATTR: ['id'] })

    content.value = html
    loading.value = false

    const toc: { id: string; text: string }[] = []
    const h2Regex = /<h2\s+id="([^"]*)"[^>]*>([^<]+)<\/h2>/g
    let match
    while ((match = h2Regex.exec(html)) !== null) {
      toc.push({ id: match[1], text: match[2].replace(/^\d+\.\s*/, '') })
    }
    tocItems.value = toc
  } catch {
    notFound.value = true
    loading.value = false
  }
}

onMounted(fetchGuide)
</script>

<template>
  <div class="page-wrap">
    <header>
      <h1>模组（Mod）开发文档</h1>
      <p>KingdomRushDove · 最后更新：2026</p>
    </header>

    <nav v-if="tocItems.length" class="toc">
      <h2>目录</h2>
      <ol>
        <li v-for="item in tocItems" :key="item.id">
          <a :href="'#' + item.id">{{ item.text }}</a>
        </li>
      </ol>
    </nav>

    <div v-if="loading" class="loading">加载中…</div>
    <div v-else-if="notFound" class="loading">文档加载失败</div>
    <div v-else class="md-body" v-html="content"></div>
  </div>
</template>

<style scoped>
.loading {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-dim);
}

/* TOC */
nav.toc {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px 24px;
  margin-bottom: 36px;
}
nav.toc h2 {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-dim);
  margin-bottom: 10px;
}
nav.toc ol {
  padding-left: 20px;
}
nav.toc li {
  margin: 4px 0;
  font-size: 0.9rem;
}

/* Syntax token colors */
:deep(.kw) { color: #cc99cd; }
:deep(.fn) { color: #6fb3d2; }
:deep(.str) { color: #7ec699; }
:deep(.cmt) { color: #616e88; font-style: italic; }
:deep(.num) { color: #f08d49; }

/* Directory tree */
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

/* Callout boxes */
:deep(.callout) {
  border-radius: 8px;
  padding: 14px 18px;
  margin: 12px 0;
  line-height: 1.7;
}
:deep(.callout.info) {
  background: #1a2f4a;
  border: 1px solid var(--accent);
}
:deep(.callout.warn) {
  background: #3d2e1a;
  border: 1px solid #e6a817;
}
:deep(.callout.tip) {
  background: #1a3d2b;
  border: 1px solid var(--accent2);
}
:deep(.callout b) {
  color: #fff;
}

/* Markdown body */
:deep(.md-body) { line-height: 1.8; }
:deep(.md-body h1) { font-size: 1.8rem; color: #fff; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin: 0 0 24px; }
:deep(.md-body h2) { font-size: 1.4rem; color: #fff; border-left: 4px solid var(--accent); padding-left: 12px; margin: 40px 0 16px; }
:deep(.md-body h3) { font-size: 1.05rem; color: var(--accent); margin: 24px 0 10px; }
:deep(.md-body h4) { font-size: 0.95rem; color: var(--accent2); margin: 16px 0 8px; }
:deep(.md-body p) { margin-bottom: 1em; }
:deep(.md-body ul), :deep(.md-body ol) { padding-left: 1.5em; margin-bottom: 1em; }
:deep(.md-body li) { margin: 4px 0; }
:deep(.md-body blockquote) { border-left: 4px solid var(--border); margin: 16px 0; padding: 8px 16px; color: var(--text-dim); background: var(--surface); border-radius: 0 6px 6px 0; }
:deep(.md-body table) { margin: 16px 0; width: 100%; border-collapse: collapse; }
:deep(.md-body th), :deep(.md-body td) { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
:deep(.md-body th) { background: var(--surface); color: #fff; font-weight: 600; }
:deep(.md-body img) { max-width: 100%; border-radius: 6px; border: 1px solid var(--border); display: block; margin: 16px auto; }
:deep(.md-body hr) { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
:deep(.md-body a) { color: var(--accent); }
:deep(.md-body code) { font-family: "Fira Code", "Cascadia Code", "Consolas", monospace; font-size: 0.875rem; background: var(--code-bg); border: 1px solid var(--border); border-radius: 4px; padding: 1px 6px; color: #ffa8a8; }
:deep(.md-body pre) { font-family: "Fira Code", "Cascadia Code", "Consolas", monospace; font-size: 0.875rem; background: var(--code-bg); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; overflow-x: auto; margin: 12px 0 18px; line-height: 1.6; }
:deep(.md-body pre code) { background: none; border: none; padding: 0; color: #ced4da; }
</style>
