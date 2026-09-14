<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import PluginCommentsModal from '../components/PluginCommentsModal.vue'
import { escHtml, mdToHtml } from '../utils/markdown'
import { t } from '../i18n'

const route = useRoute()
const auth = useAuthStore()

interface DevData {
  username: string
  display_name?: string
  avatar_filename?: string
  banner_filename?: string
  bio_md?: string
  level: number
  level_name: string
  score: number
  plugin_count: number
  total_downloads: number
  total_likes: number
  social_links?: string | Record<string, string>
  plugins?: any[]
}

// name 用 getter，模板读取时按当前语言实时取文案
const CATEGORIES = [
  { slug: '', icon: '🔍', get name() { return t('category.all') } },
  { slug: 'gameplay', icon: '🎮', get name() { return t('category.gameplay') } },
  { slug: 'cosmetic', icon: '🎨', get name() { return t('category.cosmetic') } },
  { slug: 'display', icon: '🖥️', get name() { return t('category.display') } },
  { slug: 'tower', icon: '🏰', get name() { return t('category.tower') } },
  { slug: 'hero', icon: '🦸', get name() { return t('category.hero') } },
  { slug: 'enemy', icon: '👾', get name() { return t('category.enemy') } },
  { slug: 'level', icon: '🗺️', get name() { return t('category.level') } },
  { slug: 'other', icon: '📦', get name() { return t('category.other') } },
]
const LEVEL_THRESHOLDS = [0, 500, 2000, 10000, 50000]
const LEVEL_NAMES = computed(() => [t('dev.level.1'), t('dev.level.2'), t('dev.level.3'), t('dev.level.4'), t('dev.level.5')])

const targetUser = computed(() => route.params.username as string)
const devData = ref<DevData | null>(null)
const loading = ref(true)
const notFound = ref(false)

// Editing state
const editingBio = ref(false)
const bioText = ref('')
const bioStatus = ref('')

// Manage mode
const manageMode = ref(false)
const selectedPlugins = ref<Set<string>>(new Set())

// Detail modal
const detailEntry = ref('')
const detailPlugin = ref<any>(null)
const detailContent = ref('')
const showDetail = ref(false)

// Comments modal
const showComments = ref(false)
const commentsEntry = ref('')
const commentPluginName = ref('')

// Login modal
const showLogin = ref(false)
const loginUser = ref('')
const loginPass = ref('')
const loginErr = ref('')

async function loadProfile() {
  loading.value = true
  notFound.value = false
  if (!targetUser.value) { notFound.value = true; loading.value = false; return }
  try {
    const resp = await fetch('/plugins/developer/' + encodeURIComponent(targetUser.value))
    if (resp.status === 404 || !resp.ok) { notFound.value = true; return }
    devData.value = await resp.json()
  } catch { notFound.value = true }
  loading.value = false
}

const isOwnProfile = computed(() => auth.userAuth && auth.userAuth.username === targetUser.value)

const socialLinksEntries = computed<[string, string][]>(() => {
  const raw = devData.value?.social_links
  if (!raw) return []
  const obj: Record<string, string> = typeof raw === 'string'
    ? (() => { try { return JSON.parse(raw) } catch { return {} } })()
    : raw as Record<string, string>
  return Object.entries(obj)
})

function renderBio(md: string | undefined) {
  if (!md || !md.trim()) return t('dev.no_bio')
  return mdToHtml(md)
}

function toggleBioEdit() {
  editingBio.value = true
  bioText.value = devData.value?.bio_md || ''
}

function cancelBioEdit() {
  editingBio.value = false
  bioText.value = ''
  bioStatus.value = ''
}

async function saveBio() {
  if (!auth.userAuth || !targetUser.value) return
  bioStatus.value = t('dev.saving')
  try {
    const resp = await fetch(`/plugins/developer/${encodeURIComponent(targetUser.value)}/bio`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() },
      body: JSON.stringify({ bio_md: bioText.value }),
    })
    if (resp.ok) {
      if (devData.value) devData.value.bio_md = bioText.value
      cancelBioEdit()
    } else {
      bioStatus.value = '❌ ' + (await resp.text())
    }
  } catch (e: any) {
    bioStatus.value = t('common.network_error_detail', { error: e.message })
  }
}

// Manage Mode functions
function toggleManageMode() {
  manageMode.value = !manageMode.value
  if (!manageMode.value) {
    selectedPlugins.value.clear()
  }
}

function handleCardClick(event: MouseEvent, entry: string) {
  if (!manageMode.value) return
  const target = event.target as HTMLElement
  if (target.tagName === 'BUTTON' || target.tagName === 'A') return
  if (target.closest('.btn-like, .btn-sm')) return
  if (selectedPlugins.value.has(entry)) {
    selectedPlugins.value.delete(entry)
  } else {
    selectedPlugins.value.add(entry)
  }
}

function selectAllPlugins() {
  const plugins = devData.value?.plugins || []
  plugins.forEach(p => selectedPlugins.value.add(p.entry))
}

function deselectAllPlugins() {
  selectedPlugins.value.clear()
}

const selectionCount = computed(() => selectedPlugins.value.size)

async function batchChangeCover() {
  if (selectedPlugins.value.size === 0) { alert(t('dev.select_for_cover')); return }
  for (const entry of selectedPlugins.value) {
    await changeCoverForEntry(entry)
  }
}

function changeCoverForEntry(entry: string): Promise<void> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) { resolve(); return }
      if (file.size > 2 * 1024 * 1024) {
        alert(t('dev.cover_too_large', { entry }))
        resolve(); return
      }
      const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/cover`, {
        method: 'POST',
        headers: auth.bearerHeaders(),
        body: file,
      })
      if (resp.ok) {
        const coverEl = document.getElementById(`cover-${entry}`)
        if (coverEl) {
          coverEl.innerHTML = `<img src="/plugins/${encodeURIComponent(entry)}/cover?size=thumb&t=${Date.now()}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">`
        }
      } else {
        alert(t('dev.cover_upload_failed', { entry, error: await resp.text() }))
      }
      resolve()
    }
    input.click()
  })
}

async function batchDelete() {
  if (selectedPlugins.value.size === 0) { alert(t('dev.select_for_delete')); return }
  if (!confirm(t('dev.delete_selected_confirm', { count: selectedPlugins.value.size }))) return
  const entries = Array.from(selectedPlugins.value)
  let success = 0, failed = 0
  for (const entry of entries) {
    try {
      const resp = await fetch(`/plugins/${encodeURIComponent(entry)}`, {
        method: 'DELETE',
        headers: auth.bearerHeaders(),
      })
      if (resp.ok) {
        success++
        selectedPlugins.value.delete(entry)
        const card = document.querySelector(`.plugin-card[data-entry="${entry}"]`)
        card?.remove()
      } else {
        failed++
      }
    } catch { failed++ }
  }
  alert(t('dev.delete_done', { success, failed }))
  if (success > 0) await loadProfile()
}

// Comments modal
async function showPluginComments(entry: string, plugin: any) {
  commentsEntry.value = entry
  commentPluginName.value = plugin?.name || entry
  showComments.value = true
}

function closeComments() {
  showComments.value = false
}

function onCommentCountChange(entry: string, count: number) {
  const p = devData.value?.plugins?.find((x: any) => x.entry === entry)
  if (p) p.comment_count = count
}


// Auth
async function toggleFollowDeveloper() {
  if (!auth.userAuth || !targetUser.value) return
  const isFollowing = auth.myFollowedDevs.has(targetUser.value)
  try {
    const resp = await fetch(`/developers/${encodeURIComponent(targetUser.value)}/follow`, {
      method: isFollowing ? 'DELETE' : 'POST',
      headers: auth.bearerHeaders(),
    })
    if (resp.ok) {
      if (isFollowing) auth.myFollowedDevs.delete(targetUser.value)
      else auth.myFollowedDevs.add(targetUser.value)
    } else if (resp.status === 401) { auth.clearUserAuth(); showLogin.value = true }
  } catch { /* ignore */ }
}

async function toggleFavorite(event: Event, entry: string) {
  event.stopPropagation()
  if (!auth.userAuth) { showLogin.value = true; return }
  const favorited = auth.myFollows.has(entry)
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/follow`, {
      method: favorited ? 'DELETE' : 'POST',
      headers: auth.bearerHeaders()
    })
    if (resp.ok) {
      if (favorited) auth.myFollows.delete(entry)
      else auth.myFollows.add(entry)
    } else if (resp.status === 401) { auth.clearUserAuth(); showLogin.value = true }
  } catch { /* ignore */ }
}

async function toggleLike(event: Event, entry: string) {
  event.stopPropagation()
  if (!auth.userAuth) { showLogin.value = true; return }
  const liked = auth.myLikes.has(entry)
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/like`, {
      method: liked ? 'DELETE' : 'POST',
      headers: auth.bearerHeaders()
    })
    if (resp.ok) {
      const data = await resp.json()
      if (liked) auth.myLikes.delete(entry)
      else auth.myLikes.add(entry)
      const p = devData.value?.plugins?.find(x => x.entry === entry)
      if (p) p.like_count = data.like_count
    } else if (resp.status === 401) { auth.clearUserAuth(); showLogin.value = true }
  } catch { /* ignore */ }
}

async function showPluginDetail(entry: string, plugin: any) {
  detailEntry.value = entry
  detailPlugin.value = plugin
  detailContent.value = '<div style="text-align:center;padding:20px;color:#666">' + t('common.loading') + '</div>'
  showDetail.value = true
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(entry) + '/readme')
    if (resp.ok) {
      const text = await resp.text()
      detailContent.value = mdToHtml(text)
    } else {
      detailContent.value = `<p style="color:var(--text-dim);text-align:center">${escHtml(plugin.desc || t('dev.no_plugin_desc'))}</p>`
    }
  } catch (e: any) {
    detailContent.value = t('dev.load_failed_detail', { error: e.message })
  }
}

function closeDetail() { showDetail.value = false }

async function doLogin() {
  if (!loginUser.value || !loginPass.value) { loginErr.value = t('common.need_credentials'); return }
  try {
    const resp = await fetch('/plugins/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: loginUser.value, password: loginPass.value }),
    })
    if (!resp.ok) { loginErr.value = await resp.text(); return }
    const data = await resp.json()
    auth.setUserAuth(data.username, data.token)
    await auth.loadDevReactionState(data.token)
    showLogin.value = false
    loginErr.value = ''
    await loadProfile()
  } catch (e: any) { loginErr.value = t('common.network_error_detail_plain', { error: e.message }) }
}

function closeLoginModal() { showLogin.value = false; loginErr.value = '' }

// Edit avatar/banner
function editAvatar() {
  if (!isOwnProfile.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const resp = await fetch(`/api/users/${encodeURIComponent(targetUser.value!)}/avatar`, {
      method: 'POST',
      headers: auth.bearerHeaders(),
      body: file,
    })
    if (resp.ok) await loadProfile()
  }
  input.click()
}

function editBanner() {
  if (!isOwnProfile.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    const resp = await fetch(`/api/users/${encodeURIComponent(targetUser.value!)}/banner`, {
      method: 'POST',
      headers: auth.bearerHeaders(),
      body: file,
    })
    if (resp.ok) await loadProfile()
  }
  input.click()
}

function fmtDate(s: string) {
  return s ? s.slice(0, 10) : '—'
}

onMounted(async () => {
  await auth.restoreSession('developer')
  await loadProfile()
})
</script>

<template>
  <div id="pageBackground" class="page-background">
    <div id="pageBgImage" class="page-background-image" :style="devData?.banner_filename ? { backgroundImage: `url('/api/users/${encodeURIComponent(devData.username)}/banner')` } : {}"></div>
    <div class="page-background-overlay"></div>
  </div>

  <div class="page-wrap" style="max-width:clamp(900px,94vw,1400px);margin:0 auto;padding:0 16px 60px;">
    <div v-if="loading" style="text-align:center;padding:60px;color:var(--text-dim)">⏳ {{ t('common.loading') }}</div>

    <div v-else-if="notFound" class="not-found">
      <h2>👤 {{ t('dev.not_found') }}</h2>
      <p>{{ t('dev.not_found_body') }}</p>
      <router-link to="/plugins" class="btn btn-primary" style="margin-top:16px;display:inline-block">← {{ t('dev.back_to_store') }}</router-link>
    </div>

    <div v-else-if="devData" id="profileContent">
      <div class="banner-edit-inline" id="bannerEditInline" v-show="isOwnProfile">
        <button class="btn" @click="editBanner">📷 {{ t('dev.change_banner') }}</button>
      </div>

      <div class="profile-header">
        <div class="profile-avatar" id="profileAvatar" :class="{ 'can-edit': isOwnProfile }" @click="isOwnProfile && editAvatar()">
          <template v-if="devData.avatar_filename">
            <img :src="'/api/users/' + encodeURIComponent(devData.username) + '/avatar'" alt="Avatar" loading="lazy" />
          </template>
          <template v-else>
            <div class="profile-avatar-placeholder">{{ ['🌱','⭐','🔥','💎','👑'][devData.level - 1] || '👤' }}</div>
          </template>
          <div v-if="isOwnProfile" class="avatar-edit-overlay">📷 {{ t('dev.change_avatar') }}</div>
        </div>
        <div class="profile-info">
          <div class="profile-display-name" id="profileDisplayName">
            {{ devData.display_name || devData.username }}
            <button v-show="isOwnProfile" class="btn edit-profile-btn" id="editProfileBtn">{{ t('common.edit') }}</button>
          </div>
          <div class="profile-username" v-if="devData.display_name && devData.display_name !== devData.username">@{{ devData.username }}</div>
          <div style="display:none">
            <span id="profileUsername">{{ devData.username }}</span>
            <span :class="['level-badge', 'level-' + devData.level]">{{ devData.level_name }}</span>
          </div>
          <div class="profile-stats" id="profileStats">
            <div class="stat-item"><strong>{{ devData.plugin_count || 0 }}</strong>{{ t('dev.stat.plugins') }}</div>
            <div class="stat-item"><strong>{{ devData.total_downloads || 0 }}</strong>{{ t('dev.stat.downloads') }}</div>
            <div class="stat-item"><strong>{{ devData.total_likes || 0 }}</strong>{{ t('dev.stat.likes') }}</div>
            <div class="stat-item"><strong>{{ devData.score || 0 }}</strong>{{ t('dev.stat.score') }}</div>
          </div>
          <div class="social-links" id="socialLinks">
            <template v-if="socialLinksEntries.length">
              <a v-for="[key, url] in socialLinksEntries" :key="key" :href="url" class="social-link" target="_blank" rel="noopener">
                {{ key === 'github' ? '🐙 GitHub' : key === 'twitter' ? '🐦 Twitter' : key === 'website' ? t('dev.link.website') : key === 'email' ? t('dev.link.email') : key }}
              </a>
            </template>
          </div>
        </div>
        <div class="profile-actions">
          <button class="btn btn-user" id="pageUserBtn" @click="auth.userAuth ? auth.clearUserAuth() : (showLogin = true)">
            {{ auth.userAuth ? t('dev.login.logged_in', { name: auth.userAuth.username }) : t('dev.login.login') }}
          </button>
          <button v-if="auth.userAuth && !isOwnProfile"
            :class="['btn', 'btn-follow-dev', { following: auth.myFollowedDevs.has(targetUser!) }]"
            @click="toggleFollowDeveloper">
            {{ auth.myFollowedDevs.has(targetUser!) ? t('dev.following') : t('dev.follow') }}
          </button>
        </div>
      </div>

      <div class="score-section">
        <div class="score-label">
          <span>{{ t('dev.level_score') }}: <strong style="color:var(--text)">{{ devData.score || 0 }}</strong></span>
          <span v-if="LEVEL_THRESHOLDS[(devData.level || 1) - 1 + 1]">{{ t('dev.next_level', { name: LEVEL_NAMES[(devData.level || 1) - 1 + 1], score: LEVEL_THRESHOLDS[(devData.level || 1) - 1 + 1] }) }}</span>
          <span v-else>{{ t('dev.max_level') }}</span>
        </div>
        <div class="score-bar">
          <div class="score-fill" :style="{ width: Math.min(100, devData.level ? Math.round(((devData.score || 0) - (LEVEL_THRESHOLDS[devData.level - 1] || 0)) / ((LEVEL_THRESHOLDS[devData.level] || 0) - (LEVEL_THRESHOLDS[devData.level - 1] || 0)) * 100) : 100) + '%' }"></div>
        </div>
        <div class="level-milestones">
          <span>{{ LEVEL_THRESHOLDS[(devData.level || 1) - 1] || 0 }}</span>
          <span v-if="LEVEL_THRESHOLDS[(devData.level || 1) - 1 + 1]">{{ LEVEL_THRESHOLDS[(devData.level || 1) - 1 + 1] }}</span>
        </div>
      </div>

      <div class="bio-section">
        <div class="section-title">
          📝 {{ t('dev.about') }}
          <button v-show="isOwnProfile" class="btn" style="padding:3px 10px;font-size:0.8rem" @click="toggleBioEdit">{{ t('common.edit') }}</button>
        </div>
        <div v-if="!editingBio" class="bio-content" :class="{ empty: !devData.bio_md || !devData.bio_md.trim() }" v-html="devData.bio_md && devData.bio_md.trim() ? mdToHtml(devData.bio_md) : t('dev.no_bio')"></div>
        <div v-else class="bio-editor" style="display:block">
          <textarea id="bioTextarea" v-model="bioText" :placeholder="t('dev.bio_placeholder')" style="width:100%;box-sizing:border-box;min-height:140px;resize:vertical;background:var(--bg);border:1px solid var(--border);border-radius:6px;color:var(--text);padding:10px 12px;font-family:inherit;font-size:0.88rem;outline:none;line-height:1.65"></textarea>
          <p class="bio-editor-hint">{{ t('dev.bio_hint') }}</p>
          <div class="bio-actions">
            <span id="bioStatus" style="font-size:0.8rem;flex:1">{{ bioStatus }}</span>
            <button class="btn" @click="cancelBioEdit">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="saveBio">{{ t('common.save') }}</button>
          </div>
        </div>
      </div>

      <div>
        <div class="section-title">
          🧩 {{ t('dev.plugins_title') }}
          <span style="font-size:0.82rem;color:var(--text-dim);font-weight:400">({{ devData.plugins?.length || 0 }})</span>
          <button v-show="isOwnProfile" class="btn" style="padding:3px 10px;font-size:0.8rem;margin-left:12px" @click="toggleManageMode">{{ manageMode ? t('dev.exit_manage') : t('dev.manage_plugins') }}</button>
        </div>

        <div v-if="manageMode" id="manageToolbar" style="background:#1a1b20;border:1px solid var(--border);border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <button class="btn-sm" style="border-color:#4a9eff" @click="selectAllPlugins">{{ t('common.select_all') }}</button>
            <button class="btn-sm" style="border-color:#666" @click="deselectAllPlugins">{{ t('dev.deselect') }}</button>
            <span style="color:var(--text-dim);margin:0 8px">{{ t('dev.selected_count', { count: selectionCount }) }}</span>
            <div style="flex:1"></div>
            <button class="btn-sm" style="border-color:#ffa94d;color:#ffa94d" :disabled="selectionCount === 0" @click="batchChangeCover">📷 {{ t('dev.batch_cover') }}</button>
            <button class="btn-sm btn-danger-sm" :disabled="selectionCount === 0" @click="batchDelete">🗑 {{ t('dev.delete_selected') }}</button>
            <button class="btn-sm" style="border-color:#51cf66;color:#51cf66" @click="toggleManageMode">{{ t('dev.exit_manage') }}</button>
          </div>
        </div>

        <div class="plugin-grid">
          <div v-if="!devData.plugins?.length" class="grid-empty">{{ t('dev.no_plugins') }}</div>
          <div v-for="p in devData.plugins" :key="p.entry" class="plugin-card" :data-entry="p.entry" @click="handleCardClick($event, p.entry)" :class="{ 'manage-mode': manageMode, 'selected': selectedPlugins.has(p.entry) }">
            <div class="plugin-card-checkbox">✓</div>
            <template v-if="p.has_cover">
              <div class="card-cover" :id="'cover-' + escHtml(p.entry)"><img :src="'/plugins/' + encodeURIComponent(p.entry) + '/cover?size=thumb'" alt="" loading="lazy" /></div>
            </template>
            <template v-else>
              <div class="card-cover card-cover-placeholder" :id="'cover-' + escHtml(p.entry)"><span class="cover-icon">{{ CATEGORIES.find(c => c.slug === p.category)?.icon || '📦' }}</span></div>
            </template>
            <div class="card-body">
              <div class="card-meta-row">
                <span :class="['card-category', 'cat-' + (p.category || 'other')]">{{ CATEGORIES.find(c => c.slug === p.category)?.icon || '📦' }} {{ CATEGORIES.find(c => c.slug === p.category)?.name || t('category.other') }}</span>
                <div style="display:flex;gap:4px">
                  <button :class="['btn-like', { favorited: auth.myFollows.has(p.entry) }]" data-kind="favorite"
                    @click="toggleFavorite($event, p.entry)" :title="auth.myFollows.has(p.entry) ? t('dev.unfavorite') : t('dev.favorite')"
                    style="min-width:28px">{{ auth.myFollows.has(p.entry) ? '⭐' : '☆' }}</button>
                  <button :class="['btn-like', { liked: auth.myLikes.has(p.entry) }]" data-kind="like"
                    @click="toggleLike($event, p.entry)" :title="auth.myLikes.has(p.entry) ? t('dev.unlike') : t('dev.like')">
                    {{ auth.myLikes.has(p.entry) ? '❤' : '🤍' }}<span :id="'likes-' + escHtml(p.entry)">{{ p.like_count || 0 }}</span>
                  </button>
                </div>
              </div>
              <div class="card-title" :title="p.name">{{ p.name }}</div>
              <div style="font-size:0.75rem;color:var(--text-dim)">v{{ p.version }}</div>
              <div class="card-desc">{{ p.desc }}</div>
            </div>
            <div class="card-footer">
              <div class="card-stats">
                <span>⬇ {{ p.downloads }}</span>
                <span>❤ {{ p.like_count || 0 }}</span>
                <span>💬 {{ p.comment_count || 0 }}</span>
                <span>📅 {{ fmtDate(p.published_at) }}</span>
              </div>
              <div class="card-actions">
                <button class="btn-sm btn-detail-sm" @click="showPluginDetail(p.entry, p)">📄 {{ t('dev.detail') }}</button>
                <a class="btn-sm btn-download-sm" :href="'/plugins/download/' + encodeURIComponent(p.filename)">⬇ {{ t('common.download') }}</a>
                <button class="btn-sm" style="border-color:#2d4a6a;color:#74c0fc;background:#12243a" @click="showPluginComments(p.entry, p)">💬 {{ t('common.comments') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <div class="modal-backdrop" :class="{ show: showDetail }" @click.self="closeDetail">
        <div class="modal">
          <div class="modal-header">
            <h3>{{ detailPlugin?.name || t('dev.plugin_detail') }}</h3>
            <button class="modal-close" @click="closeDetail">×</button>
          </div>
          <div v-if="detailPlugin" class="readme-plugin-info">
            <div><span>{{ t('dev.field.version') }}</span><br><strong>{{ detailPlugin.version }}</strong></div>
            <div><span>{{ t('dev.field.category') }}</span><br><strong>{{ CATEGORIES.find(c => c.slug === detailPlugin.category)?.icon }} {{ CATEGORIES.find(c => c.slug === detailPlugin.category)?.name }}</strong></div>
            <div><span>{{ t('dev.field.downloads') }}</span><br><strong>{{ detailPlugin.downloads }}</strong></div>
            <div><span>{{ t('dev.field.likes') }}</span><br><strong>{{ detailPlugin.like_count || 0 }}</strong></div>
            <div><span>{{ t('dev.field.published') }}</span><br><strong>{{ fmtDate(detailPlugin.published_at) }}</strong></div>
          </div>
          <div class="modal-body" v-html="detailContent"></div>
        </div>
      </div>
    </Teleport>

    <!-- Comments modal -->
    <PluginCommentsModal
      v-model="showComments"
      :entry="commentsEntry"
      :plugin-name="commentPluginName"
      @close="closeComments"
      @count-change="onCommentCountChange"
      @need-login="showLogin = true"
    />

    <!-- Login modal -->
    <Teleport to="body">
      <div class="modal-backdrop" :class="{ show: showLogin }" @click.self="closeLoginModal" style="max-width:100%">
        <div style="background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:24px 28px;max-width:400px;width:100%;box-shadow:0 12px 40px rgba(0,0,0,.6)">
          <div class="modal-header">
            <h3>👤 {{ t('dev.login.title') }}</h3>
            <button class="modal-close" @click="closeLoginModal">×</button>
          </div>
          <label style="font-size:.82rem;color:var(--text-dim);display:block;margin-bottom:4px">{{ t('common.username') }}</label>
          <input type="text" v-model="loginUser" :placeholder="t('common.username')" autocomplete="username" style="margin-bottom:12px;width:100%" @keydown.enter="doLogin" />
          <label style="font-size:.82rem;color:var(--text-dim);display:block;margin-bottom:4px">{{ t('common.password') }}</label>
          <input type="password" v-model="loginPass" :placeholder="t('common.password')" autocomplete="current-password" style="margin-bottom:4px;width:100%" @keydown.enter="doLogin" />
          <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:16px">
            <button class="btn" @click="closeLoginModal">{{ t('common.cancel') }}</button>
            <button class="btn btn-primary" @click="doLogin">{{ t('common.login') }}</button>
          </div>
          <div style="color:var(--danger);font-size:.82rem;margin-top:8px;min-height:18px">{{ loginErr }}</div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style>
/* .page-wrap max-width set via inline style */
.page-background { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: -1; background: var(--bg); }
.page-background-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; opacity: 0.35; filter: blur(2px); }
.page-background-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(to bottom, rgba(13,17,23,0.5) 0%, rgba(13,17,23,0.8) 50%, rgba(13,17,23,0.95) 100%); }
.banner-edit-inline { margin-bottom: 12px; display: flex; justify-content: flex-end; }
.profile-header { display: flex; align-items: flex-start; gap: 20px; padding: 28px 0 24px; border-bottom: 1px solid var(--border); margin-bottom: 24px; flex-wrap: wrap; }
.profile-avatar { width: 80px; height: 80px; border-radius: 50%; background: var(--surface); border: 2px solid var(--border); overflow: hidden; flex-shrink: 0; position: relative; }
.profile-avatar.can-edit { cursor: pointer; }
.profile-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.profile-avatar-placeholder { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; }
.avatar-edit-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; color: #fff; font-size: 0.7rem; border-radius: 50%; }
.profile-avatar:hover .avatar-edit-overlay { opacity: 1; }
.profile-info { flex: 1; min-width: 200px; }
.profile-display-name { font-size: 1.8rem; font-weight: 700; color: #fff; margin-bottom: 2px; display: flex; align-items: center; gap: 10px; }
.profile-username { font-size: 0.85rem; color: var(--text-dim); margin-bottom: 8px; }
.edit-profile-btn { padding: 2px 8px; font-size: 0.75rem; margin-left: 8px; }
.social-links { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.social-link { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 0.8rem; color: var(--text-dim); background: var(--surface); border: 1px solid var(--border); text-decoration: none; transition: all .15s; }
.social-link:hover { color: var(--accent); border-color: var(--accent); text-decoration: none; }
.level-badge { font-size: 0.82rem; padding: 3px 10px; border-radius: 12px; font-weight: 600; border: 1px solid; }
.level-1 { color: #a3e635; border-color: #4d7c0f; background: #1a2e0a; }
.level-2 { color: #fbbf24; border-color: #92400e; background: #2a1a05; }
.level-3 { color: #f97316; border-color: #9a3412; background: #2a1005; }
.level-4 { color: #60a5fa; border-color: #1d4ed8; background: #0a1a3a; }
.level-5 { color: #e879f9; border-color: #7e22ce; background: #1a0a2a; }
.profile-stats { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
.stat-item { font-size: 0.85rem; color: var(--text-dim); }
.stat-item strong { color: var(--text); font-size: 1rem; display: block; }
.profile-actions { display: flex; gap: 8px; align-items: flex-start; flex-shrink: 0; }
.score-section { margin-bottom: 24px; }
.score-label { font-size: 0.82rem; color: var(--text-dim); margin-bottom: 6px; display: flex; justify-content: space-between; }
.score-bar { height: 6px; background: var(--border); border-radius: 3px; overflow: hidden; }
.score-fill { height: 100%; border-radius: 3px; background: linear-gradient(90deg, var(--accent) 0%, var(--accent2) 100%); transition: width .6s ease; }
.level-milestones { display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--text-dim); margin-top: 4px; }
.bio-section { margin-bottom: 28px; }
.section-title { font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.bio-content { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px 20px; line-height: 1.75; font-size: 0.9rem; min-height: 60px; }
.bio-content.empty { color: var(--text-dim); font-style: italic; }
.bio-editor { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.bio-editor-hint { font-size: 0.78rem; color: var(--text-dim); margin-top: 6px; }
.bio-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 8px; }
.plugin-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; margin-bottom: 24px; }
.grid-empty { grid-column: 1 / -1; text-align: center; color: var(--text-dim); padding: 48px; font-size: 0.95rem; }
.plugin-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; display: flex; flex-direction: column; transition: transform .15s, box-shadow .15s, border-color .15s; position: relative; }
.plugin-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,0.4); border-color: #4a4d57; }
.plugin-card.manage-mode { cursor: pointer; }
.plugin-card.selected { border-color: var(--accent); box-shadow: 0 0 0 2px rgba(74,158,255,0.3); }
.plugin-card-checkbox { position: absolute; top: 8px; left: 8px; z-index: 10; width: 24px; height: 24px; background: rgba(13,17,23,0.8); border: 2px solid var(--border); border-radius: 4px; display: none; align-items: center; justify-content: center; color: transparent; font-size: 14px; transition: all 0.2s; }
.plugin-card.manage-mode .plugin-card-checkbox { display: flex; }
.plugin-card.selected .plugin-card-checkbox { background: var(--accent); border-color: var(--accent); color: white; }
.card-cover { width: 100%; aspect-ratio: 16/9; overflow: hidden; background: #1a1b20; }
.card-cover img { width: 100%; height: 100%; object-fit: cover; display: block; }
.card-cover-placeholder { display: flex; align-items: center; justify-content: center; }
.cover-icon { font-size: 2.2rem; opacity: 0.3; }
.card-body { padding: 12px 14px 8px; flex: 1; display: flex; flex-direction: column; gap: 4px; }
.card-meta-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.card-category { font-size: 0.72rem; padding: 2px 8px; border-radius: 10px; font-weight: 600; }
.cat-gameplay { color: #74c0fc; border: 1px solid #2d4a6a; background: #12243a; }
.cat-cosmetic { color: #f783ac; border: 1px solid #6a2a4a; background: #3a1225; }
.cat-display { color: #b197fc; border: 1px solid #3d2a6a; background: #1f1232; }
.cat-tower { color: #ffa94d; border: 1px solid #6a4a1a; background: #3a2510; }
.cat-hero { color: #69db7c; border: 1px solid #1f5a2a; background: #0e2a15; }
.cat-enemy { color: #ff8787; border: 1px solid #6a2a2a; background: #3a1212; }
.cat-level { color: #ffe066; border: 1px solid #5a5010; background: #2a2808; }
.cat-other { color: #868e96; border: 1px solid #3a3b42; background: #1a1b20; }
.card-title { font-size: 0.95rem; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-desc { font-size: 0.8rem; color: var(--text-dim); line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.card-footer { padding: 8px 14px 10px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 6px; }
.card-stats { display: flex; gap: 10px; font-size: 0.75rem; color: var(--text-dim); flex-wrap: wrap; }
.card-actions { display: flex; gap: 5px; flex-wrap: wrap; }
.btn-sm { padding: 3px 9px; font-size: 0.78rem; border-radius: 4px; border: 1px solid var(--border); background: var(--surface); color: var(--text-dim); cursor: pointer; font-family: inherit; transition: all .15s; text-decoration: none; display: inline-block; }
.btn-sm:hover { background: #2a2b31; color: var(--text); text-decoration: none; }
.btn-detail-sm { border-color: #2d8ca8; color: #63c9e8; background: #0e2a35; }
.btn-download-sm { border-color: #2d7a4a; color: #69db7c; background: #0e2a1a; }
.btn-like { background: none; border: none; cursor: pointer; font-size: 0.85rem; color: var(--text-dim); padding: 2px 4px; border-radius: 4px; transition: color .15s; white-space: nowrap; }
.btn-like:hover { color: #ff6b6b; }
.btn-like.liked { color: #ff6b6b; }
.btn-like.favorited { color: #ffd43b; }
.btn-follow-dev { padding: 8px 16px; border: 1px solid #6c5ce7; background: #1e1845; color: #a29bfe; cursor: pointer; border-radius: 4px; font-size: 0.9rem; transition: all .2s; }
.btn-follow-dev:hover { background: #2d1f6e; transform: translateY(-1px); }
.btn-follow-dev.following { border-color: #a29bfe; color: #fff; background: #6c5ce7; }
.modal-backdrop { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.68); z-index: 100; align-items: center; justify-content: center; padding: 16px; }
.modal-backdrop.show { display: flex; }
.modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px 28px; max-width: 860px; width: 100%; box-shadow: 0 12px 40px rgba(0,0,0,0.6); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.modal-header h3 { margin: 0; font-size: 1.05rem; color: #fff; }
.modal-close { background: none; border: none; font-size: 22px; cursor: pointer; color: var(--text-dim); line-height: 1; transition: color .15s; }
.modal-close:hover { color: #fff; }
.readme-plugin-info { padding: 10px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border); margin-bottom: 12px; font-size: 0.83rem; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; }
.readme-plugin-info span { color: var(--text-dim); }
.readme-plugin-info strong { color: var(--text); }
.modal-body { max-height: 58vh; overflow-y: auto; padding: 10px 4px 0; line-height: 1.75; }
.not-found { text-align: center; padding: 80px 20px; color: var(--text-dim); }
.not-found h2 { color: #fff; margin-bottom: 12px; }
</style>
