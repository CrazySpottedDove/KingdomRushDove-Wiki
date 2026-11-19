<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { t } from '../i18n'

type LogKind = 'out' | 'err'

interface LogResponse {
  kind: string
  path: string
  size: number
  content: string
  truncated: boolean
}

const auth = useAuthStore()
const kind = ref<LogKind>('out')
const lines = ref(200)
const data = ref<LogResponse | null>(null)
const loading = ref(false)
const error = ref('')
const adminTokenInput = ref('')
const adminSubmitting = ref(false)
const autoRefresh = ref(false)
let timer: number | undefined

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

async function load() {
  if (!auth.adminToken) {
    await auth.restoreSession()
  }
  if (!auth.adminToken) {
    error.value = t('traffic.need_admin')
    data.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch(`/api/admin/logs?kind=${kind.value}&lines=${lines.value}`, {
      headers: auth.adminHeaders(),
    })
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearAdminToken()
        error.value = t('traffic.bad_token')
      } else if (resp.status === 404) {
        error.value = t('logs.missing')
      } else {
        error.value = t('common.load_failed')
      }
      data.value = null
      return
    }
    data.value = await resp.json()
  } catch {
    error.value = t('common.network_error')
  } finally {
    loading.value = false
  }
}

async function clearLog() {
  if (!auth.adminToken) return
  if (!window.confirm(t('logs.clear_confirm', { kind: t(`logs.kind.${kind.value}`) }))) return
  loading.value = true
  error.value = ''
  try {
    const resp = await fetch(`/api/admin/logs?kind=${kind.value}`, {
      method: 'DELETE',
      headers: auth.adminHeaders(),
    })
    if (!resp.ok) {
      error.value = resp.status === 401 ? t('traffic.bad_token') : t('logs.clear_failed')
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
    error.value = t('traffic.token_required')
    return
  }
  adminSubmitting.value = true
  error.value = ''
  auth.setAdminToken(token)
  adminTokenInput.value = ''
  await load()
  adminSubmitting.value = false
}

function setKind(v: LogKind) {
  kind.value = v
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

    <div v-if="!auth.isAdmin" class="admin-login" style="max-width:420px;margin:24px auto">
      <h2 style="margin-top:0">🔑 {{ t('traffic.auth.title') }}</h2>
      <p style="color:var(--text-dim);font-size:.9rem">{{ t('traffic.auth.hint') }}</p>
      <input
        v-model="adminTokenInput"
        type="password"
        :placeholder="t('traffic.auth.placeholder')"
        style="width:100%;box-sizing:border-box;margin:12px 0;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:#fff"
        @keydown.enter="submitAdmin"
      />
      <button class="btn btn-primary" style="width:100%" :disabled="adminSubmitting" @click="submitAdmin">
        {{ adminSubmitting ? t('traffic.auth.submitting') : t('traffic.auth.submit') }}
      </button>
      <div v-if="error" style="margin-top:12px;color:var(--danger);font-size:.9rem">{{ error }}</div>
    </div>

    <template v-if="auth.isAdmin">
      <div class="btn-group" style="margin:16px 0 8px">
        <button class="btn" :class="{ active: kind === 'out' }" @click="setKind('out')">{{ t('logs.kind.out') }}</button>
        <button class="btn" :class="{ active: kind === 'err' }" @click="setKind('err')">{{ t('logs.kind.err') }}</button>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:12px;margin:12px 0;align-items:center">
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
        <button class="btn btn-danger" :disabled="loading" @click="clearLog">{{ t('logs.clear') }}</button>
        <span v-if="data" style="color:var(--text-dim);font-size:.9rem">
          {{ t('logs.size', { size: fmtBytes(data.size) }) }}
          <template v-if="data.truncated"> · {{ t('logs.truncated') }}</template>
        </span>
      </div>

      <div v-if="error" class="notice" style="margin:12px 0;color:var(--danger)">{{ error }}</div>
      <div v-if="loading && !data" style="padding:40px;text-align:center;color:var(--text-dim)">{{ t('common.loading') }}</div>

      <pre v-if="data" class="log-view">{{ data.content || t('logs.empty') }}</pre>
    </template>
  </div>
</template>

<style scoped>
.btn-group { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.btn.active {
  border-color: var(--accent);
  background: #2a2b31;
  color: #fff;
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
