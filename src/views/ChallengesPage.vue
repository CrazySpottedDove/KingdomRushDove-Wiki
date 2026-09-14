<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { mdToHtml } from '../utils/markdown'
import { t } from '../i18n'

const auth = useAuthStore()
const PAGE_SIZE = 12

const currentSort = ref<'default' | 'hot' | 'newest'>('default')
const currentPage = ref(1)
const currentSearch = ref('')
const totalChallenges = ref(0)
const currentItems = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')

const challengeTitle = ref('')
const challengeContent = ref('')
const publishStatus = ref('')
const publishStatusColor = ref('')

const showUserModal = ref(false)
const userTab = ref<'login' | 'register'>('login')
const loginUsername = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regPassword = ref('')
const userErr = ref('')

const showCommentsModal = ref(false)
const commentChallengeId = ref<number | null>(null)
const commentChallengeTitle = ref('')
const comments = ref<any[]>([])
const loadingComments = ref(false)
const commentContent = ref('')
const commentStatus = ref('')
const commentStatusColor = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

const totalPages = computed(() => Math.max(1, Math.ceil(totalChallenges.value / PAGE_SIZE)))

function fmtDate(s: string | null | undefined): string {
  return s ? s.slice(0, 16).replace('T', ' ') : '—'
}

async function fetchPage() {
  loading.value = true
  loadError.value = ''
  const params = new URLSearchParams({
    sort: currentSort.value,
    page: String(currentPage.value),
    limit: String(PAGE_SIZE),
  })
  if (currentSearch.value.trim()) params.set('q', currentSearch.value.trim())
  try {
    const resp = await fetch('/challenges/list?' + params)
    if (!resp.ok) throw new Error(await resp.text())
    const data = await resp.json()
    totalChallenges.value = data.total || 0
    currentItems.value = data.items || []
  } catch (e: any) {
    loadError.value = t('challenge.load_failed', { error: e.message || t('common.unknown') })
  } finally {
    loading.value = false
  }
}

function setPage(p: number) {
  if (p < 1 || p > totalPages.value) return
  currentPage.value = p
  fetchPage()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function setSort(mode: 'default' | 'hot' | 'newest') {
  currentSort.value = mode
  currentPage.value = 1
  fetchPage()
}

function onSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    currentPage.value = 1
    fetchPage()
  }, 350)
}

function toggleUser() {
  if (auth.isLoggedIn) {
    auth.clearUserAuth()
    fetchPage()
    return
  }
  userErr.value = ''
  loginUsername.value = ''
  loginPassword.value = ''
  regUsername.value = ''
  regPassword.value = ''
  userTab.value = 'login'
  showUserModal.value = true
}

function switchUserTab(tab: 'login' | 'register') {
  userTab.value = tab
  userErr.value = ''
}

async function confirmUser() {
  const isLogin = userTab.value === 'login'
  const username = (isLogin ? loginUsername.value : regUsername.value).trim()
  const password = isLogin ? loginPassword.value : regPassword.value
  if (!username || !password) {
    userErr.value = t('challenge.need_credentials')
    return
  }
  try {
    const resp = await fetch(isLogin ? '/plugins/login' : '/plugins/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (!resp.ok) {
      userErr.value = await resp.text()
      return
    }
    const data = await resp.json()
    auth.setUserAuth(data.username, data.token)
    await auth.loadChallengeLikes(data.token)
    showUserModal.value = false
    fetchPage()
  } catch (e: any) {
    userErr.value = t('challenge.network_error_detail_plain', { error: e.message })
  }
}

async function createChallenge() {
  const title = challengeTitle.value.trim()
  const content_md = challengeContent.value.trim()
  if (!auth.isLoggedIn) {
    publishStatusColor.value = 'var(--danger)'
    publishStatus.value = t('challenge.need_login')
    return
  }
  if (!title || !content_md) {
    publishStatusColor.value = 'var(--danger)'
    publishStatus.value = t('challenge.title_content_required')
    return
  }
  publishStatusColor.value = 'var(--text-dim)'
  publishStatus.value = t('challenge.posting')
  try {
    const resp = await fetch('/challenges', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.bearerHeaders(),
      },
      body: JSON.stringify({ title, content_md }),
    })
    if (!resp.ok) {
      if (resp.status === 401) auth.clearUserAuth()
      publishStatusColor.value = 'var(--danger)'
      publishStatus.value = '❌ ' + (await resp.text())
      return
    }
    challengeTitle.value = ''
    challengeContent.value = ''
    publishStatusColor.value = 'var(--accent2)'
    publishStatus.value = t('challenge.published')
    currentPage.value = 1
    await fetchPage()
    setTimeout(() => { publishStatus.value = '' }, 1500)
  } catch (e: any) {
    publishStatusColor.value = 'var(--danger)'
    publishStatus.value = t('challenge.network_error_detail', { error: e.message })
  }
}

async function deleteChallenge(id: number) {
  if (!confirm(t('challenge.delete_confirm'))) return
  try {
    const resp = await fetch(`/challenges/${id}`, {
      method: 'DELETE',
      headers: auth.bearerHeaders(),
    })
    if (!resp.ok) {
      if (resp.status === 401) auth.clearUserAuth()
      alert('❌ ' + (await resp.text()))
      return
    }
    await fetchPage()
  } catch (e: any) {
    alert(t('challenge.network_error_detail', { error: e.message }))
  }
}

async function toggleLike(id: number) {
  if (!auth.isLoggedIn) {
    toggleUser()
    return
  }
  const liked = auth.myLikes.has(id)
  try {
    const resp = await fetch(`/challenges/${id}/like`, {
      method: liked ? 'DELETE' : 'POST',
      headers: auth.bearerHeaders(),
    })
    if (!resp.ok) {
      if (resp.status === 401) auth.clearUserAuth()
      alert('❌ ' + (await resp.text()))
      return
    }
    const data = await resp.json()
    if (liked) auth.myLikes.delete(id)
    else auth.myLikes.add(id)
    const item = currentItems.value.find((x: any) => x.id === id)
    if (item) item.like_count = data.like_count
  } catch (e: any) {
    alert(t('challenge.network_error_detail', { error: e.message }))
  }
}

async function openComments(id: number, title: string) {
  commentChallengeId.value = id
  commentChallengeTitle.value = title
  comments.value = []
  loadingComments.value = true
  commentContent.value = ''
  commentStatus.value = ''
  showCommentsModal.value = true
  await loadComments(id)
}

async function loadComments(id: number) {
  try {
    const resp = await fetch(`/challenges/${id}/comments`)
    if (!resp.ok) throw new Error(await resp.text())
    comments.value = await resp.json()
  } catch {
    comments.value = []
  } finally {
    loadingComments.value = false
  }
}

async function postComment() {
  const content = commentContent.value.trim()
  if (!content) {
    commentStatus.value = t('challenge.empty_comment')
    commentStatusColor.value = 'var(--danger)'
    return
  }
  commentStatus.value = t('challenge.posting')
  commentStatusColor.value = 'var(--text-dim)'
  try {
    const resp = await fetch(`/challenges/${commentChallengeId.value}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...auth.bearerHeaders(),
      },
      body: JSON.stringify({ content }),
    })
    if (!resp.ok) {
      if (resp.status === 401) auth.clearUserAuth()
      commentStatus.value = '❌ ' + (await resp.text())
      commentStatusColor.value = 'var(--danger)'
      return
    }
    commentStatus.value = ''
    commentContent.value = ''
    await loadComments(commentChallengeId.value!)
    const item = currentItems.value.find((x: any) => x.id === commentChallengeId.value)
    if (item) item.comment_count = (item.comment_count || 0) + 1
  } catch (e: any) {
    commentStatus.value = t('challenge.network_error_detail', { error: e.message })
    commentStatusColor.value = 'var(--danger)'
  }
}

onMounted(async () => {
  await auth.restoreSession('challenges')
  await fetchPage()
})
</script>

<template>
  <div class="page-wrap" style="max-width:1100px;margin:0 auto;padding:0 16px 60px;">
    <div class="top-bar">
      <h1>{{ t('challenge.title') }}</h1>
      <div class="top-bar-actions">
        <button class="btn" :class="{ active: auth.isLoggedIn }" @click="toggleUser">
          {{ auth.isLoggedIn ? t('challenge.hero.logged_in', { name: auth.userAuth!.username }) : t('challenge.hero.login') }}
        </button>
      </div>
    </div>

    <div class="notice-box">
      <h2>{{ t('challenge.notice.title') }}</h2>
      <ul>
        <li>{{ t('challenge.notice.1') }}</li>
        <li>{{ t('challenge.notice.2') }}</li>
        <li>{{ t('challenge.notice.3') }}</li>
        <li>{{ t('challenge.notice.4') }}</li>
      </ul>
    </div>

    <div class="publish-box">
      <h2>{{ t('challenge.post.title') }}</h2>
      <div class="publish-hint" v-if="!auth.isLoggedIn">
        {{ t('challenge.login_hint') }}
      </div>
      <label>{{ t('challenge.field.title') }}</label>
      <input type="text" v-model="challengeTitle" :placeholder="t('challenge.title_placeholder')" maxlength="120" />
      <div style="height: 8px"></div>
      <label>{{ t('challenge.field.content') }}</label>
      <textarea v-model="challengeContent" :placeholder="t('challenge.content_placeholder')"></textarea>
      <div class="publish-hint">
        {{ t('challenge.example') }}
      </div>
      <div class="publish-actions">
        <span class="publish-hint" :style="{ color: publishStatusColor }">{{ publishStatus }}</span>
        <button class="btn btn-primary" @click="createChallenge">{{ t('challenge.publish') }}</button>
      </div>
    </div>

    <div class="tools-row">
      <button class="btn" :class="{ active: currentSort === 'default' }" @click="setSort('default')">{{ t('challenge.sort.default') }}</button>
      <button class="btn" :class="{ active: currentSort === 'hot' }" @click="setSort('hot')">{{ t('challenge.sort.hot') }}</button>
      <button class="btn" :class="{ active: currentSort === 'newest' }" @click="setSort('newest')">{{ t('challenge.sort.newest') }}</button>
      <input type="search" id="searchBox" :placeholder="t('challenge.search_placeholder')" v-model="currentSearch" @input="onSearch" />
    </div>

    <div class="challenge-grid">
      <template v-if="loading">
        <div style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:32px 0;">{{ t('common.loading') }}</div>
      </template>
      <template v-else-if="loadError">
        <div style="grid-column:1/-1;text-align:center;color:var(--danger);padding:32px 0;">{{ loadError }}</div>
      </template>
      <template v-else-if="currentItems.length === 0">
        <div style="grid-column:1/-1;text-align:center;color:var(--text-dim);padding:36px 0;">{{ t('challenge.empty') }}</div>
      </template>
      <template v-else>
        <div v-for="c in currentItems" :key="c.id" class="challenge-card">
          <div class="card-head">
            <div class="card-title">{{ c.title }}</div>
            <div class="card-meta">{{ t('challenge.card.meta', { author: c.author, date: fmtDate(c.created_at) }) }}</div>
          </div>
          <div class="card-body" v-html="mdToHtml(c.content_md)"></div>
          <div class="card-footer">
            <div class="card-stats">
              <span>👍 {{ c.like_count || 0 }}</span>
              <span>💬 {{ c.comment_count || 0 }}</span>
            </div>
            <div class="card-actions">
              <button class="btn btn-sm btn-like" :class="{ liked: auth.myLikes.has(c.id) }" @click="toggleLike(c.id)">{{ auth.myLikes.has(c.id) ? t('challenge.like.liked') : t('challenge.like.like') }}</button>
              <button class="btn btn-sm" @click="openComments(c.id, c.title)">{{ t('challenge.btn.comments') }}</button>
              <button v-if="auth.userAuth?.username === c.author" class="btn btn-sm btn-danger" @click="deleteChallenge(c.id)">{{ t('challenge.btn.delete') }}</button>
            </div>
          </div>
        </div>
      </template>
    </div>

    <div class="pagination" v-if="totalPages > 1">
      <button class="btn" :disabled="currentPage <= 1" @click="setPage(currentPage - 1)">‹ {{ t('common.prev') }}</button>
      <span style="font-size:0.83rem;color:var(--text-dim)">{{ t('challenge.page_info', { page: currentPage, total: totalPages, count: totalChallenges }) }}</span>
      <button class="btn" :disabled="currentPage >= totalPages" @click="setPage(currentPage + 1)">{{ t('common.next') }} ›</button>
    </div>
  </div>

  <div class="modal-backdrop" :class="{ show: showCommentsModal }" @click.self="showCommentsModal = false">
    <div class="modal">
      <div class="modal-header">
        <h3 id="commentsTitle">{{ t('challenge.comments.title', { title: commentChallengeTitle }) }}</h3>
        <button class="modal-close" @click="showCommentsModal = false">×</button>
      </div>
      <div class="comments-scroll" id="commentsList">
        <div v-if="loadingComments" style="text-align:center;color:var(--text-dim);padding:16px 0;">{{ t('common.loading') }}</div>
        <div v-else-if="comments.length === 0" style="text-align:center;color:var(--text-dim);padding:16px 0;">{{ t('challenge.comments.empty') }}</div>
        <template v-else>
          <div v-for="c in comments" :key="c.id || c.created_at" class="comment">
            <div class="comment-head">
              <span>{{ c.username }}</span>
              <span>{{ fmtDate(c.created_at) }}</span>
            </div>
            <div class="comment-body" v-html="mdToHtml(c.content)"></div>
          </div>
        </template>
      </div>
      <div class="comment-form">
        <template v-if="!auth.isLoggedIn">
          <p style="text-align:center;color:var(--text-dim);font-size:0.84rem;margin:4px 0;">
            <a href="javascript:void(0)" @click="showCommentsModal = false; toggleUser()" style="color:var(--accent2);">{{ t('challenge.comment_login.before') }}</a>{{ t('challenge.comment_login.after') }}
          </p>
        </template>
        <template v-else>
          <textarea v-model="commentContent" :placeholder="t('challenge.comment_placeholder')"></textarea>
          <div class="comment-form-actions">
            <span style="font-size:0.8rem;flex:1;" :style="{ color: commentStatusColor || 'var(--text-dim)' }">{{ commentStatus }}</span>
            <button class="btn btn-primary" @click="postComment">{{ t('challenge.comment.publish') }}</button>
          </div>
        </template>
      </div>
    </div>
  </div>

  <div class="modal-backdrop" :class="{ show: showUserModal }" @click.self="showUserModal = false">
    <div class="modal" style="width: min(420px, 96vw)">
      <div class="modal-header">
        <h3>{{ t('challenge.user.title') }}</h3>
        <button class="modal-close" @click="showUserModal = false">×</button>
      </div>
      <div class="modal-tabs">
        <button class="modal-tab" :class="{ active: userTab === 'login' }" @click="switchUserTab('login')">{{ t('challenge.user.tab.login') }}</button>
        <button class="modal-tab" :class="{ active: userTab === 'register' }" @click="switchUserTab('register')">{{ t('challenge.user.tab.register') }}</button>
      </div>
      <div id="loginForm" v-show="userTab === 'login'">
        <label>{{ t('challenge.user.username') }}</label>
        <input type="text" v-model="loginUsername" autocomplete="username" />
        <div style="height: 6px"></div>
        <label>{{ t('challenge.user.password') }}</label>
        <input type="password" v-model="loginPassword" autocomplete="current-password" />
      </div>
      <div id="registerForm" v-show="userTab === 'register'">
        <label>{{ t('challenge.user.username') }}</label>
        <input type="text" v-model="regUsername" autocomplete="username" />
        <div style="height: 6px"></div>
        <label>{{ t('challenge.user.password') }}</label>
        <input type="password" v-model="regPassword" autocomplete="new-password" />
      </div>
      <div class="modal-btns">
        <button class="btn" @click="showUserModal = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-primary" @click="confirmUser">{{ userTab === 'login' ? t('challenge.user.tab.login') : t('challenge.user.tab.register') }}</button>
      </div>
      <div class="modal-err" v-if="userErr">{{ userErr }}</div>
    </div>
  </div>
</template>

<style>

.top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin: 26px 0 14px;
}
.top-bar h1 {
  font-size: 1.5rem;
  color: #fff;
  margin: 0;
}
.top-bar-actions {
  display: flex;
  gap: 8px;
}
.notice-box {
  background: #1f2937;
  border: 1px solid #374151;
  border-left: 4px solid var(--accent);
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 14px;
}
.notice-box h2 {
  font-size: 1rem;
  margin: 0 0 8px;
}
.notice-box ul {
  margin: 0;
}
.publish-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 14px;
}
.publish-box h2 {
  font-size: 1rem;
  margin: 0 0 8px;
}
.publish-box textarea {
  width: 100%;
  min-height: 180px;
  resize: vertical;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 10px 12px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.6;
}
.publish-box textarea:focus {
  outline: none;
  border-color: var(--accent);
}
.publish-hint {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin-top: 6px;
}
.publish-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.tools-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.tools-row .btn.active {
  border-color: var(--accent);
  background: #1c3150;
  color: var(--accent);
}
#searchBox {
  width: 280px;
  max-width: 100%;
}
.challenge-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 12px;
}
.challenge-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  min-height: 260px;
  overflow: hidden;
}
.challenge-card:hover {
  border-color: var(--accent);
}
.card-head {
  padding: 12px 14px 0;
}
.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 6px;
  word-break: break-word;
}
.card-meta {
  font-size: 0.8rem;
  color: var(--text-dim);
}
.card-body {
  padding: 10px 14px;
  flex: 1;
  overflow: auto;
  font-size: 0.88rem;
}
.card-body h1,
.card-body h2,
.card-body h3 {
  font-size: 1rem;
  margin: 10px 0 6px;
}
.card-body p {
  margin: 0 0 8px;
}
.card-body pre {
  padding: 10px 12px;
  font-size: 0.8rem;
}
.card-footer {
  border-top: 1px solid var(--border);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.card-stats {
  font-size: 0.82rem;
  color: var(--text-dim);
  display: flex;
  gap: 10px;
}
.card-actions {
  display: flex;
  gap: 6px;
}
.btn-sm {
  padding: 4px 10px;
  font-size: 0.8rem;
}
.btn-like.liked {
  background: #4b1f24;
  border-color: #ff6b6b;
  color: #ff8787;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 14px;
  flex-wrap: wrap;
}
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: none;
  align-items: center;
  justify-content: center;
  padding: 18px;
  z-index: 1000;
}
.modal-backdrop.show {
  display: flex;
}
.modal {
  width: min(760px, 96vw);
  max-height: 90vh;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: auto;
  padding: 14px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.modal-close {
  background: transparent;
  border: none;
  color: var(--text-dim);
  font-size: 1.2rem;
  cursor: pointer;
}
.comments-scroll {
  max-height: 52vh;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px 10px;
  background: #1f2228;
}
.comment {
  border-bottom: 1px dashed var(--border);
  padding: 8px 2px;
}
.comment:last-child {
  border-bottom: none;
}
.comment-head {
  display: flex;
  gap: 8px;
  font-size: 0.78rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.comment-body p {
  margin: 0 0 6px;
}
.comment-body pre {
  padding: 8px 10px;
  font-size: 0.8rem;
}
.comment-form {
  margin-top: 10px;
}
.comment-form textarea {
  width: 100%;
  min-height: 90px;
  resize: vertical;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text);
  padding: 8px 10px;
  font-family: inherit;
}
.comment-form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.modal-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.modal-tab {
  padding: 6px 12px;
  background: var(--bg);
  color: var(--text-dim);
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
}
.modal-tab.active {
  color: #fff;
  border-color: var(--accent);
}
.modal-btns {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
.modal-err {
  margin-top: 8px;
  color: var(--danger);
  font-size: 0.84rem;
}
@media (max-width: 720px) {
  .challenge-grid {
    grid-template-columns: 1fr;
  }
  .tools-row {
    flex-direction: column;
    align-items: stretch;
  }
  #searchBox {
    width: 100%;
  }
}
</style>
