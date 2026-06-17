<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  modelValue: number
  totalPages: number
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number]
}>()

const VISIBLE_PAGES = 7

const pageButtons = computed(() => {
  const { modelValue: page, totalPages } = props
  if (totalPages <= 1) return [page]
  const buttons: (number | string)[] = []
  let start = Math.max(1, page - Math.floor(VISIBLE_PAGES / 2))
  let end = Math.min(totalPages, start + VISIBLE_PAGES - 1)
  if (end - start < VISIBLE_PAGES - 1) start = Math.max(1, end - VISIBLE_PAGES + 1)

  if (start > 1) {
    buttons.push(1)
    if (start > 2) buttons.push('...')
  }
  for (let i = start; i <= end; i++) buttons.push(i)
  if (end < totalPages) {
    if (end < totalPages - 1) buttons.push('...')
    buttons.push(totalPages)
  }
  return buttons
})

function go(p: number) {
  if (p < 1 || p > props.totalPages) return
  emit('update:modelValue', p)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <div class="pagination" v-if="totalPages > 1">
    <button
      class="page-btn"
      :disabled="modelValue <= 1"
      @click="go(modelValue - 1)"
    >
      ‹ 上一页
    </button>
    <template v-for="p in pageButtons" :key="p">
      <span v-if="p === '...'" class="page-ellipsis">…</span>
      <button
        v-else
        :class="['page-btn', { active: p === modelValue }]"
        @click="go(p as number)"
      >
        {{ p }}
      </button>
    </template>
    <button
      class="page-btn"
      :disabled="modelValue >= totalPages"
      @click="go(modelValue + 1)"
    >
      下一页 ›
    </button>
  </div>
</template>
