<script setup lang="ts">
import { t } from '../i18n'
</script>

<template>
  <div class="page-wrap" style="max-width:900px;margin:0 auto;padding:0 16px 60px;">
    <header>
      <h1>{{ t('site.title') }}</h1>
      <p>{{ t('site.subtitle') }}</p>
    </header>

    <div class="notice">
      {{ t('home.ipv6.before') }}
      <a href="https://krdovedownload6.crazyspotteddove.top:52000">{{ t('home.ipv6.link') }}</a>{{ t('home.ipv6.after') }}
    </div>

    <h2 class="sec">{{ t('home.index.title') }}</h2>
    <div class="nav-grid">
      <a class="nav-card" href="/_assets">
        <div class="icon">🎨</div>
        <div class="label">{{ t('home.card.assets') }}</div>
      </a>
      <router-link class="nav-card" to="/history">
        <div class="icon">📋</div>
        <div class="label">{{ t('home.card.history') }}</div>
      </router-link>
      <router-link class="nav-card" to="/plugins">
        <div class="icon">🧩</div>
        <div class="label">{{ t('home.card.plugins') }}</div>
      </router-link>
      <router-link class="nav-card" to="/challenges">
        <div class="icon">🏁</div>
        <div class="label">{{ t('home.card.challenges') }}</div>
      </router-link>
      <router-link class="nav-card" to="/wiki/plugin_guide">
        <div class="icon">📖</div>
        <div class="label">{{ t('home.card.plugin_guide') }}</div>
      </router-link>
      <router-link class="nav-card" to="/changelog">
        <div class="icon">📰</div>
        <div class="label">{{ t('home.card.changelog') }}</div>
      </router-link>
    </div>

    <h2 class="sec">{{ t('home.download.title') }}</h2>
    <div class="download-notice">
      <p>{{ t('home.download.before') }} <a href="https://pan.quark.cn/s/f79b8c288102?pwd=V2Ec">{{ t('home.download.link') }}</a>{{ t('home.download.after') }}</p>
    </div>

    <h2 class="sec">{{ t('home.donate.title') }}</h2>
    <div class="donate-wrap">
      <p>{{ t('home.donate.body') }}</p>
      <img :src="'/assets/donate.jpg'" :alt="t('home.donate.alt')" />
    </div>

    <h2 class="sec">{{ t('home.faq.title') }}</h2>
    <h3>{{ t('home.faq.gpu.title') }}</h3>
    <ul>
      <li>{{ t('home.faq.gpu.symptom') }}</li>
      <li>{{ t('home.faq.gpu.reason') }}</li>
      <li>{{ t('home.faq.gpu.case') }}</li>
      <li>{{ t('home.faq.gpu.fix') }}</li>
    </ul>

    <h2 class="sec">{{ t('home.group.title') }}</h2>
    <ul class="qq-list">
      <li>{{ t('home.group.1') }}</li>
      <li>{{ t('home.group.2') }}</li>
      <li>{{ t('home.group.3.before') }} <strong>1025619048</strong>{{ t('home.group.3.after') }}</li>
    </ul>
  </div>
</template>

<style scoped>
h2.sec {
  font-size: 1.3rem;
  border-left: 4px solid var(--accent);
  padding-left: 12px;
  margin: 36px 0 16px;
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 40px;
}
.nav-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 18px 16px;
  text-align: center;
  transition: border-color 0.15s, background 0.15s;
  text-decoration: none;
  display: block;
}
.nav-card:hover {
  border-color: var(--accent);
  background: #2a2b31;
  text-decoration: none;
}
.nav-card .icon { font-size: 1.6rem; margin-bottom: 8px; }
.nav-card .label { color: #fff; font-size: 0.9rem; font-weight: 600; }
.download-notice {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 16px 18px;
  margin-bottom: 24px;
  font-size: .95rem;
  line-height: 1.7;
}
.download-notice a { color: var(--accent); }
.qq-list { list-style: none; padding: 0; }
.qq-list li {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 8px 0;
  font-size: 0.92rem;
}
.donate-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}
.donate-wrap img {
  width: 240px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.donate-wrap p { color: var(--muted, #aaa); font-size: 0.9rem; margin: 0; }
</style>
