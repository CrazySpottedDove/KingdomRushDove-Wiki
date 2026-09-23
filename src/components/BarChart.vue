<script setup lang="ts">
import { computed } from 'vue'

/**
 * 极简条形图：只负责 `{label, value}` 列表 → 条形。
 *
 * 刻意不复用 `TrafficLineChart.vue`：那个组件的 props 与流量语义耦合
 * （`bucket`/`count`/`bytes` + `metric`），要支持条形得连带改造管理员控制台，零收益。
 * 这里用横向条形而非竖柱：插件名较长，竖柱要么截断要么旋转，横向可读性明显更好。
 */
const props = withDefaults(defineProps<{
  items: { label: string; value: number }[]
  title?: string
}>(), {
  items: () => [],
  title: '',
})

const maxValue = computed(() => Math.max(...props.items.map((i) => i.value), 1))

/** 有值就至少给 2% 的可见宽度，避免"有增量但看起来是 0" */
function widthOf(value: number): string {
  if (value <= 0) return '0%'
  return `${Math.max(2, (value / maxValue.value) * 100)}%`
}
</script>

<template>
  <div class="bar-chart">
    <h3 v-if="title">{{ title }}</h3>
    <p v-if="items.length === 0" class="bar-empty">—</p>
    <div v-for="(item, i) in items" :key="`${item.label}-${i}`" class="bar-row">
      <span class="bar-label" :title="item.label">{{ item.label }}</span>
      <span class="bar-track">
        <span class="bar-fill" :style="{ width: widthOf(item.value) }"></span>
      </span>
      <span class="bar-value">{{ item.value }}</span>
    </div>
  </div>
</template>

<style scoped>
.bar-chart {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
}
.bar-chart h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.bar-empty {
  margin: 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}
.bar-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.bar-label {
  flex: 0 0 34%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.88rem;
}
.bar-track {
  flex: 1;
  height: 14px;
  background: var(--code-bg);
  border-radius: 4px;
  overflow: hidden;
}
.bar-fill {
  display: block;
  height: 100%;
  background: var(--accent);
  border-radius: 4px;
  transition: width 0.3s ease;
}
.bar-value {
  flex: 0 0 auto;
  min-width: 3rem;
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
  font-size: 0.88rem;
}
</style>
