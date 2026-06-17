<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

const content = ref('')
const loading = ref(true)
const error = ref('')

marked.setOptions({ gfm: true, breaks: false })
marked.use({
  renderer: (() => {
    const r = new marked.Renderer()
    r.image = function(token: any) {
      let href = typeof token === 'object' && token !== null ? token.href : token
      let title = typeof token === 'object' && token !== null ? token.title : arguments[1]
      let text = typeof token === 'object' && token !== null ? token.text : arguments[2]
      if (!/^(https?:\/\/|\/)/.test(href)) {
        href = '/static/' + href.replace(/^\.\//, '')
      }
      const t = title ? ` title="${title}"` : ''
      return `<img src="${href}" alt="${text}"${t}>`
    }
    return r
  })()
})

onMounted(async () => {
  try {
    const res = await fetch('/static/changelog.md')
    if (!res.ok) throw new Error('HTTP ' + res.status)
    const md = await res.text()
    content.value = DOMPurify ? DOMPurify.sanitize(marked.parse(md) as string) : (marked.parse(md) as string)
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page-wrap" style="max-width:860px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>改版介绍</h1>
      <p>KingdomRushDove · 版本说明与特性一览</p>
    </header>
    <div class="md-body">
      <div v-if="loading" class="loading">加载中…</div>
      <div v-else-if="error" class="error">⚠️ 加载失败：{{ error }}</div>
      <div v-else v-html="content"></div>
    </div>
  </div>
</template>

<style>
.md-body { line-height: 1.8; }
.md-body h1 { font-size: 1.8rem; color: #fff; border-bottom: 2px solid var(--border); padding-bottom: 10px; margin: 0 0 24px; }
.md-body h2 { font-size: 1.35rem; color: #fff; border-left: 4px solid var(--accent); padding-left: 12px; margin: 40px 0 16px; }
.md-body h3 { font-size: 1.05rem; color: var(--accent); margin: 24px 0 10px; }
.md-body h4 { font-size: 0.95rem; color: var(--accent2); margin: 16px 0 8px; }
.md-body p { margin-bottom: 1em; }
.md-body ul, .md-body ol { padding-left: 1.5em; margin-bottom: 1em; }
.md-body li { margin: 4px 0; }
.md-body blockquote { border-left: 4px solid var(--border); margin: 16px 0; padding: 8px 16px; color: var(--text-dim); background: var(--surface); border-radius: 0 6px 6px 0; }
.md-body table { margin: 16px 0; width: 100%; border-collapse: collapse; }
.md-body th, .md-body td { border: 1px solid var(--border); padding: 6px 12px; text-align: left; }
.md-body th { background: var(--surface); color: #fff; font-weight: 600; }
.md-body img { max-width: 100%; border-radius: 6px; border: 1px solid var(--border); display: block; margin: 16px auto; }
.md-body hr { border: none; border-top: 1px solid var(--border); margin: 32px 0; }
.md-body a { color: var(--accent); }
.loading { color: var(--text-dim); padding: 40px 0; text-align: center; }
.error { color: var(--danger); padding: 40px 0; text-align: center; }
</style>
