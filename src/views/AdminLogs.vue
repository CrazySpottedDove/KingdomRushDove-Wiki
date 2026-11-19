<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { t } from '../i18n'

type LogKind = 'out' | 'err' | 'check-dev' | 'check-master'

interface LogResponse {
  kind: string
  path: string
  date: string
  dates: string[]
  size: number
  content: string
  truncated: boolean
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
let timer: number | undefined

const isCheckLog = computed(() => kind.value.startsWith('check'))
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

onMounted(load)
onUnmounted(stopTimer)
</script>

<template>
  <div class="page-wrap" style="max-width:1200px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>🗒 {{ t('logs.title') }}</h1>
      <p>{{ t('logs.subtitle') }}</p>
    </header>

    <div class="btn-group" style="margin:16px 0 8px">
      <button class="btn" :class="{ active: kind === 'out' }" @click="setKind('out')">{{ t('logs.kind.out') }}</button>
      <button class="btn" :class="{ active: kind === 'err' }" @click="setKind('err')">{{ t('logs.kind.err') }}</button>
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

    <pre v-if="data" class="log-view">{{ data.content || t('logs.empty') }}</pre>
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
</style>
