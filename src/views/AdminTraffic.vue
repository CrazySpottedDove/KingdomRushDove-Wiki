<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'

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
}

const auth = useAuthStore()
const hours = ref(24)
const days = ref(7)
const loading = ref(false)
const error = ref('')
const data = ref<StatsResponse | null>(null)

const hourOptions = [1, 6, 12, 24]
const dayOptions = [1, 3, 7]

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
    error.value = '请先进入管理员模式'
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
      error.value = resp.status === 401 ? '需要管理员 Token' : '加载失败'
      data.value = null
      return
    }
    data.value = await resp.json()
  } catch {
    error.value = '网络错误'
  } finally {
    loading.value = false
  }
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
      <h1>📊 流量控制台</h1>
      <p>管理员可见：接口访问量 / 流量统计</p>
    </header>

    <div v-if="!auth.isAdmin" class="notice" style="margin:16px 0">
      当前未进入管理员模式。请先在插件商店页面点击“🔑 管理员”并输入管理员 Token。
    </div>

    <div v-if="error" class="notice" style="margin:16px 0;color:var(--danger)">{{ error }}</div>

    <template v-if="auth.isAdmin">
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;align-items:center">
        <div class="btn-group">
          <button
            v-for="h in hourOptions"
            :key="h"
            class="btn"
            :class="{ active: hours === h }"
            @click="setHours(h)"
          >近{{ h }}小时</button>
        </div>
        <div class="btn-group">
          <button
            v-for="d in dayOptions"
            :key="d"
            class="btn"
            :class="{ active: days === d }"
            @click="setDays(d)"
          >近{{ d }}日</button>
        </div>
        <button class="btn btn-primary" :disabled="loading" @click="load">刷新</button>
      </div>

      <div v-if="loading" style="padding:40px;text-align:center;color:var(--text-dim)">加载中…</div>

      <template v-else-if="data">
        <div class="cards" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:24px">
          <div class="stat-card">
            <div class="stat-label">近{{ data.hours }}小时总访问量</div>
            <div class="stat-value">{{ data.hourly_total_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">近{{ data.hours }}小时总流量</div>
            <div class="stat-value">{{ fmtBytes(data.hourly_total_bytes) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">近{{ data.days }}日总访问量</div>
            <div class="stat-value">{{ data.daily_total_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">近{{ data.days }}日总流量</div>
            <div class="stat-value">{{ fmtBytes(data.daily_total_bytes) }}</div>
          </div>
        </div>

        <h2 class="sec">近{{ data.hours }}小时 · 各接口</h2>
        <table>
          <thead>
            <tr><th>接口</th><th>访问量</th><th>流量</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in data.hourly" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="data.hourly.length === 0">
              <td colspan="3" style="text-align:center;color:var(--text-dim);padding:20px">暂无数据</td>
            </tr>
          </tbody>
        </table>

        <h2 class="sec">近{{ data.days }}日 · 各接口</h2>
        <table>
          <thead>
            <tr><th>接口</th><th>访问量</th><th>流量</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in data.daily" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="data.daily.length === 0">
              <td colspan="3" style="text-align:center;color:var(--text-dim);padding:20px">暂无数据</td>
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
