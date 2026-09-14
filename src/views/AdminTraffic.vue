<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import TrafficLineChart from '../components/TrafficLineChart.vue'
import { t, type MessageKey } from '../i18n'

interface InterfaceStat {
  interface: string
  count: number
  bytes: number
}

interface StatsResponse {
  hours: number
  days: number
  hourly: InterfaceStat[]
  daily: InterfaceStat[]
  hourly_total_count: number
  hourly_total_bytes: number
  daily_total_count: number
  daily_total_bytes: number
  current_concurrency: number
  peak_concurrency: number
  hourly_series: TimePoint[]
  daily_series: TimePoint[]
}

interface DisplayStat extends InterfaceStat {
  desc: string
}

interface TimePoint {
  bucket: string
  count: number
  bytes: number
}

const auth = useAuthStore()
const hours = ref(24)
const days = ref(7)
const loading = ref(false)
const error = ref('')
const data = ref<StatsResponse | null>(null)
const adminTokenInput = ref('')
const adminSubmitting = ref(false)
const chartMetric = ref<'count' | 'bytes'>('bytes')

const hourOptions = [1, 6, 12, 24]
const dayOptions = [1, 3, 7]

const interfaceDescriptions: Record<string, MessageKey> = {
  '/': 'traffic.route./',
  '/favicon.ico': 'traffic.route./favicon.ico',
  '/static': 'traffic.route./static',
  '/static/wiki': 'traffic.route./static/wiki',
  '/api/visits': 'traffic.route./api/visits',
  '/api/admin/traffic': 'traffic.route./api/admin/traffic',
  '/admin/traffic': 'traffic.route./admin/traffic',
  '/commits': 'traffic.route./commits',
  '/file': 'traffic.route./file',
  '/assets': 'traffic.route./assets',
  '/assets/upload': 'traffic.route./assets/upload',
  '/bundle/code': 'traffic.route./bundle/code',
  '/bundle/assets': 'traffic.route./bundle/assets',
  '/plugins': 'traffic.route./plugins',
  '/plugins/list': 'traffic.route./plugins/list',
  '/plugins/upload': 'traffic.route./plugins/upload',
  '/plugins/download/{filename}': 'traffic.route./plugins/download/{filename}',
  '/plugins/download_patch': 'traffic.route./plugins/download_patch',
  '/plugins/hash_check': 'traffic.route./plugins/hash_check',
  '/plugins/entries': 'traffic.route./plugins/entries',
  '/plugins/{entry}': 'traffic.route./plugins/{entry}',
  '/plugins/{entry}/readme': 'traffic.route./plugins/{entry}/readme',
  '/plugins/{entry}/comments': 'traffic.route./plugins/{entry}/comments',
  '/plugins/{entry}/comments/{id}': 'traffic.route./plugins/{entry}/comments/{id}',
  '/plugins/{entry}/cover': 'traffic.route./plugins/{entry}/cover',
  '/plugins/{entry}/follow': 'traffic.route./plugins/{entry}/follow',
  '/plugins/{entry}/like': 'traffic.route./plugins/{entry}/like',
  '/plugins/my_likes': 'traffic.route./plugins/my_likes',
  '/plugins/my_follows': 'traffic.route./plugins/my_follows',
  '/plugins/login': 'traffic.route./plugins/login',
  '/plugins/register': 'traffic.route./plugins/register',
  '/plugins/logout': 'traffic.route./plugins/logout',
  '/plugins/developer/{username}': 'traffic.route./plugins/developer/{username}',
  '/plugins/developer/{username}/bio': 'traffic.route./plugins/developer/{username}/bio',
  '/plugins/comments/upload_image': 'traffic.route./plugins/comments/upload_image',
  '/plugins/comments/images/{filename}': 'traffic.route./plugins/comments/images/{filename}',
  '/plugin_guide': 'traffic.route./plugin_guide',
  '/changelog': 'traffic.route./changelog',
  '/challenges': 'traffic.route./challenges',
  '/challenges/list': 'traffic.route./challenges/list',
  '/challenges/{id}': 'traffic.route./challenges/{id}',
  '/challenges/{id}/like': 'traffic.route./challenges/{id}/like',
  '/challenges/{id}/comments': 'traffic.route./challenges/{id}/comments',
  '/challenges/my_likes': 'traffic.route./challenges/my_likes',
  '/collections': 'traffic.route./collections',
  '/collections/{id}': 'traffic.route./collections/{id}',
  '/collections/{id}/plugins': 'traffic.route./collections/{id}/plugins',
  '/collections/{id}/plugins/{entry}': 'traffic.route./collections/{id}/plugins/{entry}',
  '/collections/{id}/follow': 'traffic.route./collections/{id}/follow',
  '/collections/{id}/download': 'traffic.route./collections/{id}/download',
  '/collections/my_follows': 'traffic.route./collections/my_follows',
  '/packs/list': 'traffic.route./packs/list',
  '/packs/entries': 'traffic.route./packs/entries',
  '/packs/create': 'traffic.route./packs/create',
  '/packs/upload': 'traffic.route./packs/upload',
  '/packs/{entry} (PUT)': 'traffic.route./packs/{entry} (PUT)',
  '/packs/{entry}': 'traffic.route./packs/{entry}',
  '/packs/{entry}/cover': 'traffic.route./packs/{entry}/cover',
  '/packs/download/{filename}': 'traffic.route./packs/download/{filename}',
  '/developers/{username}/follow': 'traffic.route./developers/{username}/follow',
  '/developers/my_follows': 'traffic.route./developers/my_follows',
  '/developer/{username}': 'traffic.route./developer/{username}',
  '/history': 'traffic.route./history',
  '/commits_history': 'traffic.route./commits_history',
  '/notifications': 'traffic.route./notifications',
  '/notifications/read_all': 'traffic.route./notifications/read_all',
  '/notifications/settings': 'traffic.route./notifications/settings',
  '/api/assets/list': 'traffic.route./api/assets/list',
  '/_assets': 'traffic.route./_assets',
  '/_assets/{filename:.*}': 'traffic.route./_assets/{filename:.*}',
  '/_assets/{_:.*}': 'traffic.route./_assets/{_:.*}',
  '/api/users/{username}/avatar': 'traffic.route./api/users/{username}/avatar',
  '/api/users/{username}/banner': 'traffic.route./api/users/{username}/banner',
  '/api/users/{username}/profile': 'traffic.route./api/users/{username}/profile',
  '/api/users/{username}/plugins': 'traffic.route./api/users/{username}/plugins',
  '/wiki': 'traffic.route./wiki',
  '/wiki/{path:.*}': 'traffic.route./wiki/{path:.*}',
  '/api/wiki/sidebar': 'traffic.route./api/wiki/sidebar',
  '/static/{filename:.*}': 'traffic.route./static/{filename:.*}',
  '/static/{_:.*}': 'traffic.route./static/{_:.*}',
  '/assets/{filename:.*}': 'traffic.route./assets/{filename:.*}',
  '/assets/{_:.*}': 'traffic.route./assets/{_:.*}',
  '/static/wiki/{filename:.*}': 'traffic.route./static/wiki/{filename:.*}',
  '/static/wiki/{_:.*}': 'traffic.route./static/wiki/{_:.*}',
}

function isRemovedInterface(name: string): boolean {
  return name === '/api/files/list' || name === '/files' || name.startsWith('/files/')
}

function describeInterface(name: string): string {
  const key = interfaceDescriptions[name]
  return key ? t(key) : t('traffic.route.other')
}

const displayHourly = computed<DisplayStat[]>(() => {
  return (data.value?.hourly || [])
    .filter(item => !isRemovedInterface(item.interface))
    .map(item => ({ ...item, desc: describeInterface(item.interface) }))
})

const displayDaily = computed<DisplayStat[]>(() => {
  return (data.value?.daily || [])
    .filter(item => !isRemovedInterface(item.interface))
    .map(item => ({ ...item, desc: describeInterface(item.interface) }))
})

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
    const resp = await fetch(`/api/admin/traffic?hours=${hours.value}&days=${days.value}`, {
      headers: auth.adminHeaders(),
    })
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearAdminToken()
        error.value = t('traffic.bad_token')
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

function setHours(v: number) {
  hours.value = v
  load()
}

function setDays(v: number) {
  days.value = v
  load()
}

onMounted(load)
</script>

<template>
  <div class="page-wrap" style="max-width:1100px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>📊 {{ t('traffic.title') }}</h1>
      <p>{{ t('traffic.subtitle') }}</p>
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

    <div v-else-if="error" class="notice" style="margin:16px 0;color:var(--danger)">{{ error }}</div>

    <template v-if="auth.isAdmin">
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;align-items:center">
        <div class="btn-group">
          <button
            v-for="h in hourOptions"
            :key="h"
            class="btn"
            :class="{ active: hours === h }"
            @click="setHours(h)"
          >{{ t('traffic.range.hours', { hours: h }) }}</button>
        </div>
        <div class="btn-group">
          <button
            v-for="d in dayOptions"
            :key="d"
            class="btn"
            :class="{ active: days === d }"
            @click="setDays(d)"
          >{{ t('traffic.range.days', { days: d }) }}</button>
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="load">{{ t('common.refresh') }}</button>
      </div>

      <div v-if="loading" style="padding:40px;text-align:center;color:var(--text-dim)">{{ t('common.loading') }}</div>

      <template v-else-if="data">
        <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px">
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.hourly_visits', { hours: data.hours }) }}</div>
            <div class="stat-value">{{ data.hourly_total_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.hourly_bytes', { hours: data.hours }) }}</div>
            <div class="stat-value">{{ fmtBytes(data.hourly_total_bytes) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.daily_visits', { days: data.days }) }}</div>
            <div class="stat-value">{{ data.daily_total_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.daily_bytes', { days: data.days }) }}</div>
            <div class="stat-value">{{ fmtBytes(data.daily_total_bytes) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.concurrency') }}</div>
            <div class="stat-value">{{ data.current_concurrency }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ t('traffic.stat.peak_concurrency') }}</div>
            <div class="stat-value">{{ data.peak_concurrency }}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
          <span style="font-size:.9rem;color:var(--text-dim)">{{ t('traffic.chart.metric') }}</span>
          <button class="btn" :class="{ active: chartMetric === 'count' }" @click="chartMetric = 'count'">{{ t('traffic.chart.count') }}</button>
          <button class="btn" :class="{ active: chartMetric === 'bytes' }" @click="chartMetric = 'bytes'">{{ t('traffic.chart.bytes') }}</button>
        </div>

        <div class="charts-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;margin-bottom:24px">
          <TrafficLineChart
            :series="data.hourly_series"
            :metric="chartMetric"
            :title="t('traffic.chart.hourly_title')"
          />
          <TrafficLineChart
            :series="data.daily_series"
            :metric="chartMetric"
            :title="t('traffic.chart.daily_title')"
          />
        </div>

        <h2 class="sec">{{ t('traffic.section.hourly', { hours: data.hours }) }}</h2>
        <table>
          <thead>
            <tr><th>{{ t('traffic.table.endpoint') }}</th><th>{{ t('traffic.table.desc') }}</th><th>{{ t('traffic.table.count') }}</th><th>{{ t('traffic.table.bytes') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in displayHourly" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.desc }}</td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="displayHourly.length === 0">
              <td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">{{ t('traffic.empty') }}</td>
            </tr>
          </tbody>
        </table>

        <h2 class="sec">{{ t('traffic.section.daily', { days: data.days }) }}</h2>
        <table>
          <thead>
            <tr><th>{{ t('traffic.table.endpoint') }}</th><th>{{ t('traffic.table.desc') }}</th><th>{{ t('traffic.table.count') }}</th><th>{{ t('traffic.table.bytes') }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in displayDaily" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.desc }}</td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="displayDaily.length === 0">
              <td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">{{ t('traffic.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </template>
    </template>
  </div>
</template>

<style scoped>
h2.sec {
  font-size: 1.2rem;
  border-left: 4px solid var(--accent);
  padding-left: 12px;
  margin: 28px 0 14px;
}
.btn-group { display: inline-flex; gap: 6px; flex-wrap: wrap; }
.btn.active {
  border-color: var(--accent);
  background: #2a2b31;
  color: #fff;
}
.stat-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px;
}
.stat-label { color: var(--text-dim); font-size: .85rem; margin-bottom: 6px; }
.stat-value { font-size: 1.4rem; font-weight: 700; }
:deep(table) { margin: 0 0 24px; }
:deep(td code) { font-size: .85rem; }
</style>
