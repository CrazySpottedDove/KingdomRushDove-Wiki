<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { t } from '../i18n'
import BarChart from '../components/BarChart.vue'
import PaginationControls from '../components/PaginationControls.vue'

interface RankItem {
  entry: string
  name: string
  by: string
  delta: number
  downloads: number
}

interface TrendDay {
  date: string
  delta: number
}

interface Trend {
  entry: string
  name: string
  days: number
  total_delta: number
  downloads: number
  rank: number | null
  daily: TrendDay[]
}

const PAGE_SIZE = 50
const DAY_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const days = ref(7)
const page = ref(1)
const total = ref(0)
const items = ref<RankItem[]>([])
const loading = ref(false)
const failed = ref(false)

// Top 10 与列表走**同一个接口**（只换分页参数），保证图与表口径完全一致
const topItems = ref<RankItem[]>([])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))
const topBarItems = computed(() =>
  topItems.value.map((i) => ({ label: i.name, value: i.delta })),
)
const dailyBarItems = computed(() =>
  (trend.value?.daily ?? []).map((d) => ({ label: d.date.slice(5), value: d.delta })),
)

async function fetchRank(query: string): Promise<{ total: number; items: RankItem[] }> {
  const resp = await fetch(`/plugins/download_rank?${query}`)
  if (!resp.ok) throw new Error(String(resp.status))
  const data = await resp.json()
  return { total: data.total ?? 0, items: data.items ?? [] }
}

async function loadRank() {
  loading.value = true
  failed.value = false
  try {
    const [listed, top] = await Promise.all([
      fetchRank(`days=${days.value}&page=${page.value}&limit=${PAGE_SIZE}`),
      fetchRank(`days=${days.value}&page=1&limit=10`),
    ])
    items.value = listed.items
    total.value = listed.total
    topItems.value = top.items
  } catch {
    failed.value = true
    items.value = []
    topItems.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function setDays(next: number) {
  if (next === days.value) return
  days.value = next
  page.value = 1
  // 窗口变了，单插件查询的每日明细也要按新窗口重取
  if (trend.value) search()
  loadRank()
}

function setPage(next: number) {
  page.value = next
  loadRank()
}

// ── 单插件查询 ────────────────────────────────────────────────────────────────
const keyword = ref('')
const trend = ref<Trend | null>(null)
const trendLoading = ref(false)
const trendNotFound = ref(false)
const trendFailed = ref(false)

async function search() {
  const key = keyword.value.trim()
  if (!key) return
  trendLoading.value = true
  trendNotFound.value = false
  trendFailed.value = false
  trend.value = null
  try {
    const resp = await fetch(
      `/plugins/download_trend?key=${encodeURIComponent(key)}&days=${days.value}`,
    )
    if (resp.status === 404) {
      trendNotFound.value = true
      return
    }
    if (!resp.ok) throw new Error(String(resp.status))
    trend.value = await resp.json()
  } catch {
    trendFailed.value = true
  } finally {
    trendLoading.value = false
  }
}

onMounted(loadRank)

/** 榜上点插件名 = 就地查它的增量与每日明细（商店页不支持按 entry 深链，不做假承诺） */
function lookup(entry: string) {
  keyword.value = entry
  search()
}
</script>

<template>
  <section class="rank-page">
    <header class="rank-header">
      <h1>📈 {{ t('rank.title') }}</h1>
      <div class="window-picker">
        <span class="window-label">{{ t('rank.window') }}</span>
        <button
          v-for="d in DAY_OPTIONS"
          :key="d"
          class="btn-day"
          :class="{ active: d === days }"
          @click="setDays(d)"
        >
          {{ t('rank.days', { n: d }) }}
        </button>
      </div>
    </header>

    <p v-if="loading" class="rank-hint">{{ t('common.loading') }}</p>
    <p v-else-if="failed" class="rank-hint error">{{ t('rank.error') }}</p>

    <template v-else>
      <BarChart
        v-if="topBarItems.length > 0"
        :items="topBarItems"
        :title="t('rank.chart.title')"
        class="rank-chart"
      />

      <div class="rank-body">
        <div class="rank-table-wrap">
          <table class="rank-table">
            <thead>
              <tr>
                <th class="col-rank">{{ t('rank.table.rank') }}</th>
                <th>{{ t('rank.table.plugin') }}</th>
                <th>{{ t('rank.table.author') }}</th>
                <th class="col-num">{{ t('rank.table.delta') }}</th>
                <th class="col-num">{{ t('rank.table.downloads') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, i) in items" :key="item.entry">
                <td class="col-rank">{{ (page - 1) * PAGE_SIZE + i + 1 }}</td>
                <td>
                  <button class="link-btn" @click="lookup(item.entry)">{{ item.name }}</button>
                  <span class="entry">{{ item.entry }}</span>
                </td>
                <td>{{ item.by }}</td>
                <td class="col-num delta">+{{ item.delta }}</td>
                <td class="col-num">{{ item.downloads }}</td>
              </tr>
            </tbody>
          </table>
          <p v-if="items.length === 0" class="rank-hint">{{ t('rank.empty') }}</p>
        </div>

        <aside class="rank-query">
          <h2>{{ t('rank.query.title') }}</h2>
          <div class="query-row">
            <input
              type="search"
              v-model="keyword"
              :placeholder="t('rank.query.placeholder')"
              autocomplete="off"
              @keyup.enter="search()"
            />
            <button class="btn" @click="search()">{{ t('rank.query.button') }}</button>
          </div>

          <p v-if="trendLoading" class="rank-hint">{{ t('common.loading') }}</p>
          <p v-else-if="trendNotFound" class="rank-hint error">{{ t('rank.query.notfound') }}</p>
          <p v-else-if="trendFailed" class="rank-hint error">{{ t('rank.error') }}</p>

          <template v-else-if="trend">
            <p class="trend-name">{{ trend.name }}</p>
            <dl class="trend-stats">
              <div>
                <dt>{{ t('rank.query.total') }}</dt>
                <dd class="delta">+{{ trend.total_delta }}</dd>
              </div>
              <div>
                <dt>{{ t('rank.query.rank') }}</dt>
                <dd>{{ trend.rank ?? t('rank.query.rank_none') }}</dd>
              </div>
              <div>
                <dt>{{ t('rank.query.downloads') }}</dt>
                <dd>{{ trend.downloads }}</dd>
              </div>
            </dl>
            <BarChart :items="dailyBarItems" :title="t('rank.query.daily')" />
          </template>
        </aside>
      </div>

      <PaginationControls
        :model-value="page"
        :total-pages="totalPages"
        @update:model-value="setPage"
      />
    </template>
  </section>
</template>

<style scoped>
.rank-page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 20px 16px 48px;
}
.rank-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.rank-header h1 {
  margin: 0;
  font-size: 1.4rem;
}
.window-picker {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.window-label {
  color: var(--text-dim);
  font-size: 0.85rem;
  margin-right: 4px;
}
.btn-day {
  padding: 4px 10px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.82rem;
}
.btn-day:hover {
  border-color: var(--accent);
  color: var(--text);
}
.btn-day.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
}
.rank-chart {
  margin-bottom: 18px;
}
.rank-body {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 320px;
  gap: 18px;
  align-items: start;
}
@media (max-width: 860px) {
  .rank-body {
    grid-template-columns: minmax(0, 1fr);
  }
}
.rank-table-wrap {
  min-width: 0;
  overflow-x: auto;
}
.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}
.rank-table th,
.rank-table td {
  padding: 7px 8px;
  border-bottom: 1px solid var(--border);
  text-align: left;
}
.rank-table th {
  color: var(--text-dim);
  font-weight: 500;
  white-space: nowrap;
}
.col-rank {
  width: 3.5rem;
  color: var(--text-dim);
}
.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.delta {
  color: var(--accent2);
}
.entry {
  margin-left: 8px;
  color: var(--text-dim);
  font-size: 0.78rem;
}
/* 榜上的插件名：看起来像链接、点了就地查询，不带任何假跳转 */
.link-btn {
  padding: 0;
  border: none;
  background: none;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.link-btn:hover {
  text-decoration: underline;
}
.rank-query {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
.rank-query h2 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.query-row {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}
.query-row input {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--code-bg);
  color: var(--text);
}
.btn {
  padding: 6px 14px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--accent);
  color: #000;
  cursor: pointer;
}
.trend-name {
  margin: 0 0 8px;
  font-weight: 600;
}
.trend-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin: 0 0 14px;
}
.trend-stats dt {
  color: var(--text-dim);
  font-size: 0.78rem;
}
.trend-stats dd {
  margin: 2px 0 0;
  font-size: 1.05rem;
  font-variant-numeric: tabular-nums;
}
.rank-hint {
  color: var(--text-dim);
  font-size: 0.9rem;
}
.rank-hint.error {
  color: var(--danger);
}
.rank-query .bar-chart {
  border: none;
  padding: 0;
  background: transparent;
}
</style>
