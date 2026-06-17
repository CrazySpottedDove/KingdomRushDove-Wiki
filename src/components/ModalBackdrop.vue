<script setup lang="ts">
defineProps<{
  show: boolean
  title: string
  modalClass?: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="modal-backdrop show"
      @click.self="$emit('close')"
    >
      <div :class="['modal', modalClass]">
        <div class="modal-header">
          <h3>{{ title }}</h3>
          <button class="modal-close" @click="$emit('close')">×</button>
        </div>
        <slot />
      </div>
    </div>
  </Teleport>
</template>
