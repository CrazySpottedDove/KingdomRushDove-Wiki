<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { escHtml } from '../utils/markdown'

interface Commit {
  hash: string
  author: string
  date: string
  message: string
}

const page = ref(1)
const PER_PAGE = 30
const VISIBLE_PAGES = 7
const list = ref<Commit[]>([])
const maxKnownPage = ref(1)
const hasMore = ref(false)
const loading = ref(true)

const totalPages = computed(() => maxKnownPage.value)

const pageButtons = computed(() => {
  const total = totalPages.value
  if (total <= 1) return [1]
  const buttons: (number | string)[] = []
  let start = Math.max(1, page.value - Math.floor(VISIBLE_PAGES / 2))
  let end = Math.min(total, start + VISIBLE_PAGES - 1)
  if (end - start < VISIBLE_PAGES - 1) start = Math.max(1, end - VISIBLE_PAGES + 1)
  if (start > 1) {
    buttons.push(1)
    if (start > 2) buttons.push('...')
  }
  for (let i = start; i <= end; i++) buttons.push(i)
  if (end < total) {
    if (end < total - 1) buttons.push('...')
    buttons.push(total)
  }
  return buttons
})

async function load() {
  loading.value = true
  const res = await fetch(`/commits_history?page=${page.value}&per_page=${PER_PAGE}`)
  const j = await res.json()
  hasMore.value = j.has_more
  if (hasMore.value && page.value >= maxKnownPage.value) maxKnownPage.value = page.value + 1
  list.value = j.commits
  loading.value = false
}

function goTo(n: number) {
  if (n < 1) return
  page.value = n
  if (page.value > maxKnownPage.value) maxKnownPage.value = page.value
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>

<template>
  <div class="page-wrap">
    <header>
      <h1>更新历史</h1>
      <p>master 分支提交记录</p>
    </header>

    <div id="list">
      <div v-if="loading" class="loading">加载中…</div>
      <div v-for="c in list" :key="c.hash" class="commit">
        <div class="commit-msg">{{ escHtml(c.message) }}</div>
        <div class="commit-meta">
          <span class="commit-hash">{{ c.hash.slice(0, 8) }}</span>
          <span>{{ escHtml(c.author) }}</span>
          <span>{{ escHtml(c.date) }}</span>
        </div>
      </div>
    </div>

    <div class="pagination">
      <button class="btn" :disabled="page <= 1" @click="goTo(page - 1)">‹ 上一页</button>
      <div id="page-nums">
        <template v-for="p in pageButtons" :key="p">
          <span v-if="p === '...'" style="color:var(--text-dim);padding:0 4px;line-height:2">…</span>
          <button v-else :class="['btn', { active: p === page }]" @click="goTo(p as number)">{{ p }}</button>
        </template>
      </div>
      <button class="btn" :disabled="!hasMore" @click="goTo(page + 1)">下一页 ›</button>
      <div class="jump-wrap">
        <label for="jump-input">跳转到</label>
        <input class="jump-input" id="jump-input" type="number" min="1" :value="page" @input="goTo(parseInt(($event.target as HTMLInputElement).value) || 1)" />
      </div>
      <span class="page-info">{{ hasMore ? `第 ${page} 页` : `第 ${page} 页（最后一页）` }}</span>
    </div>
  </div>
</template>

<style scoped>
.page-wrap { max-width: 820px; margin: 0 auto; padding: 0 16px 60px; }
#list { margin-bottom: 28px; }
.commit { border-bottom: 1px solid var(--border); padding: 12px 4px; }
.commit:last-child { border-bottom: none; }
.commit-msg { color: #e0e0e0; font-size: 0.93rem; margin-bottom: 3px; }
.commit-meta { font-size: 0.8rem; color: var(--text-dim); display: flex; gap: 12px; flex-wrap: wrap; }
.commit-hash { font-family: "Fira Code", Consolas, monospace; font-size: 0.8rem; background: #141517; border: 1px solid var(--border); border-radius: 4px; padding: 0 6px; color: var(--accent); }
.pagination { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-top: 8px; }
.jump-wrap { display: flex; align-items: center; gap: 6px; margin-left: 4px; }
.jump-input { width: 56px; text-align: center; min-width: unset; }
#page-nums { display: flex; gap: 6px; flex-wrap: wrap; }
.page-info { font-size: 0.85rem; color: var(--text-dim); margin-left: 4px; }
.loading { color: var(--text-dim); padding: 20px 0; font-size: 0.9rem; }
.btn.active { border-color: var(--accent); background: #1c3150; color: var(--accent); }
</style>
