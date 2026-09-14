<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useI18n, type Locale } from '../i18n'

const visitCount = ref('—')
const auth = useAuthStore()
const { t, locale, setLocale, locales } = useI18n()

function onLocaleChange(e: Event) {
  setLocale((e.target as HTMLSelectElement).value as Locale)
}

onMounted(async () => {
  await auth.restoreSession()
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
        <router-link to="/_assets">🎨 {{ t('nav.assets') }}</router-link>
        <router-link to="/history">📋 {{ t('nav.history') }}</router-link>
        <router-link to="/plugins">🧩 {{ t('nav.plugins') }}</router-link>
        <router-link to="/challenges">🏁 {{ t('nav.challenges') }}</router-link>
        <router-link to="/wiki">📰 {{ t('nav.wiki') }}</router-link>
        <router-link v-if="auth.isAdmin" to="/admin/traffic">📊 {{ t('nav.traffic') }}</router-link>
      </div>
      <select class="locale-switch" :value="locale" :aria-label="t('nav.language')" :title="t('nav.language')" @change="onLocaleChange">
        <option v-for="l in locales" :key="l.value" :value="l.value">{{ l.label }}</option>
      </select>
      <div class="visit-count" style="float:right;margin-left:12px;font-size:0.85rem;color:var(--muted);">
        {{ t('nav.visits', { count: visitCount }) }}
      </div>
    </div>
  </nav>
</template>
