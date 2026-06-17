<script setup lang="ts">
import { ref, onMounted } from 'vue'

const visitCount = ref('—')

onMounted(async () => {
  try {
    const res = await fetch('/api/visits')
    if (!res.ok) return
    const data = await res.json()
    if (data.site_total !== undefined) visitCount.value = data.site_total
  } catch { /* ignore */ }
})
</script>

<template>
  <nav class="site-nav">
    <div class="site-nav-inner">
      <router-link class="site-nav-brand" to="/">🏰 KRDove</router-link>
      <div class="site-nav-links">
        <router-link to="/files">📦 下载</router-link>
        <router-link to="/_assets">🎨 美术资源</router-link>
        <router-link to="/history">📋 更新历史</router-link>
        <router-link to="/plugins">🧩 插件商店</router-link>
        <router-link to="/challenges">🏁 挑战</router-link>
        <router-link to="/plugin_guide">📖 插件开发文档</router-link>
        <router-link to="/wiki">📰 Wiki</router-link>
      </div>
      <div style="float:right;margin-left:12px;font-size:0.85rem;color:var(--muted);">
        已提供 <span id="visit-count">{{ visitCount }}</span> 次服务
      </div>
    </div>
  </nav>
</template>
