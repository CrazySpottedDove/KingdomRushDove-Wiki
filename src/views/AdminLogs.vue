<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { t } from '../i18n'

type LogKind = 'out' | 'err' | 'metrics' | 'check-dev' | 'check-master'

interface LogResponse {
  kind: string
  path: string
  date: string
  dates: string[]
  size: number
  content: string
  truncated: boolean
}

interface MetricsStage {
  count: number
  total_ms: number
  max_ms: number
}

interface MetricsRecord {
  timestamp: number
  requests: number
  response_bytes: number
  download_requests: number
  download_wait_ms: number
  request_time_ms: number
  file_cache_hits: number
  file_cache_misses: number
  bundle_cache_hits: number
  bundle_cache_misses: number
  stages?: Record<string, MetricsStage>
}

interface CheckProgress {
  branch: string
  log: string
  total: number
  total_known: boolean
  done: number
  passed: number
  failed: number
  running: boolean
  updated_ago_secs: number
  current: string
  failures: string[]
}

const auth = useAuthStore()
const kind = ref<LogKind>('out')
const date = ref('')
const lines = ref(200)
const data = ref<LogResponse | null>(null)
const loading = ref(false)
const error = ref('')
const adminTokenInput = ref('')
const adminSubmitting = ref(false)
const adminError = ref('')
const autoRefresh = ref(false)
const devProgress = ref<CheckProgress | null>(null)
const masterProgress = ref<CheckProgress | null>(null)
let timer: number | undefined
let progressTimer: number | undefined

const isCheckLog = computed(() => kind.value.startsWith('check'))
const metrics = computed(() => {
  if (kind.value !== 'metrics' || !data.value) return null
  const records = data.value.content
    .split('\n')
    .map(line => {
      try { return JSON.parse(line) as MetricsRecord } catch { return null }
    })
    .filter((record): record is MetricsRecord => record !== null)
  const latest = records.length ? records[records.length - 1] : null
  const stages = new Map<string, MetricsStage>()
  for (const record of records) {
    for (const [name, stage] of Object.entries(record.stages || {})) {
      const current = stages.get(name) || { count: 0, total_ms: 0, max_ms: 0 }
      current.count += stage.count
      current.total_ms += stage.total_ms
      current.max_ms = Math.max(current.max_ms, stage.max_ms)
      stages.set(name, current)
    }
  }
  return {
    latest,
    stages: [...stages.entries()]
      .map(([name, stage]) => ({ name, ...stage, avg_ms: stage.count ? stage.total_ms / stage.count : 0 }))
      .sort((a, b) => b.total_ms - a.total_ms),
  }
})
const downloadUrl = computed(() => {
  if (!data.value) return '#'
  let url = `/api/admin/logs/download?kind=${kind.value}`
  if (!isCheckLog.value) url += `&date=${date.value}`
  return url
})
const lineOptions = [100, 200, 500, 1000, 2000]

function fmtBytes(bytes: number): string {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let v = bytes
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024
    i++
  }
  return `${v.toFixed(v >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function kindLabel(): string {
  if (kind.value === 'err') return t('logs.kind.err')
  if (kind.value === 'metrics') return t('logs.kind.metrics')
  if (kind.value === 'check-dev') return t('logs.kind.check_dev')
  if (kind.value === 'check-master') return t('logs.kind.check_master')
  return t('logs.kind.out')
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    let url = `/api/admin/logs?kind=${kind.value}&lines=${lines.value}`
    if (!isCheckLog.value && date.value) url += `&date=${date.value}`

    const resp = await fetch(url)
    if (!resp.ok) {
      if (resp.status === 404) {
        error.value = t('logs.missing')
      } else {
        error.value = t('common.load_failed')
      }
      data.value = null
      return
    }
    const result: LogResponse = await resp.json()
    data.value = result
    if (!isCheckLog.value && !date.value) date.value = result.date
  } catch {
    error.value = t('common.network_error')
  } finally {
    loading.value = false
  }
}

async function deleteLog() {
  if (!auth.adminToken || !data.value) return
  const when = isCheckLog.value ? data.value.path : date.value
  const label = `${kindLabel()} ${when}`
  if (!window.confirm(t('logs.delete_confirm', { target: label }))) return
  loading.value = true
  error.value = ''
  try {
    let url = `/api/admin/logs?kind=${kind.value}`
    if (!isCheckLog.value) url += `&date=${date.value}`
    const resp = await fetch(url, {
      method: 'DELETE',
      headers: auth.adminHeaders(),
    })
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearAdminToken()
        error.value = t('traffic.bad_token')
      } else {
        error.value = t('logs.delete_failed')
      }
      return
    }
    await load()
  } catch {
    error.value = t('common.network_error')
  } finally {
    loading.value = false
  }
}

async function submitAdmin() {
  const token = adminTokenInput.value.trim()
  if (!token) {
    adminError.value = t('traffic.token_required')
    return
  }
  adminSubmitting.value = true
  adminError.value = ''
  try {
    const resp = await fetch('/api/admin/traffic?hours=1&days=1', {
      headers: { 'X-Admin-Token': token },
    })
    if (!resp.ok) {
      adminError.value = resp.status === 401 ? t('traffic.bad_token') : t('common.load_failed')
      return
    }
    auth.setAdminToken(token)
    adminTokenInput.value = ''
    await load()
  } catch {
    adminError.value = t('common.network_error')
  } finally {
    adminSubmitting.value = false
  }
}

function setKind(v: LogKind) {
  kind.value = v
  if (v.startsWith('check')) date.value = ''
  load()
}

function setLines(v: number) {
  lines.value = v
  load()
}

function toggleAuto() {
  autoRefresh.value = !autoRefresh.value
  stopTimer()
  if (autoRefresh.value) {
    timer = window.setInterval(load, 5000)
  }
}

function stopTimer() {
  if (timer !== undefined) {
    window.clearInterval(timer)
    timer = undefined
  }
}

async function loadProgress() {
  try {
    const [dev, master] = await Promise.all([
      fetch('/api/admin/logs/progress?branch=dev').then(r => r.ok ? r.json() : null),
      fetch('/api/admin/logs/progress?branch=master').then(r => r.ok ? r.json() : null),
    ])
    devProgress.value = dev
    masterProgress.value = master
  } catch {
    // progress is best-effort
  }
}

function progressPct(p: CheckProgress | null): number {
  return p && p.total_known && p.total > 0 ? Math.min(100, Math.round(p.done * 100 / p.total)) : 0
}

onMounted(() => {
  load()
  loadProgress()
  progressTimer = window.setInterval(loadProgress, 10000)
})
onUnmounted(() => {
  stopTimer()
  if (progressTimer !== undefined) window.clearInterval(progressTimer)
})
</script>

<template>
  <div class="page-wrap" style="max-width:1200px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>🗒 {{ t('logs.title') }}</h1>
      <p>{{ t('logs.subtitle') }}</p>
    </header>

    <section class="progress-grid">
      <div v-for="(p, i) in [devProgress, masterProgress]" :key="i" class="progress-card">
        <div class="progress-head">
          <strong>{{ t('logs.progress.title') }} · {{ p?.branch || '—' }}</strong>
          <span :class="{ running: p?.running }">
            {{ p?.running ? t('logs.progress.running') : t('logs.progress.idle') }}
          </span>
        </div>
        <template v-if="p && p.done > 0">
          <div v-if="p.total_known" class="progress-bar"><div :style="{ width: progressPct(p) + '%' }"></div></div>
          <div class="progress-meta">
            <template v-if="p.total_known">{{ t('logs.progress.count', { done: p.done, total: p.total }) }}</template>
            <template v-else>{{ t('logs.progress.recorded', { done: p.done }) }}</template>
            · PASS {{ p.passed }} · FAIL {{ p.failed }}
          </div>
          <div v-if="p.current" class="progress-current">{{ t('logs.progress.current') }}: {{ p.current }}</div>
          <div v-for="f in p.failures.slice(-3)" :key="f" class="progress-fail">{{ f }}</div>
        </template>
        <div v-else class="progress-current">{{ t('logs.progress.none') }}</div>
      </div>
    </section>

    <div class="btn-group" style="margin:16px 0 8px">
      <button class="btn" :class="{ active: kind === 'out' }" @click="setKind('out')">{{ t('logs.kind.out') }}</button>
      <button class="btn" :class="{ active: kind === 'err' }" @click="setKind('err')">{{ t('logs.kind.err') }}</button>
      <button class="btn" :class="{ active: kind === 'metrics' }" @click="setKind('metrics')">{{ t('logs.kind.metrics') }}</button>
      <span style="width:16px"></span>
      <button class="btn" :class="{ active: kind === 'check-dev' }" @click="setKind('check-dev')">{{ t('logs.kind.check_dev') }}</button>
      <button class="btn" :class="{ active: kind === 'check-master' }" @click="setKind('check-master')">{{ t('logs.kind.check_master') }}</button>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;align-items:center">
      <div v-if="!isCheckLog && data" class="btn-group">
        <span style="font-size:.9rem;color:var(--text-dim)">{{ t('logs.date') }}</span>
        <select v-model="date" class="log-date" @change="load">
          <option v-for="(d, i) in data.dates" :key="d" :value="d">
            {{ i === 0 ? t('logs.today') : d }}
          </option>
        </select>
      </div>
      <div class="btn-group">
        <button
          v-for="n in lineOptions"
          :key="n"
          class="btn"
          :class="{ active: lines === n }"
          @click="setLines(n)"
        >{{ t('logs.last_lines', { count: n }) }}</button>
      </div>
      <button class="btn btn-primary" :disabled="loading" @click="load">{{ t('common.refresh') }}</button>
      <a v-if="data" class="btn" :href="downloadUrl" download>{{ t('logs.download') }}</a>
      <button class="btn" :class="{ active: autoRefresh }" @click="toggleAuto">{{ t('logs.auto_refresh') }}</button>
      <button v-if="auth.isAdmin" class="btn btn-danger" :disabled="loading" @click="deleteLog">{{ t('logs.delete') }}</button>
      <span v-if="data" style="color:var(--text-dim);font-size:.9rem">
        <code>{{ data.path }}</code> · {{ t('logs.size', { size: fmtBytes(data.size) }) }}
        <template v-if="data.truncated"> · {{ t('logs.truncated') }}</template>
      </span>
    </div>

    <div v-if="!auth.isAdmin" class="admin-bar">
      <span>{{ t('logs.admin_hint') }}</span>
      <input
        v-model="adminTokenInput"
        type="password"
        :placeholder="t('store.admin.token_placeholder')"
        @keydown.enter="submitAdmin"
      />
      <button class="btn" :disabled="adminSubmitting" @click="submitAdmin">
        {{ adminSubmitting ? t('traffic.auth.submitting') : t('store.admin.confirm') }}
      </button>
      <span v-if="adminError" style="color:var(--danger)">{{ adminError }}</span>
    </div>

    <div v-if="error" class="notice" style="margin:12px 0;color:var(--danger)">{{ error }}</div>
    <div v-if="loading && !data" style="padding:40px;text-align:center;color:var(--text-dim)">{{ t('common.loading') }}</div>

    <section v-if="metrics" class="metrics-view">
      <div v-if="metrics.latest" class="metrics-cards">
        <div class="metric-card"><span>请求数</span><strong>{{ metrics.latest.requests }}</strong></div>
        <div class="metric-card"><span>响应流量</span><strong>{{ fmtBytes(metrics.latest.response_bytes) }}</strong></div>
        <div class="metric-card"><span>下载请求</span><strong>{{ metrics.latest.download_requests }}</strong></div>
        <div class="metric-card"><span>限流等待</span><strong>{{ metrics.latest.download_wait_ms }} ms</strong></div>
      </div>
      <table class="metrics-table">
        <thead><tr><th>阶段</th><th>次数</th><th>总耗时</th><th>平均耗时</th><th>最大耗时</th></tr></thead>
        <tbody>
          <tr v-for="stage in metrics.stages" :key="stage.name">
            <td><code>{{ stage.name }}</code></td>
            <td>{{ stage.count }}</td>
            <td>{{ stage.total_ms.toFixed(0) }} ms</td>
            <td>{{ stage.avg_ms.toFixed(1) }} ms</td>
            <td>{{ stage.max_ms }} ms</td>
          </tr>
          <tr v-if="!metrics.stages.length"><td colspan="5">暂无阶段数据</td></tr>
        </tbody>
      </table>
    </section>
    <pre v-else-if="data" class="log-view">{{ data.content || t('logs.empty') }}</pre>
  </div>
</template>

<style scoped>
.btn-group { display: inline-flex; gap: 6px; flex-wrap: wrap; align-items: center; }
.btn.active {
  border-color: var(--accent);
  background: #2a2b31;
  color: #fff;
}
.log-date {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.admin-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin: 8px 0 12px;
  color: var(--text-dim);
  font-size: .9rem;
}
.admin-bar input {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
}
.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 12px;
  margin: 16px 0 8px;
}
.progress-card {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface);
}
.progress-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}
.progress-head .running { color: var(--accent); }
.progress-bar {
  height: 8px;
  border-radius: 999px;
  background: #2a2b31;
  overflow: hidden;
}
.progress-bar > div {
  height: 100%;
  background: var(--accent);
  transition: width .3s ease;
}
.progress-meta, .progress-current, .progress-fail {
  margin-top: 8px;
  font-size: .85rem;
  color: var(--text-dim);
}
.progress-fail { color: var(--danger); }
.log-view {
  margin: 12px 0 0;
  padding: 14px;
  max-height: 70vh;
  overflow: auto;
  background: #101114;
  border: 1px solid var(--border);
  border-radius: 10px;
  color: #d9dee8;
  font-size: .82rem;
  line-height: 1.45;
  white-space: pre-wrap;
  word-break: break-word;
}
.metrics-view { margin-top: 12px; }
.metrics-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; margin-bottom: 14px; }
.metric-card { padding: 12px; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); }
.metric-card span { display: block; color: var(--text-dim); font-size: .82rem; }
.metric-card strong { display: block; margin-top: 5px; font-size: 1.2rem; }
.metrics-table { width: 100%; border-collapse: collapse; background: var(--surface); }
.metrics-table th, .metrics-table td { padding: 9px 10px; border-bottom: 1px solid var(--border); text-align: right; }
.metrics-table th:first-child, .metrics-table td:first-child { text-align: left; }
</style>
