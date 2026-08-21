<script setup lang="ts">
import { ref, computed } from 'vue'

interface TimePoint {
  bucket: string
  count: number
  bytes: number
}

const props = withDefaults(defineProps<{
  series: TimePoint[]
  metric: 'count' | 'bytes'
  title: string
}>(), {
  series: () => [],
})

const hoverIndex = ref<number | null>(null)

const W = 640
const H = 220
const PAD = { top: 16, right: 16, bottom: 32, left: 64 }

const values = computed<number[]>(() =>
  props.series.map(p => (props.metric === 'count' ? p.count : p.bytes)),
)

const maxValue = computed(() => Math.max(...values.value, 1))
const niceMax = computed(() => {
  const raw = maxValue.value
  if (raw <= 1) return 1
  const magnitude = Math.pow(10, Math.floor(Math.log10(raw)))
  const normalized = raw / magnitude
  let nice: number
  if (normalized <= 1) nice = 1
  else if (normalized <= 2) nice = 2
  else if (normalized <= 5) nice = 5
  else nice = 10
  return nice * magnitude
})

const innerW = computed(() => W - PAD.left - PAD.right)
const innerH = computed(() => H - PAD.top - PAD.bottom)

function xAt(i: number): number {
  if (props.series.length <= 1) return PAD.left + innerW.value / 2
  return PAD.left + (i / (props.series.length - 1)) * innerW.value
}

function yAt(v: number): number {
  return PAD.top + innerH.value - (v / niceMax.value) * innerH.value
}

const linePoints = computed(() =>
  props.series.map((_, i) => `${xAt(i).toFixed(1)},${yAt(values.value[i]).toFixed(1)}`).join(' '),
)

const yTicks = computed(() => {
  const ticks: number[] = []
  const count = 5
  for (let i = 0; i <= count; i++) {
    ticks.push((niceMax.value / count) * i)
  }
  return ticks
})

const xTicks = computed(() => {
  const count = Math.min(6, props.series.length)
  const indices: number[] = []
  if (props.series.length <= 1) {
    if (props.series.length === 1) indices.push(0)
    return indices.map(i => ({ index: i, label: shortBucket(props.series[i].bucket) }))
  }
  for (let i = 0; i < count; i++) {
    const idx = Math.round((i / (count - 1)) * (props.series.length - 1))
    if (!indices.includes(idx)) indices.push(idx)
  }
  return indices.map(i => ({ index: i, label: shortBucket(props.series[i].bucket) }))
})

function shortBucket(bucket: string): string {
  // "2026-08-20 13:00" -> "08-20 13:00"; "2026-08-20" -> "08-20"
  const s = bucket.replace(' ', 'T')
  const parts = s.split('T')
  if (parts.length === 2) {
    const date = parts[0].slice(5)
    return `${date} ${parts[1].slice(0, 5)}`
  }
  return bucket.slice(5)
}

function fmtValue(v: number): string {
  if (props.metric === 'count') return String(v)
  if (!v) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let i = 0
  let val = v
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024
    i++
  }
  return `${val.toFixed(val >= 100 || i === 0 ? 0 : 1)} ${units[i]}`
}

function onMouseMove(e: MouseEvent) {
  const svg = e.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const scaleX = W / rect.width
  const mx = (e.clientX - rect.left) * scaleX
  if (props.series.length === 0) {
    hoverIndex.value = null
    return
  }
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < props.series.length; i++) {
    const d = Math.abs(xAt(i) - mx)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  hoverIndex.value = best
}

function onMouseLeave() {
  hoverIndex.value = null
}

const hoverPoint = computed(() => {
  if (hoverIndex.value === null || !props.series[hoverIndex.value]) return null
  const i = hoverIndex.value
  const p = props.series[i]
  return {
    x: xAt(i),
    y: yAt(values.value[i]),
    label: p.bucket,
    value: fmtValue(values.value[i]),
  }
})
</script>

<template>
  <div class="traffic-chart">
    <div class="chart-header">
      <h3>{{ title }}</h3>
      <span v-if="hoverPoint" class="chart-tip">{{ hoverPoint.label }} · {{ hoverPoint.value }}</span>
    </div>
    <svg
      :viewBox="`0 0 ${W} ${H}`"
      class="chart-svg"
      @mousemove="onMouseMove"
      @mouseleave="onMouseLeave"
    >
      <defs>
        <linearGradient :id="`area-${title}`" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.25" />
          <stop offset="100%" stop-color="var(--accent)" stop-opacity="0" />
        </linearGradient>
      </defs>

      <!-- grid + y labels -->
      <g v-for="tick in yTicks" :key="tick">
        <line
          :x1="PAD.left"
          :x2="W - PAD.right"
          :y1="yAt(tick)"
          :y2="yAt(tick)"
          stroke="var(--border)"
          stroke-dasharray="3 3"
        />
        <text :x="PAD.left - 8" :y="yAt(tick) + 3" text-anchor="end" fill="var(--text-dim)" font-size="10">
          {{ fmtValue(tick) }}
        </text>
      </g>

      <!-- x labels -->
      <g v-for="tick in xTicks" :key="tick.index">
        <text
          :x="xAt(tick.index)"
          :y="H - 10"
          text-anchor="middle"
          fill="var(--text-dim)"
          font-size="10"
        >
          {{ tick.label }}
        </text>
      </g>

      <!-- area + line -->
      <polygon
        v-if="linePoints"
        :points="`${PAD.left},${PAD.top + innerH} ${linePoints} ${PAD.left + innerW},${PAD.top + innerH}`"
        :fill="`url(#area-${title})`"
      />
      <polyline
        v-if="linePoints"
        :points="linePoints"
        fill="none"
        stroke="var(--accent)"
        stroke-width="2"
      />

      <!-- points -->
      <circle
        v-for="(_, i) in series"
        :key="i"
        :cx="xAt(i)"
        :cy="yAt(values[i])"
        r="2.5"
        fill="var(--accent)"
      />

      <!-- hover crosshair -->
      <g v-if="hoverPoint">
        <line
          :x1="hoverPoint.x"
          :x2="hoverPoint.x"
          :y1="PAD.top"
          :y2="PAD.top + innerH"
          stroke="var(--accent)"
          stroke-width="1"
          stroke-dasharray="4 4"
        />
        <circle :cx="hoverPoint.x" :cy="hoverPoint.y" r="4" fill="var(--accent)" stroke="#fff" stroke-width="1.5" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.traffic-chart {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
.chart-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}
.chart-header h3 {
  margin: 0;
  font-size: 1rem;
}
.chart-tip {
  font-size: .85rem;
  color: var(--accent);
  background: rgba(0,0,0,.25);
  border-radius: 6px;
  padding: 2px 8px;
}
.chart-svg {
  width: 100%;
  height: auto;
  display: block;
}
</style>
