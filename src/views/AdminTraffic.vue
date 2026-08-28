<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import TrafficLineChart from '../components/TrafficLineChart.vue'

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

const interfaceDescriptions: Record<string, string> = {
  '/': '首页',
  '/favicon.ico': '网站图标',
  '/static': '前端静态资源目录',
  '/static/wiki': 'Wiki 静态资源目录',
  '/api/visits': '访问计数',
  '/api/admin/traffic': '流量控制台 API',
  '/admin/traffic': '流量控制台页面',
  '/commits': '检查游戏更新',
  '/file': '下载更新文件',
  '/assets': '资源索引对比',
  '/assets/upload': '上传美术资源',
  '/bundle/code': '代码打包更新',
  '/bundle/assets': '美术资源打包',
  '/plugins': '插件商店页面',
  '/plugins/list': '插件列表',
  '/plugins/upload': '上传插件',
  '/plugins/download/{filename}': '下载插件',
  '/plugins/download_patch': '下载插件补丁',
  '/plugins/hash_check': '插件校验',
  '/plugins/entries': '插件条目',
  '/plugins/{entry}': '插件详情',
  '/plugins/{entry}/readme': '插件说明',
  '/plugins/{entry}/comments': '插件评论列表',
  '/plugins/{entry}/comments/{id}': '插件评论操作',
  '/plugins/{entry}/cover': '插件封面',
  '/plugins/{entry}/follow': '收藏插件',
  '/plugins/{entry}/like': '点赞插件',
  '/plugins/my_likes': '我的点赞',
  '/plugins/my_follows': '我的收藏',
  '/plugins/login': '用户登录',
  '/plugins/register': '用户注册',
  '/plugins/logout': '用户登出',
  '/plugins/developer/{username}': '开发者信息',
  '/plugins/developer/{username}/bio': '开发者简介',
  '/plugins/comments/upload_image': '上传评论图片',
  '/plugins/comments/images/{filename}': '评论图片',
  '/plugin_guide': '插件开发文档',
  '/changelog': '改版介绍',
  '/challenges': '挑战页面',
  '/challenges/list': '挑战列表',
  '/challenges/{id}': '挑战详情',
  '/challenges/{id}/like': '挑战点赞',
  '/challenges/{id}/comments': '挑战评论',
  '/challenges/my_likes': '我的挑战点赞',
  '/collections': '插件合集列表',
  '/collections/{id}': '合集详情',
  '/collections/{id}/plugins': '合集插件管理',
  '/collections/{id}/plugins/{entry}': '合集内插件操作',
  '/collections/{id}/follow': '关注合集',
  '/collections/{id}/download': '下载合集',
  '/collections/my_follows': '我关注的合集',
  '/developers/{username}/follow': '关注开发者',
  '/developers/my_follows': '我关注的开发者',
  '/developer/{username}': '开发者主页',
  '/history': '更新历史页面',
  '/commits_history': '更新历史 API',
  '/notifications': '通知列表',
  '/notifications/read_all': '已读全部通知',
  '/notifications/settings': '通知设置',
  '/api/assets/list': '美术资源列表',
  '/_assets': '美术资源页面',
  '/_assets/{filename:.*}': '美术资源文件',
  '/_assets/{_:.*}': '美术资源文件',
  '/api/users/{username}/avatar': '用户头像',
  '/api/users/{username}/banner': '用户横幅',
  '/api/users/{username}/profile': '用户资料',
  '/api/users/{username}/plugins': '开发者插件列表',
  '/wiki': 'Wiki 首页',
  '/wiki/{path:.*}': 'Wiki 页面',
  '/api/wiki/sidebar': 'Wiki 侧边栏',
  '/static/{filename:.*}': '前端静态资源',
  '/static/{_:.*}': '前端静态资源',
  '/assets/{filename:.*}': '网站静态资源',
  '/assets/{_:.*}': '网站静态资源',
  '/static/wiki/{filename:.*}': 'Wiki 静态文件',
  '/static/wiki/{_:.*}': 'Wiki 静态文件',
}

function isRemovedInterface(name: string): boolean {
  return name === '/api/files/list' || name === '/files' || name.startsWith('/files/')
}

function describeInterface(name: string): string {
  return interfaceDescriptions[name] || '其他接口'
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
      if (resp.status === 401) {
        auth.clearAdminToken()
        error.value = '管理员 Token 无效，请重新输入'
      } else {
        error.value = '加载失败'
      }
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

async function submitAdmin() {
  const token = adminTokenInput.value.trim()
  if (!token) {
    error.value = '请输入管理员 Token'
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
      <h1>📊 流量控制台</h1>
      <p>管理员可见：接口访问量 / 流量统计</p>
    </header>

    <div v-if="!auth.isAdmin" class="admin-login" style="max-width:420px;margin:24px auto">
      <h2 style="margin-top:0">🔑 管理员验证</h2>
      <p style="color:var(--text-dim);font-size:.9rem">请输入与插件商店相同的管理员密码以查看流量控制台。</p>
      <input
        v-model="adminTokenInput"
        type="password"
        placeholder="管理员密码（与插件商店相同）"
        style="width:100%;box-sizing:border-box;margin:12px 0;padding:10px 12px;border-radius:8px;border:1px solid var(--border);background:var(--surface);color:#fff"
        @keydown.enter="submitAdmin"
      />
      <button class="btn btn-primary" style="width:100%" :disabled="adminSubmitting" @click="submitAdmin">
        {{ adminSubmitting ? '验证中…' : '进入控制台' }}
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
          <div class="stat-card">
            <div class="stat-label">当前并发</div>
            <div class="stat-value">{{ data.current_concurrency }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">并发峰值（启动至今）</div>
            <div class="stat-value">{{ data.peak_concurrency }}</div>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:12px;align-items:center">
          <span style="font-size:.9rem;color:var(--text-dim)">图表指标：</span>
          <button class="btn" :class="{ active: chartMetric === 'count' }" @click="chartMetric = 'count'">访问量</button>
          <button class="btn" :class="{ active: chartMetric === 'bytes' }" @click="chartMetric = 'bytes'">流量</button>
        </div>

        <div class="charts-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:20px;margin-bottom:24px">
          <TrafficLineChart
            :series="data.hourly_series"
            :metric="chartMetric"
            title="逐小时流量"
          />
          <TrafficLineChart
            :series="data.daily_series"
            :metric="chartMetric"
            title="逐日流量"
          />
        </div>

        <h2 class="sec">近{{ data.hours }}小时 · 各接口</h2>
        <table>
          <thead>
            <tr><th>接口</th><th>说明</th><th>访问量</th><th>流量</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in displayHourly" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.desc }}</td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="displayHourly.length === 0">
              <td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">暂无数据</td>
            </tr>
          </tbody>
        </table>

        <h2 class="sec">近{{ data.days }}日 · 各接口</h2>
        <table>
          <thead>
            <tr><th>接口</th><th>说明</th><th>访问量</th><th>流量</th></tr>
          </thead>
          <tbody>
            <tr v-for="item in displayDaily" :key="item.interface">
              <td><code>{{ item.interface }}</code></td>
              <td>{{ item.desc }}</td>
              <td>{{ item.count }}</td>
              <td>{{ fmtBytes(item.bytes) }}</td>
            </tr>
            <tr v-if="displayDaily.length === 0">
              <td colspan="4" style="text-align:center;color:var(--text-dim);padding:20px">暂无数据</td>
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
