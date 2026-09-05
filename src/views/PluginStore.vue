<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useAuthStore } from '../stores/auth'
import { escHtml, mdToHtml } from '../utils/markdown'
import PluginCommentsModal from '../components/PluginCommentsModal.vue'

const auth = useAuthStore()

const FEATURE_COLLECTIONS_UI = false
const CATEGORIES = [
  { slug: '', icon: '🔍', name: '全部' },
  { slug: 'gameplay', icon: '🎮', name: '玩法' },
  { slug: 'cosmetic', icon: '🎨', name: '美化' },
  { slug: 'display', icon: '🖥️', name: '显示' },
  { slug: 'tower', icon: '🏰', name: '防御塔' },
  { slug: 'hero', icon: '🦸', name: '英雄' },
  { slug: 'enemy', icon: '👾', name: '敌人' },
  { slug: 'level', icon: '🗺️', name: '关卡' },
  { slug: 'other', icon: '📦', name: '其他' },
]
const PAGE_SIZE = 15

const currentSort = ref('hot')
const currentCategory = ref('')
const currentSearch = ref('')
const currentPage = ref(1)
const totalPlugins = ref(0)
const currentItems = ref<any[]>([])
const _searchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
const _pendingEntry = ref<string | null>(null)
const _commentEntry = ref<string | null>(null)
const commentPluginName = ref('')
const _userTab = ref('login')
const _zipFile = ref<File | null>(null)
const _coverFile = ref<File | null>(null)
const _coverPreviewUrl = ref<string | null>(null)
const _zipHasFile = ref(false)
const _zipFileName = ref('')
const _coverHasFile = ref(false)
const uploadStatusText = ref('')
const uploadStatusColor = ref('')

const loginUsername = ref('')
const loginPassword = ref('')
const regUsername = ref('')
const regPassword = ref('')
const userErr = ref('')
const adminTokenInput = ref('')
const adminErr = ref('')
const adminSubmitting = ref(false)
const collectionName = ref('')
const collectionDesc = ref('')
const collectionEntries = ref('')
const collectionErr = ref('')
const deleteName = ref('')
const deleteErr = ref('')

const notificationList = ref<any[]>([])
const notificationLoading = ref(false)
const collectionsList = ref<any[]>([])
const collectionsFilter = ref('all')
const collectionsLoading = ref(false)

const commentTag = ref('general')
const commentContent = ref('')
const commentStatus = ref('')
const repliesOpen = ref<Record<number, boolean>>({})
const replyContents = ref<Record<number, string>>({})

const __collectionPickMode = ref<{ collectionId: number; entries: string[] } | null>(null)

const zipDropZoneRef = ref<HTMLElement | null>(null)
const coverDropZoneRef = ref<HTMLElement | null>(null)
const coverPreviewRef = ref<HTMLElement | null>(null)
const searchBoxRef = ref<HTMLInputElement | null>(null)
const pluginGridRef = ref<HTMLElement | null>(null)
const paginationRef = ref<HTMLElement | null>(null)
const loginUsernameRef = ref<HTMLInputElement | null>(null)
const adminTokenInputRef = ref<HTMLInputElement | null>(null)
const commentTextareaRef = ref<HTMLTextAreaElement | null>(null)

const showCollectionModal = ref(false)
const showCollectionsListModal = ref(false)
const showNotificationsModal = ref(false)
const showUserModal = ref(false)
const showAdminModal = ref(false)
const showDeleteModal = ref(false)
const showDetailModal = ref(false)
const showCommentsModal = ref(false)

const detailTitle = ref('')
const detailPluginInfoHtml = ref('')
const detailContentHtml = ref('')


const totalPages = computed(() => Math.max(1, Math.ceil(totalPlugins.value / PAGE_SIZE)))

const isLoggedIn = computed(() => auth.userAuth !== null)

const userBtnLabel = computed(() => {
  if (auth.userAuth) return `👤 ${escHtml(auth.userAuth.username)} (退出)`
  return '👤 用户登录'
})
const userBtnActive = computed(() => !!auth.userAuth)

const adminBtnLabel = computed(() => {
  if (auth.adminToken) return '🔓 退出管理员'
  return '🔑 管理员'
})
const adminBtnActive = computed(() => !!auth.adminToken)

const meBtnDisplay = computed(() => auth.userAuth ? 'inline-flex' : 'none')
const meBtnHref = computed(() => {
  if (auth.userAuth) return `/developer/${encodeURIComponent(auth.userAuth.username)}`
  return '/developer/me'
})
const meAvatarHtml = computed(() => {
  if (auth.userAuth) {
    return `<img src="/api/users/${encodeURIComponent(auth.userAuth.username)}/avatar" alt="me" loading="lazy" onerror="this.parentElement.textContent='👤'" />`
  }
  return '👤'
})

const uploadLoginNoticeDisplay = computed(() => auth.userAuth ? 'none' : 'block')

const detailModalTitle = computed(() => detailTitle.value)

const encURI = (s: string) => encodeURIComponent(s)
const fmtDate = (s: string | null | undefined) => s ? s.slice(0, 10) : '—'

onMounted(() => {
  auth.restoreSession('plugins').then(() => {
    fetchPage()
  })
  const w = window as any
  w.__setPage = (p: number) => { currentPage.value = p; fetchPage() }
  w.__toggleCategory = (cat: string) => { currentCategory.value = cat; currentPage.value = 1; fetchPage() }
  w.__toggleFavorite = (e: Event, entry: string) => toggleFavorite(e, entry)
  w.__toggleLike = (e: Event, entry: string) => toggleLike(e, entry)
  w.__showDetail = (entry: string) => showDetail(entry)
  w.__showComments = (entry: string) => showComments(entry)
  w.__toggleUser = () => toggleUser()
  w.__openDelete = (entry: string) => openDelete(entry)
  w.__confirmDelete = () => confirmDelete()
  w.__setCollectionsFilter = (mode: string) => setCollectionsFilter(mode)
  w.__toggleCollectionFollow = (id: number, followed: boolean) => toggleCollectionFollow(id, followed)
  w.__deleteCollection = (id: number, name: string) => deleteCollection(id, name)
})

onUnmounted(() => {
  delete (window as any).__setPage
  delete (window as any).__toggleCategory
  delete (window as any).__toggleFavorite
  delete (window as any).__toggleLike
  delete (window as any).__showDetail
  delete (window as any).__showComments
  delete (window as any).__toggleUser
  delete (window as any).__openDelete
  delete (window as any).__confirmDelete
  delete (window as any).__setCollectionsFilter
  delete (window as any).__toggleCollectionFollow
  delete (window as any).__deleteCollection
})

function getCategory(slug: string) {
  return CATEGORIES.find(c => c.slug === slug) || CATEGORIES[CATEGORIES.length - 1]
}

function canModify(p: any) {
  if (auth.adminToken) return true
  if (auth.userAuth && p.by === auth.userAuth.username) return true
  return false
}

function setCategory(cat: string) {
  currentCategory.value = cat
  currentPage.value = 1
  fetchPage()
}

function setSort(mode: string) {
  currentSort.value = mode
  currentPage.value = 1
  fetchPage()
}

function onSearch() {
  if (_searchTimer.value) clearTimeout(_searchTimer.value)
  _searchTimer.value = setTimeout(() => {
    currentPage.value = 1
    fetchPage()
  }, 400)
}

async function fetchPage() {
  if (!pluginGridRef.value) return
  pluginGridRef.value.innerHTML =
    '<div class="grid-loading" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">加载中…</div>'
  const params = new URLSearchParams({
    sort: currentSort.value,
    page: String(currentPage.value),
    limit: String(PAGE_SIZE),
  })
  if (currentCategory.value) params.set('category', currentCategory.value)
  if (currentSearch.value.trim()) params.set('q', currentSearch.value.trim())
  try {
    const resp = await fetch('/plugins/list?' + params)
    if (resp.ok) {
      const data = await resp.json()
      totalPlugins.value = data.total || 0
      currentItems.value = data.items || []
      const items = currentItems.value
      const pages = totalPages.value
      if (items.length === 0) {
        pluginGridRef.value.innerHTML =
          '<div class="grid-empty" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">📭 暂无插件</div>'
      } else {
        pluginGridRef.value.innerHTML = items.map(p => renderCardHtml(p)).join('')
      }
      renderPagination(totalPlugins.value, pages)
      return
    }
  } catch (_) {}
  pluginGridRef.value.innerHTML =
    '<div class="grid-empty" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">加载失败，请刷新重试</div>'
  renderPagination(0, 1)
}

function renderPagination(total: number, pages: number) {
  const el = paginationRef.value
  if (!el) return
  if (pages <= 1) {
    el.innerHTML = ''
    return
  }
  const show = new Set(
    [1, pages, currentPage.value, currentPage.value - 1, currentPage.value + 1]
      .filter(p => p >= 1 && p <= pages),
  )
  const sorted = [...show].sort((a, b) => a - b)
  let html = `<button class="page-btn" onclick="window.__setPage(${currentPage.value - 1})" ${currentPage.value === 1 ? 'disabled' : ''}>‹</button>`
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) html += '<span class="page-ellipsis">…</span>'
    html += `<button class="page-btn${p === currentPage.value ? ' active' : ''}" onclick="window.__setPage(${p})">${p}</button>`
    prev = p
  }
  html += `<button class="page-btn" onclick="window.__setPage(${currentPage.value + 1})" ${currentPage.value === pages ? 'disabled' : ''}>›</button>`
  html += `<span style="font-size:0.8rem;color:var(--text-dim);margin-left:6px">共 ${total} 个</span>`
  el.innerHTML = html
}
;(window as any).__setPage = (p: number) => {
  currentPage.value = p
  fetchPage()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function renderCardHtml(p: any): string {
  const liked = auth.myLikes.has(p.entry)
  const favorited = auth.myFollows.has(p.entry)
  const cat = getCategory(p.category)
  const coverUrl = p.has_cover
    ? `/plugins/${encodeURIComponent(p.entry)}/cover?size=thumb`
    : null
  const coverHtml = coverUrl
    ? `<div class="card-cover"><img src="${coverUrl}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span class=cover-icon>${escHtml(cat.icon)}</span>';this.parentElement.classList.add('card-cover-placeholder')" /></div>`
    : `<div class="card-cover card-cover-placeholder"><span class="cover-icon">${escHtml(cat.icon)}</span></div>`
  const catName = escHtml(cat.name)
  const entry = escHtml(p.entry)
  const pname = escHtml(p.name)
  const pby = escHtml(p.by)
  const version = escHtml(p.version)
  const desc = escHtml(p.desc)
  const filename = encodeURIComponent(p.filename)
  const catSlug = escHtml(p.category)
  const likeBtn = liked ? '❤' : '🤍'
  const likeTitle = liked ? '取消点赞' : '点赞'
  const likeCls = liked ? ' liked' : ''
  const favBtn = favorited ? '⭐' : '☆'
  const favTitle = favorited ? '取消收藏' : '收藏插件'
  const favCls = favorited ? ' favorited' : ''
  const deleteBtn = canModify(p)
    ? `<button class="btn-sm btn-danger-sm" onclick="window.__openDelete('${entry}')">🗑 删除</button>`
    : ''
  return `<div class="plugin-card" id="card-${entry}">
    ${coverHtml}
    <div class="card-body">
      <div class="card-meta-row">
        <span class="card-category cat-${catSlug}">${cat.icon} ${catName}</span>
        <div style="display: flex; gap: 4px;">
          <button class="btn-like${favCls}" data-kind="favorite"
            onclick="window.__toggleFavorite(event,'${entry}')"
            title="${favTitle}"
            style="min-width: 28px;">
            ${favBtn}
          </button>
          <button class="btn-like${likeCls}" data-kind="like"
            onclick="window.__toggleLike(event,'${entry}')"
            title="${likeTitle}">
            ${likeBtn}<span id="likes-${entry}">${p.like_count || 0}</span>
          </button>
        </div>
      </div>
      <div class="card-title" title="${pname}">${pname}</div>
      <div class="card-author">
        <a href="/developer/${encodeURIComponent(p.by)}" class="author-avatar-link" title="进入 ${pby} 的主页">
          <img src="/api/users/${encodeURIComponent(p.by)}/avatar" alt="${pby}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='👤';" />
        </a>
        <a href="/developer/${encodeURIComponent(p.by)}" class="author-link" title="查看${pby}的主页">${pby}</a>
        <span class="card-version">v${version}</span>
      </div>
      <div class="card-desc">${desc}</div>
    </div>
    <div class="card-footer">
      <div class="card-stats">
        <span title="下载量">⬇ ${p.downloads}</span>
        <span title="评论数">💬 ${p.comment_count || 0}</span>
        <span title="发布日期">📅 ${fmtDate(p.published_at)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-sm btn-detail-sm"  onclick="window.__showDetail('${entry}')">📄 详情</button>
        <button class="btn-sm btn-comment-sm" onclick="window.__showComments('${entry}')">💬 评论</button>
        <a class="btn-sm btn-download-sm"     href="/plugins/download/${filename}">⬇ 下载</a>
        ${deleteBtn}
      </div>
    </div>
  </div>`
}
;(window as any).__openDelete = (entry: string) => openDelete(entry)
;(window as any).__toggleFavorite = (event: Event, entry: string) => toggleFavorite(event, entry)
;(window as any).__toggleLike = (event: Event, entry: string) => toggleLike(event, entry)
;(window as any).__showDetail = (entry: string) => showDetail(entry)
;(window as any).__showComments = (entry: string) => showComments(entry)

function closeModal(id: string) {
  if (id === 'collectionModal') showCollectionModal.value = false
  else if (id === 'collectionsListModal') showCollectionsListModal.value = false
  else if (id === 'notificationsModal') showNotificationsModal.value = false
  else if (id === 'userModal') showUserModal.value = false
  else if (id === 'adminModal') showAdminModal.value = false
  else if (id === 'deleteModal') showDeleteModal.value = false
  else if (id === 'detailModal') showDetailModal.value = false
  else if (id === 'commentsModal') showCommentsModal.value = false
}

function onBackdropClick(e: MouseEvent, id: string) {
  if (e.target === e.currentTarget) closeModal(id)
}

// ── User modal ──
function toggleUser() {
  if (auth.userAuth) {
    auth.clearUserAuth()
    fetchPage()
    return
  }
  userErr.value = ''
  loginUsername.value = ''
  loginPassword.value = ''
  regUsername.value = ''
  regPassword.value = ''
  switchUserTab('login')
  showUserModal.value = true
  nextTick(() => loginUsernameRef.value?.focus())
}

function switchUserTab(tab: string) {
  _userTab.value = tab
  userErr.value = ''
}

async function confirmUser() {
  if (_userTab.value === 'login') {
    const username = loginUsername.value.trim()
    const password = loginPassword.value
    if (!username || !password) {
      userErr.value = '请填写用户名和密码'
      return
    }
    try {
      const resp = await fetch('/plugins/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (resp.ok) {
        const data = await resp.json()
        auth.setUserAuth(data.username, data.token)
        await auth.loadUserReactionState(data.token)
        showUserModal.value = false
        fetchPage()
      } else {
        userErr.value = '❌ ' + (await resp.text())
      }
    } catch (e: any) {
      userErr.value = '❌ 网络错误：' + e.message
    }
  } else {
    const username = regUsername.value.trim()
    const password = regPassword.value
    if (!username || !password) {
      userErr.value = '请填写用户名和密码'
      return
    }
    try {
      const resp = await fetch('/plugins/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      if (resp.ok) {
        const data = await resp.json()
        auth.setUserAuth(data.username, data.token)
        showUserModal.value = false
        fetchPage()
      } else {
        userErr.value = '❌ ' + (await resp.text())
      }
    } catch (e: any) {
      userErr.value = '❌ 网络错误：' + e.message
    }
  }
}

// ── Admin modal ──
function toggleAdmin() {
  if (auth.adminToken) {
    auth.clearAdminToken()
    fetchPage()
    return
  }
  adminErr.value = ''
  adminTokenInput.value = ''
  showAdminModal.value = true
  nextTick(() => adminTokenInputRef.value?.focus())
}

async function confirmAdmin() {
  const token = adminTokenInput.value.trim()
  if (!token) {
    adminErr.value = '请输入 Token'
    return
  }
  adminSubmitting.value = true
  adminErr.value = ''
  try {
    const resp = await fetch('/api/admin/traffic?hours=1&days=1', {
      headers: { 'X-Admin-Token': token },
    })
    if (!resp.ok) {
      adminErr.value = resp.status === 401 ? '管理员 Token 不正确' : '验证失败，请稍后重试'
      return
    }
    auth.setAdminToken(token)
    showAdminModal.value = false
    fetchPage()
  } catch {
    adminErr.value = '网络错误，请稍后重试'
  } finally {
    adminSubmitting.value = false
  }
}

// ── Upload ──
function onZipSelected(input: HTMLInputElement) {
  const f = input.files?.[0]
  if (f) {
    _zipFile.value = f
    _zipHasFile.value = true
    _zipFileName.value = f.name
  }
}

function onCoverSelected(input: HTMLInputElement) {
  const f = input.files?.[0]
  if (f) setCoverFile(f)
}

function setCoverFile(f: File) {
  _coverFile.value = f
  _coverHasFile.value = true
  const reader = new FileReader()
  reader.onload = (e) => {
    _coverPreviewUrl.value = e.target?.result as string
  }
  reader.readAsDataURL(f)
}

async function uploadPlugin() {
  uploadStatusColor.value = ''
  if (!auth.userAuth) {
    uploadStatusColor.value = 'var(--danger)'
    uploadStatusText.value = '请先登录账户'
    return
  }
  const zipFile = _zipFile.value
  if (!zipFile) {
    uploadStatusColor.value = 'var(--danger)'
    uploadStatusText.value = '请先选择 .zip 文件'
    return
  }
  uploadStatusColor.value = 'var(--text-dim)'
  uploadStatusText.value = '上传中…'
  try {
    const resp = await fetch('/plugins/upload', {
      method: 'POST',
      headers: auth.bearerHeaders() as Record<string, string>,
      body: zipFile,
    })
    const text = await resp.text()
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearUserAuth()
        uploadStatusColor.value = 'var(--danger)'
        uploadStatusText.value = '❌ 登录已失效'
        return
      }
      uploadStatusColor.value = 'var(--danger)'
      uploadStatusText.value = '❌ ' + text
      return
    }
    const result = JSON.parse(text)
    const entry = result.entry
    const coverFile = _coverFile.value
    if (coverFile && entry) {
      uploadStatusText.value = '上传封面图…'
      await fetch(`/plugins/${encodeURIComponent(entry)}/cover`, {
        method: 'POST',
        headers: auth.bearerHeaders() as Record<string, string>,
        body: coverFile,
      })
    }
    uploadStatusColor.value = 'var(--accent2)'
    uploadStatusText.value = '✅ 上传成功！'
    setTimeout(() => {
      _zipFile.value = null
      _coverFile.value = null
      _zipHasFile.value = false
      _zipFileName.value = ''
      _coverHasFile.value = false
      _coverPreviewUrl.value = null
      fetchPage()
      uploadStatusText.value = ''
    }, 1500)
  } catch (e: any) {
    uploadStatusColor.value = 'var(--danger)'
    uploadStatusText.value = '❌ 网络错误：' + e.message
  }
}

// ── Like/Favorite ──
async function toggleLike(event: Event, entry: string) {
  event.stopPropagation()
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  const liked = auth.myLikes.has(entry)
  const method = liked ? 'DELETE' : 'POST'
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/like`, {
      method,
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (resp.ok) {
      const data = await resp.json()
      if (liked) auth.myLikes.delete(entry)
      else auth.myLikes.add(entry)
      const p = currentItems.value.find(x => x.entry === entry)
      if (p) p.like_count = data.like_count
      const cardEl = document.getElementById(`card-${entry}`)
      const likeBtn = cardEl?.querySelector('.btn-like[data-kind="like"]') as HTMLElement
      if (likeBtn) {
        likeBtn.classList.toggle('liked', !liked)
        likeBtn.title = liked ? '点赞' : '取消点赞'
        likeBtn.innerHTML = `${!liked ? '❤' : '🤍'}<span id="likes-${entry}">${data.like_count}</span>`
      }
    } else if (resp.status === 401) {
      auth.clearUserAuth()
      toggleUser()
    } else {
      const msg = await resp.text()
      alert('点赞操作失败：' + (msg || `HTTP ${resp.status}`))
    }
  } catch (e: any) {
    alert('网络错误: ' + (e?.message || e))
  }
}

async function toggleFavorite(event: Event, entry: string) {
  event.stopPropagation()
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  const favorited = auth.myFollows.has(entry)
  const method = favorited ? 'DELETE' : 'POST'
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/follow`, {
      method,
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (resp.ok) {
      if (favorited) auth.myFollows.delete(entry)
      else auth.myFollows.add(entry)
      const cardEl = document.getElementById(`card-${entry}`)
      if (cardEl) {
        const favBtn = cardEl.querySelector('.btn-like[data-kind="favorite"]') as HTMLElement
        if (favBtn) {
          favBtn.classList.toggle('favorited', !favorited)
          favBtn.title = favorited ? '收藏插件' : '取消收藏'
          favBtn.textContent = !favorited ? '⭐' : '☆'
        }
      }
    } else if (resp.status === 401) {
      auth.clearUserAuth()
      toggleUser()
    }
  } catch (_) {}
}

// ── Detail modal ──
async function showDetail(entry: string) {
  const plugin = currentItems.value.find(p => p.entry === entry)
  if (!plugin) return
  detailTitle.value = plugin.name
  const cat = getCategory(plugin.category)
  detailPluginInfoHtml.value = `<div><span>版本</span><br><strong>${escHtml(plugin.version)}</strong></div>
    <div><span>作者</span><br><a href="/developer/${encodeURIComponent(plugin.by)}" target="_blank" style="color:var(--accent2)">${escHtml(plugin.by)}</a></div>
    <div><span>分类</span><br><strong>${cat.icon} ${escHtml(cat.name)}</strong></div>
    <div><span>下载量</span><br><strong>${plugin.downloads}</strong></div>
    <div><span>发布日期</span><br><strong>${fmtDate(plugin.published_at)}</strong></div>`
  detailContentHtml.value = '<div style="text-align:center;padding:20px;color:#666">加载中…</div>'
  showDetailModal.value = true
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(entry) + '/readme')
    if (resp.ok) {
      const text = await resp.text()
      detailContentHtml.value = mdToHtml(text)
    } else {
      detailContentHtml.value = `<p style="color:var(--text-dim);text-align:center">作者暂未提供详细介绍。</p><p style="color:var(--text-dim);text-align:center">${escHtml(plugin.desc)}</p>`
    }
  } catch (e: any) {
    detailContentHtml.value = '加载失败：' + e.message
  }
}

// ── Comments modal ──
function showComments(entry: string) {
  const plugin = currentItems.value.find(p => p.entry === entry)
  _commentEntry.value = entry
  commentPluginName.value = plugin?.name || entry
  showCommentsModal.value = true
}

function onCommentCountChange(entry: string, count: number) {
  const p = currentItems.value.find(x => x.entry === entry)
  if (p) p.comment_count = count
}

// ── Change cover ──
function changeCover(entry: string) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const file = input.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('封面图不能超过 2MB')
      return
    }
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/cover`, {
      method: 'POST',
      headers: auth.bearerHeaders() as Record<string, string>,
      body: file,
    })
    if (resp.ok) {
      const card = document.getElementById(`card-${entry}`)
      if (card) {
        const img = card.querySelector('.card-cover img') as HTMLImageElement | null
        const url = `/plugins/${encodeURIComponent(entry)}/cover?size=thumb&t=${Date.now()}`
        if (img) {
          img.src = url
        } else {
          const cover = card.querySelector('.card-cover') as HTMLElement
          if (cover) cover.innerHTML = `<img src="${url}" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover;display:block">`
        }
      }
    } else {
      alert('封面上传失败：' + (await resp.text()))
    }
  }
  input.click()
}

// ── Delete ──
function openDelete(entry: string) {
  const p = currentItems.value.find(x => x.entry === entry)
  _pendingEntry.value = entry
  deleteName.value = p ? p.name : entry
  deleteErr.value = ''
  showDeleteModal.value = true
}

async function confirmDelete() {
  const p = currentItems.value.find(x => x.entry === _pendingEntry.value)
  if (!p) {
    showDeleteModal.value = false
    return
  }
  const headers = auth.adminToken ? auth.adminHeaders() : auth.bearerHeaders()
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(p.entry), {
      method: 'DELETE',
      headers: headers as Record<string, string>,
    })
    if (resp.ok) {
      showDeleteModal.value = false
      await fetchPage()
    } else if (resp.status === 401) {
      if (auth.adminToken) auth.clearAdminToken()
      else auth.clearUserAuth()
      showDeleteModal.value = false
      alert('认证已失效，请重新登录')
    } else {
      deleteErr.value = '❌ ' + (await resp.text())
    }
  } catch (e: any) {
    deleteErr.value = '❌ 网络错误：' + e.message
  }
}

// ── Collections ──
function openCollectionModal() {
  if (!FEATURE_COLLECTIONS_UI) return
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  collectionErr.value = ''
  collectionName.value = ''
  collectionDesc.value = ''
  collectionEntries.value = ''
  showCollectionModal.value = true
}

async function openCollectionsListModal() {
  if (!FEATURE_COLLECTIONS_UI) return
  collectionsLoading.value = true
  collectionsList.value = []
  showCollectionsListModal.value = true
  try {
    const resp = await fetch('/collections', {
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (!resp.ok) {
      collectionsLoading.value = false
      return
    }
    const list = await resp.json()
    const showing = collectionsFilter.value === 'mine' && auth.userAuth
      ? list.filter((x: any) => x.creator_username === auth.userAuth!.username)
      : list
    collectionsList.value = showing
    collectionsLoading.value = false
  } catch (_) {
    collectionsLoading.value = false
  }
}

function setCollectionsFilter(mode: string) {
  if (!FEATURE_COLLECTIONS_UI) return
  collectionsFilter.value = mode
  openCollectionsListModal()
}

async function toggleCollectionFollow(collectionId: number, followed: boolean) {
  if (!FEATURE_COLLECTIONS_UI) return
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  try {
    const resp = await fetch(`/collections/${collectionId}/follow`, {
      method: followed ? 'DELETE' : 'POST',
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (!resp.ok) {
      alert('整合包关注操作失败：' + (await resp.text()))
      return
    }
    if (followed) auth.myCollectionFollows.delete(collectionId)
    else auth.myCollectionFollows.add(collectionId)
    await openCollectionsListModal()
  } catch (e: any) {
    alert('网络错误：' + e.message)
  }
}

async function showCollectionPicker(collectionId: number) {
  if (!FEATURE_COLLECTIONS_UI) return
  if (!auth.userAuth) return
  showCollectionsListModal.value = false
  await fetchPage()
  const picker = document.createElement('div')
  picker.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:120;display:flex;align-items:center;justify-content:center;padding:16px;'
  const items = (currentItems.value || []).map(p =>
    `<label style="display:flex;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)"><input type="checkbox" value="${escHtml(p.entry)}"/> <span>${escHtml(p.name)} <small style="color:var(--text-dim)">(${escHtml(p.entry)})</small></span></label>`,
  ).join('')
  picker.innerHTML = `<div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;max-width:680px;width:100%;padding:14px;max-height:70vh;display:flex;flex-direction:column;">
    <div style="font-weight:700;color:#fff;margin-bottom:8px">选择要加入整合包的插件</div>
    <div style="overflow:auto;flex:1">${items || '<div style="color:var(--text-dim)">当前列表为空</div>'}</div>
    <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px">
      <button class="btn" id="pickerCancel">取消</button>
      <button class="btn btn-primary" id="pickerOk">确定</button>
    </div>
  </div>`
  document.body.appendChild(picker)
  picker.querySelector('#pickerCancel')!.addEventListener('click', () => picker.remove())
  picker.querySelector('#pickerOk')!.addEventListener('click', () => {
    const entries = Array.from(picker.querySelectorAll('input[type=checkbox]:checked')).map((i: any) => i.value)
    picker.remove()
    if (!entries.length) return
    __collectionPickMode.value = { collectionId, entries }
    openCollectionModal()
    collectionName.value = `整合包-${Date.now()}`
    collectionDesc.value = '通过卡片选择插件'
    collectionEntries.value = ''
  })
}

async function deleteCollection(collectionId: number, name: string) {
  if (!FEATURE_COLLECTIONS_UI) return
  if (!auth.userAuth) return
  if (!confirm(`确定删除整合包「${name}」吗？`)) return
  try {
    const resp = await fetch(`/collections/${collectionId}`, {
      method: 'DELETE',
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (!resp.ok) {
      alert('删除失败：' + (await resp.text()))
      return
    }
    await openCollectionsListModal()
  } catch (e: any) {
    alert('删除失败：' + e.message)
  }
}

async function createCollectionFromEntries() {
  if (!FEATURE_COLLECTIONS_UI) return
  collectionErr.value = ''
  if (!auth.userAuth) {
    collectionErr.value = '请先登录'
    return
  }
  const name = collectionName.value.trim()
  const description = collectionDesc.value.trim()
  const raw = collectionEntries.value.trim()
  if (!name) {
    collectionErr.value = '请输入整合包名称'
    return
  }
  let entries = raw.split(/\r?\n/).map(s => s.trim()).filter(Boolean).map(line => {
    const [entry, version] = line.split('@').map(x => x.trim())
    return { entry, version: version || '' }
  })
  if ((!raw || !raw.trim()) && __collectionPickMode.value && Array.isArray(__collectionPickMode.value.entries)) {
    entries = __collectionPickMode.value.entries.map((entry, idx) => ({ entry, version: '', sort_order: idx }))
  }
  if (entries.length === 0) {
    collectionErr.value = '请至少输入一个插件 entry'
    return
  }
  const dedup = new Map<string, any>()
  for (const item of entries) dedup.set(item.entry, item)
  const uniqueEntries = [...dedup.values()]
  try {
    const createResp = await fetch('/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
      body: JSON.stringify({ name, description, is_public: true }),
    })
    if (!createResp.ok) {
      collectionErr.value = '创建整合包失败：' + (await createResp.text())
      return
    }
    const created = await createResp.json()
    const cid = created.id
    const failed: string[] = []
    for (let i = 0; i < uniqueEntries.length; i++) {
      const item = uniqueEntries[i]
      const r = await fetch(`/collections/${cid}/plugins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
        body: JSON.stringify({ entry: item.entry, sort_order: i }),
      })
      if (!r.ok) failed.push(item.entry)
    }
    if (failed.length > 0) {
      await fetch(`/collections/${cid}`, { method: 'DELETE', headers: auth.bearerHeaders() as Record<string, string> })
      collectionErr.value = `以下 entry 未上架或无效，已取消创建：${failed.join(', ')}`
      return
    }
    __collectionPickMode.value = null
    showCollectionModal.value = false
    alert('整合包创建成功，可在后续页面中继续管理和分发。')
  } catch (e: any) {
    collectionErr.value = '网络错误：' + e.message
  }
}

// ── Notifications ──
async function openNotificationsModal() {
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  notificationLoading.value = true
  notificationList.value = []
  showNotificationsModal.value = true
  try {
    const resp = await fetch('/notifications', {
      headers: auth.bearerHeaders() as Record<string, string>,
    })
    if (!resp.ok) {
      notificationLoading.value = false
      return
    }
    notificationList.value = await resp.json()
    notificationLoading.value = false
  } catch (_) {
    notificationLoading.value = false
  }
}

async function markAllNotificationsRead() {
  if (!auth.userAuth) return
  await fetch('/notifications/read_all', {
    method: 'PUT',
    headers: auth.bearerHeaders() as Record<string, string>,
  })
  openNotificationsModal()
}

async function openNotificationSettings() {
  if (!auth.userAuth) return
  const resp = await fetch('/notifications/settings', {
    headers: auth.bearerHeaders() as Record<string, string>,
  })
  if (!resp.ok) {
    alert('加载通知设置失败')
    return
  }
  const s = await resp.json()
  const reply = confirm(`是否开启"被回复通知"？\n当前：${s.reply_notifications ? '开启' : '关闭'}`)
  await fetch('/notifications/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
    body: JSON.stringify({ reply_notifications: reply }),
  })
  alert('通知设置已更新（当前仅示例入口，后续会做完整设置面板）')
}

// ── Drop zones init ──
function initDropZones() {
  const zoneZip = zipDropZoneRef.value
  if (zoneZip) {
    zoneZip.addEventListener('dragover', (e) => {
      e.preventDefault()
      zoneZip.classList.add('dragover')
    })
    zoneZip.addEventListener('dragleave', () => zoneZip.classList.remove('dragover'))
    zoneZip.addEventListener('drop', (e) => {
      e.preventDefault()
      zoneZip.classList.remove('dragover')
      const f = e.dataTransfer?.files[0]
      if (f && f.name.endsWith('.zip')) {
        _zipFile.value = f
        _zipHasFile.value = true
        _zipFileName.value = f.name
      }
    })
  }
  const zoneCover = coverDropZoneRef.value
  if (zoneCover) {
    zoneCover.addEventListener('dragover', (e) => {
      e.preventDefault()
      zoneCover.classList.add('dragover')
    })
    zoneCover.addEventListener('dragleave', () => zoneCover.classList.remove('dragover'))
    zoneCover.addEventListener('drop', (e) => {
      e.preventDefault()
      zoneCover.classList.remove('dragover')
      const f = e.dataTransfer?.files[0]
      if (f && f.type.startsWith('image/')) setCoverFile(f)
    })
  }
}

// ── Keyboard handler ──
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    showUserModal.value = false
    showAdminModal.value = false
    showDeleteModal.value = false
    showDetailModal.value = false
    showCommentsModal.value = false
  }
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  initDropZones()
  await auth.restoreSession('plugins')
  fetchPage()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
})

// ── Packs ────────────────────────────────────────────────────────────────────
// 整合包（Pack）子视图：同页切换（?view=packs）。以下全部为新增独立段，
// 不影响上方插件视图任何既有逻辑。全局回调统一使用 __pack* 前缀。
const PACK_PAGE_SIZE = 15
const PACK_PICKER_LIMIT = 20

const storeView = ref<'plugins' | 'packs'>(getInitialStoreView())
const packGridRef = ref<HTMLElement | null>(null)
const packPaginationRef = ref<HTMLElement | null>(null)
const packSort = ref<'newest' | 'downloads' | 'hot'>('newest')
const packSearch = ref('')
const packPage = ref(1)
const packTotal = ref(0)
const packItems = ref<any[]>([])
const packFilter = ref<'all' | 'mine'>('all')
const _packSearchTimer = ref<ReturnType<typeof setTimeout> | null>(null)
// mine 过滤：服务端不支持按作者分页，整包拉取后本地缓存分页
let _packMineAll: any[] | null = null
let _packMineKey = ''

// pack 详情弹窗
const showPackDetailModal = ref(false)
const packDetailTitle = ref('')
const packDetailEntry = ref('')
const packDetailFilename = ref('')
const packDetailInfoHtml = ref('')
const packDetailCoverHtml = ref('')
const packDetailContentHtml = ref('')
const packDetailCanModify = ref(false)
const packDetailLoading = ref(false)

// pack 创建弹窗（表单）
const showPackCreateModal = ref(false)
const packCreateErr = ref('')
const packCreateSubmitting = ref(false)
const packFormName = ref('')
const packFormVersion = ref('')
const packFormDesc = ref('')
const packFormReadme = ref('')
const packFormEntry = ref('')
const packMembers = ref<string[]>([])
const packMemberManualInput = ref('')
const packPickerItems = ref<any[]>([])
const packPickerTotal = ref(0)
const packPickerPage = ref(1)
const packPickerSearch = ref('')
const packPickerCat = ref('')
const packPickerLoading = ref(false)
const _packPickerTimer = ref<ReturnType<typeof setTimeout> | null>(null)

// pack 上传弹窗
const showPackUploadModal = ref(false)
const packUploadErr = ref('')
const packUploadSubmitting = ref(false)
const packUploadFileName = ref('')
const packUploadBody = ref('')
const packUploadFileInput = ref<HTMLInputElement | null>(null)

// 操作结果提示（pack 面板内）
const packNotice = ref<{ text: string; entry?: string } | null>(null)
let _packNoticeTimer: ReturnType<typeof setTimeout> | null = null

function getInitialStoreView(): 'plugins' | 'packs' {
  try {
    if (new URLSearchParams(window.location.search).get('view') === 'packs') return 'packs'
  } catch (_) { /* ignore */ }
  return 'plugins'
}

function updateStoreViewUrl(view: 'plugins' | 'packs') {
  try {
    const url = new URL(window.location.href)
    if (view === 'packs') url.searchParams.set('view', 'packs')
    else url.searchParams.delete('view')
    window.history.replaceState(null, '', url.pathname + url.search + url.hash)
  } catch (_) { /* ignore */ }
}

function switchStoreView(view: 'plugins' | 'packs') {
  if (storeView.value === view) return
  storeView.value = view
  updateStoreViewUrl(view)
  if (view === 'packs') {
    fetchPacks()
  }
}

function packCloseModal(id: string) {
  if (id === 'packDetailModal') showPackDetailModal.value = false
  else if (id === 'packCreateModal') showPackCreateModal.value = false
  else if (id === 'packUploadModal') showPackUploadModal.value = false
}

function packOnBackdropClick(e: MouseEvent, id: string) {
  if (e.target === e.currentTarget) packCloseModal(id)
}

function packShowNotice(text: string, entry?: string) {
  packNotice.value = { text, entry }
  if (_packNoticeTimer) clearTimeout(_packNoticeTimer)
  _packNoticeTimer = setTimeout(() => {
    packNotice.value = null
    _packNoticeTimer = null
  }, 10000)
}

function packClearNotice() {
  packNotice.value = null
  if (_packNoticeTimer) {
    clearTimeout(_packNoticeTimer)
    _packNoticeTimer = null
  }
}

function packInvalidateMineCache() {
  _packMineAll = null
  _packMineKey = ''
}

function isMyPack(p: any) {
  return !!auth.userAuth && !!p && p.by === auth.userAuth.username
}

function canModifyPack(p: any) {
  return !!auth.adminToken || isMyPack(p)
}

// ── Packs: fetch / render grid (window-callback pattern，参照插件网格) ──
async function fetchPacks() {
  const grid = packGridRef.value
  if (!grid) return
  grid.innerHTML =
    '<div class="grid-loading" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">加载中…</div>'
  try {
    if (packFilter.value === 'mine') {
      if (!auth.userAuth) {
        packFilter.value = 'all'
      } else {
        const mineAll = await fetchMinePacks()
        const pages = Math.max(1, Math.ceil(mineAll.length / PACK_PAGE_SIZE))
        if (packPage.value > pages) packPage.value = pages
        const start = (packPage.value - 1) * PACK_PAGE_SIZE
        packItems.value = mineAll.slice(start, start + PACK_PAGE_SIZE)
        packTotal.value = mineAll.length
        renderPackGrid()
        renderPackPagination(packTotal.value, pages)
        return
      }
    }
    let data: any = null
    for (let attempt = 0; attempt < 3; attempt++) {
      const params = new URLSearchParams({
        page: String(packPage.value),
        limit: String(PACK_PAGE_SIZE),
        sort: packSort.value,
      })
      if (packSearch.value.trim()) params.set('q', packSearch.value.trim())
      const resp = await fetch('/packs/list?' + params.toString())
      if (!resp.ok) throw new Error('HTTP ' + resp.status)
      data = await resp.json()
      packTotal.value = data.total || 0
      const pages = Math.max(1, Math.ceil(packTotal.value / PACK_PAGE_SIZE))
      if (packPage.value > pages) {
        // 删除/搜索后当前页可能越界：回退到最后一页重新拉取
        packPage.value = pages
        continue
      }
      break
    }
    packItems.value = data?.items || []
    renderPackGrid()
    renderPackPagination(packTotal.value, Math.max(1, Math.ceil(packTotal.value / PACK_PAGE_SIZE)))
  } catch (e: any) {
    grid.innerHTML =
      '<div class="grid-empty" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">📦 加载失败，请刷新重试</div>'
    renderPackPagination(0, 1)
  }
}

async function fetchMinePacks(): Promise<any[]> {
  const key = packSort.value + '|' + packSearch.value.trim().toLowerCase()
  if (_packMineAll && _packMineKey === key) return _packMineAll
  const mine: any[] = []
  let page = 1
  const limit = 50
  for (let guard = 0; guard < 12; guard++) {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      sort: packSort.value,
    })
    if (packSearch.value.trim()) params.set('q', packSearch.value.trim())
    try {
      const resp = await fetch('/packs/list?' + params.toString())
      if (!resp.ok) break
      const data = await resp.json()
      const items: any[] = data.items || []
      const me = auth.userAuth?.username
      for (const p of items) {
        if (p.by === me) mine.push(p)
      }
      const total: number = data.total || 0
      if (items.length === 0 || page * limit >= total) break
      page++
    } catch {
      break
    }
  }
  _packMineAll = mine
  _packMineKey = key
  return mine
}

function packSetSort(mode: 'newest' | 'downloads' | 'hot') {
  if (packSort.value === mode) return
  packSort.value = mode
  packPage.value = 1
  packInvalidateMineCache()
  fetchPacks()
}

function packSetFilter(mode: 'all' | 'mine') {
  if (packFilter.value === mode) return
  if (mode === 'mine' && !auth.userAuth) {
    toggleUser()
    return
  }
  packFilter.value = mode
  packPage.value = 1
  fetchPacks()
}

function onPackSearch() {
  if (_packSearchTimer.value) clearTimeout(_packSearchTimer.value)
  _packSearchTimer.value = setTimeout(() => {
    packPage.value = 1
    packInvalidateMineCache()
    fetchPacks()
  }, 400)
}

function packSetPage(p: number) {
  if (p < 1) return
  packPage.value = p
  fetchPacks()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function renderPackGrid() {
  const grid = packGridRef.value
  if (!grid) return
  if (!packItems.value.length) {
    grid.innerHTML =
      '<div class="grid-empty" style="grid-column:1/-1;padding:48px;text-align:center;color:#666">📦 暂无整合包</div>'
    return
  }
  grid.innerHTML = packItems.value.map(p => packCardHtml(p)).join('')
}

function renderPackPagination(total: number, pages: number) {
  const el = packPaginationRef.value
  if (!el) return
  if (pages <= 1) {
    el.innerHTML = ''
    return
  }
  const show = new Set(
    [1, pages, packPage.value, packPage.value - 1, packPage.value + 1]
      .filter(p => p >= 1 && p <= pages),
  )
  const sorted = [...show].sort((a, b) => a - b)
  let html = `<button class="page-btn" onclick="window.__packSetPage(${packPage.value - 1})" ${packPage.value === 1 ? 'disabled' : ''}>‹</button>`
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) html += '<span class="page-ellipsis">…</span>'
    html += `<button class="page-btn${p === packPage.value ? ' active' : ''}" onclick="window.__packSetPage(${p})">${p}</button>`
    prev = p
  }
  html += `<button class="page-btn" onclick="window.__packSetPage(${packPage.value + 1})" ${packPage.value === pages ? 'disabled' : ''}>›</button>`
  html += `<span style="font-size:0.8rem;color:var(--text-dim);margin-left:6px">共 ${total} 个</span>`
  el.innerHTML = html
}

function packCardHtml(p: any): string {
  const entry = escHtml(p.entry)
  const pname = escHtml(p.name)
  const pby = escHtml(p.by)
  const version = escHtml(p.version)
  const desc = p.desc ? escHtml(p.desc) : '<span style="color:var(--text-dim)">暂无简介</span>'
  const byUrl = encodeURIComponent(p.by)
  const entryUrl = encodeURIComponent(p.entry)
  const filename = encodeURIComponent(p.filename || p.entry + '.lua')
  const coverHtml = p.has_cover
    ? `<div class="card-cover"><img src="/packs/${entryUrl}/cover" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span class=cover-icon>📦</span>';this.parentElement.classList.add('card-cover-placeholder')" /></div>`
    : `<div class="card-cover card-cover-placeholder"><span class="cover-icon">📦</span></div>`
  const mine = isMyPack(p)
  const deleteBtn = canModifyPack(p)
    ? `<button class="btn-sm btn-danger-sm" onclick="window.__packDelete('${entry}')">🗑 删除</button>`
    : ''
  const coverBtn = mine
    ? `<button class="btn-sm btn-pack-cover-sm" onclick="window.__packCover('${entry}')">🎨 封面</button>`
    : ''
  return `<div class="plugin-card pack-card" id="pack-card-${entry}">
    ${coverHtml}
    <div class="card-body">
      <div class="pack-card-title-row">
        <div class="card-title" title="${pname}">${pname}</div>
        <span class="card-version">v${version}</span>
      </div>
      <div class="card-author">
        <a href="/developer/${byUrl}" class="author-avatar-link" title="进入 ${pby} 的主页">
          <img src="/api/users/${byUrl}/avatar" alt="${pby}" loading="lazy" onerror="this.style.display='none';this.parentElement.textContent='👤';" />
        </a>
        <a href="/developer/${byUrl}" class="author-link" title="查看${pby}的主页">${pby}</a>
      </div>
      <div class="card-desc">${desc}</div>
    </div>
    <div class="card-footer">
      <div class="card-stats">
        <span title="包含插件数">🧩 ${p.plugin_count || 0} 个插件</span>
        <span title="下载量">⬇ ${p.downloads || 0}</span>
        <span title="发布日期">📅 ${fmtDate(p.published_at)}</span>
      </div>
      <div class="card-actions">
        <button class="btn-sm btn-detail-sm" onclick="window.__packShowDetail('${entry}')">📄 详情</button>
        <a class="btn-sm btn-download-sm" href="/packs/download/${filename}">⬇ 下载(.zip)</a>
        ${coverBtn}${deleteBtn}
      </div>
      <div class="pack-card-hint">游戏内安装可自动补装成员插件并支持更新/卸载</div>
    </div>
  </div>`
}

// ── Packs: detail modal ──
async function packShowDetail(entry: string) {
  const local = packItems.value.find(p => p.entry === entry)
  packDetailTitle.value = local?.name || entry
  packDetailEntry.value = entry
  packDetailFilename.value = ''
  packDetailInfoHtml.value = ''
  packDetailCoverHtml.value = ''
  packDetailCanModify.value = false
  packDetailLoading.value = true
  packDetailContentHtml.value =
    '<div style="text-align:center;padding:24px;color:#666">加载中…</div>'
  showPackDetailModal.value = true
  try {
    const resp = await fetch('/packs/' + encodeURIComponent(entry))
    if (!resp.ok) {
      packDetailContentHtml.value =
        '<p style="color:var(--danger);text-align:center">加载失败（HTTP ' + resp.status + '）</p>'
      packDetailLoading.value = false
      return
    }
    const data = await resp.json()
    const pack = data.pack || {}
    const readme: string = typeof data.readme === 'string' ? data.readme : ''
    const members: any[] = Array.isArray(data.members) ? data.members : []
    packDetailEntry.value = pack.entry || entry
    packDetailFilename.value = pack.filename || ''
    packDetailTitle.value = pack.name || pack.entry || entry
    packDetailCanModify.value = canModifyPack(pack)
    if (pack.has_cover) {
      const url = '/packs/' + encodeURIComponent(packDetailEntry.value) + '/cover?t=' + Date.now()
      packDetailCoverHtml.value =
        `<img src="${url}" alt="" loading="lazy" onerror="this.parentElement.style.display='none'" />`
    }
    const author = pack.by
      ? `<a href="/developer/${encodeURIComponent(pack.by)}" target="_blank" style="color:var(--accent2)">${escHtml(pack.by)}</a>`
      : '—'
    packDetailInfoHtml.value = `<div><span>版本</span><br><strong>${escHtml(pack.version)}</strong></div>
    <div><span>作者</span><br>${author}</div>
    <div><span>包含插件</span><br><strong>🧩 ${pack.plugin_count ?? members.length}</strong></div>
    <div><span>下载量</span><br><strong>${pack.downloads ?? 0}</strong></div>
    <div><span>发布日期</span><br><strong>${fmtDate(pack.published_at)}</strong></div>
    <div><span>entry</span><br><strong>${escHtml(pack.entry)}</strong></div>`
    let readmeHtml: string
    if (readme.trim()) {
      readmeHtml = mdToHtml(readme)
    } else if (pack.desc) {
      readmeHtml = `<div class="pack-desc-fallback">${escHtml(pack.desc)}</div>`
    } else {
      readmeHtml = '<p style="color:var(--text-dim);text-align:center">作者暂未提供简介。</p>'
    }
    packDetailContentHtml.value = readmeHtml + packMembersHtml(members)
    packDetailLoading.value = false
  } catch (e: any) {
    packDetailContentHtml.value =
      '<p style="color:var(--danger);text-align:center">加载失败：' + escHtml(e?.message || String(e)) + '</p>'
    packDetailLoading.value = false
  }
}

function packMembersHtml(members: any[]): string {
  if (!members.length) return ''
  const rows = members.map(m => {
    const mentry = escHtml(m.entry || '')
    const displayName = m.name ? escHtml(m.name) : mentry
    const version = m.exists ? (m.version ? escHtml(m.version) : '—') : '—'
    const author = m.exists
      ? (m.author
          ? `<a href="/developer/${encodeURIComponent(m.author)}" target="_blank" style="color:var(--accent2)">${escHtml(m.author)}</a>`
          : '—')
      : '—'
    const downloads = m.exists ? (m.downloads ?? 0) : '—'
    const offBadge = m.exists ? '' : ' <span class="pack-off-badge">已下架</span>'
    const viewBtn = m.exists
      ? `<button class="btn-sm btn-detail-sm" onclick="window.__packJumpToPlugin('${mentry}')">查看插件</button>`
      : ''
    return `<tr>
      <td><span class="pack-member-name">${displayName}</span>${offBadge}<div class="pack-member-entry">${mentry}</div></td>
      <td>${version}</td><td>${author}</td><td>${downloads}</td><td>${viewBtn}</td>
    </tr>`
  }).join('')
  return `<div class="pack-members-block">
    <div class="pack-members-title">🧩 成员插件（${members.length}）</div>
    <div class="pack-table-wrap"><table class="pack-member-table">
      <thead><tr><th>插件</th><th>版本</th><th>作者</th><th>下载量</th><th></th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>
  </div>`
}

async function packJumpToPlugin(entry: string) {
  // 先关掉整合包详情并切回插件商店视图（不改动插件视图既有列表状态）
  packCloseModal('packDetailModal')
  storeView.value = 'plugins'
  updateStoreViewUrl('plugins')
  // 1) 当前插件列表已含该条目 → 直接打开详情弹窗
  if (currentItems.value.some(p => p.entry === entry)) {
    showDetail(entry)
    return
  }
  // 2) 否则批量查询一次（POST /plugins/entries），命中则补入列表并打开详情
  try {
    const resp = await fetch('/plugins/entries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entries: [entry] }),
    })
    if (resp.ok) {
      const data = await resp.json()
      const item = (data.items || []).find((p: any) => p.entry === entry)
      if (item) {
        if (!currentItems.value.some(p => p.entry === entry)) {
          currentItems.value.unshift(item)
        }
        showDetail(entry)
        return
      }
    }
  } catch (e: any) {
    // 网络失败走回退路径
    console.error('packJumpToPlugin /plugins/entries 失败：', e)
  }
  // 3) 未命中 → 回退：切到插件商店并把 entry 作为搜索词，提示找不到
  currentSearch.value = entry
  currentPage.value = 1
  fetchPage()
  window.scrollTo({ top: 0, behavior: 'smooth' })
  alert(`插件「${entry}」未在商店上架或查询失败，已切换到插件商店搜索。`)
}

// ── Packs: delete ──
async function packDeleteEntry(entry: string, name: string) {
  if (!confirm(`确定删除整合包「${name}」？\npack.lua/README 与封面将一并删除，此操作不可撤销。`)) return
  const headers = auth.adminToken
    ? auth.adminHeaders()
    : auth.bearerHeaders()
  if (!auth.adminToken && !auth.userAuth) {
    toggleUser()
    return
  }
  try {
    const resp = await fetch('/packs/' + encodeURIComponent(entry), {
      method: 'DELETE',
      headers: headers as Record<string, string>,
    })
    if (resp.ok) {
      packShowNotice(`🗑 已删除整合包「${name}」`)
      packInvalidateMineCache()
      packCloseModal('packDetailModal')
      fetchPacks()
    } else if (resp.status === 401) {
      if (auth.adminToken) auth.clearAdminToken()
      else auth.clearUserAuth()
      packCloseModal('packDetailModal')
      alert('认证已失效，请重新登录')
    } else {
      alert('删除失败：' + (await resp.text()))
    }
  } catch (e: any) {
    alert('删除失败：' + e.message)
  }
}

// ── Packs: create (form) ──
function packOpenCreateModal() {
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  packCreateErr.value = ''
  packFormName.value = ''
  packFormVersion.value = '1.0.0'
  packFormDesc.value = ''
  packFormReadme.value = ''
  packFormEntry.value = ''
  packMembers.value = []
  packMemberManualInput.value = ''
  packPickerSearch.value = ''
  packPickerCat.value = ''
  packPickerPage.value = 1
  packPickerItems.value = []
  packPickerTotal.value = 0
  showPackCreateModal.value = true
  packPickerLoad(1)
}

async function packPickerLoad(page: number) {
  packPickerLoading.value = true
  packPickerItems.value = []
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(PACK_PICKER_LIMIT),
      sort: 'newest',
    })
    if (packPickerSearch.value.trim()) params.set('q', packPickerSearch.value.trim())
    if (packPickerCat.value) params.set('category', packPickerCat.value)
    const resp = await fetch('/plugins/list?' + params.toString())
    if (resp.ok) {
      const data = await resp.json()
      packPickerItems.value = data.items || []
      packPickerTotal.value = data.total || 0
      packPickerPage.value = page
    }
  } catch (_) {
    packPickerItems.value = []
    packPickerTotal.value = 0
  } finally {
    packPickerLoading.value = false
  }
}

function packSetPickerCat(cat: string) {
  if (packPickerCat.value === cat) return
  packPickerCat.value = cat
  packPickerLoad(1)
}

function onPackPickerSearch() {
  if (_packPickerTimer.value) clearTimeout(_packPickerTimer.value)
  _packPickerTimer.value = setTimeout(() => {
    packPickerLoad(1)
  }, 350)
}

function packPickerPrev() {
  if (packPickerPage.value > 1) packPickerLoad(packPickerPage.value - 1)
}

function packPickerNext() {
  const totalPages = Math.max(1, Math.ceil(packPickerTotal.value / PACK_PICKER_LIMIT))
  if (packPickerPage.value < totalPages) packPickerLoad(packPickerPage.value + 1)
}

function packToggleMember(entry: string, checked: boolean) {
  if (checked) {
    if (!packMembers.value.includes(entry)) packMembers.value.push(entry)
  } else {
    packMembers.value = packMembers.value.filter(e => e !== entry)
  }
}

function packAddManualMember() {
  const raw = packMemberManualInput.value
  const parts = raw.split(/[\s,，;；]+/).map(s => s.trim()).filter(Boolean)
  if (!parts.length) return
  const added: string[] = []
  for (const part of parts) {
    const entry = part.replace(/^@/, '')
    if (!/^[A-Za-z0-9_-]+$/.test(entry)) {
      packCreateErr.value = `「${entry}」不是合法的插件 entry（仅字母/数字/_/-）`
      continue
    }
    if (!packMembers.value.includes(entry)) {
      packMembers.value.push(entry)
      added.push(entry)
    }
  }
  packMemberManualInput.value = ''
  if (added.length) packCreateErr.value = ''
}

function packRemoveMember(entry: string) {
  packMembers.value = packMembers.value.filter(e => e !== entry)
}

async function packCreateSubmit() {
  packCreateErr.value = ''
  if (!auth.userAuth) {
    packCreateErr.value = '请先登录'
    return
  }
  const name = packFormName.value.trim()
  const version = packFormVersion.value.trim()
  if (!name) {
    packCreateErr.value = '请输入整合包名称'
    return
  }
  if (name.length > 60) {
    packCreateErr.value = '名称不能超过 60 字符'
    return
  }
  if (!version) {
    packCreateErr.value = '请输入版本号'
    return
  }
  if (version.length > 30) {
    packCreateErr.value = '版本不能超过 30 字符'
    return
  }
  const entries = packMembers.value.filter(Boolean)
  if (!entries.length) {
    packCreateErr.value = '请至少选择一个成员插件'
    return
  }
  const entry = packFormEntry.value.trim()
  if (entry && !/^[A-Za-z0-9_-]+$/.test(entry)) {
    packCreateErr.value = 'entry 只能包含字母、数字、下划线或中划线（留空则自动生成）'
    return
  }
  packCreateSubmitting.value = true
  try {
    const body: Record<string, unknown> = { name, version, entries }
    if (packFormDesc.value.trim()) body.desc = packFormDesc.value.trim()
    if (packFormReadme.value.trim()) body.readme = packFormReadme.value
    if (entry) body.entry = entry
    const resp = await fetch('/packs/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
      body: JSON.stringify(body),
    })
    const text = await resp.text()
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearUserAuth()
        packCreateErr.value = '登录已失效，请重新登录'
        return
      }
      packCreateErr.value = '❌ ' + text
      return
    }
    let createdEntry = ''
    try {
      createdEntry = (JSON.parse(text) as any).entry || ''
    } catch (_) { /* ignore */ }
    packCloseModal('packCreateModal')
    packInvalidateMineCache()
    packShowNotice(`✅ 创建成功！整合包 entry = ${createdEntry || name}`, createdEntry || name)
    fetchPacks()
  } catch (e: any) {
    packCreateErr.value = '❌ 网络错误：' + e.message
  } finally {
    packCreateSubmitting.value = false
  }
}

// ── Packs: upload pack.lua ──
function packOpenUploadModal() {
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  packUploadErr.value = ''
  packUploadBody.value = ''
  packUploadFileName.value = ''
  showPackUploadModal.value = true
  nextTick(() => {
    if (packUploadFileInput.value) packUploadFileInput.value.value = ''
  })
}

function onPackUploadFileSelected(input: HTMLInputElement) {
  const f = input.files?.[0]
  if (!f) return
  if (f.size > 2 * 1024 * 1024) {
    packUploadErr.value = '文件过大，请控制在 2MB 以内'
    return
  }
  const reader = new FileReader()
  reader.onload = () => {
    packUploadBody.value = String(reader.result || '')
    packUploadFileName.value = f.name
    packUploadErr.value = ''
  }
  reader.readAsText(f)
}

async function packUploadSubmit() {
  packUploadErr.value = ''
  if (!auth.userAuth) {
    packUploadErr.value = '请先登录'
    return
  }
  const body = packUploadBody.value
  if (!body.trim()) {
    packUploadErr.value = '请选择 .lua/.txt 文件，或直接粘贴 pack.lua 内容'
    return
  }
  packUploadSubmitting.value = true
  try {
    const resp = await fetch('/packs/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain', ...auth.bearerHeaders() } as Record<string, string>,
      body,
    })
    const text = await resp.text()
    if (!resp.ok) {
      if (resp.status === 401) {
        auth.clearUserAuth()
        packUploadErr.value = '登录已失效，请重新登录'
        return
      }
      packUploadErr.value = '❌ ' + text
      return
    }
    let entry = ''
    try {
      entry = (JSON.parse(text) as any).entry || ''
    } catch (_) { /* ignore */ }
    packCloseModal('packUploadModal')
    packInvalidateMineCache()
    packShowNotice(`✅ 上传成功！entry = ${entry}`, entry)
    fetchPacks()
  } catch (e: any) {
    packUploadErr.value = '❌ 网络错误：' + e.message
  } finally {
    packUploadSubmitting.value = false
  }
}

// ── Packs: cover upload (作者对“我的整合包”行内) ──
function packUploadCover(entry: string) {
  if (!auth.userAuth) {
    toggleUser()
    return
  }
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async () => {
    const f = input.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      alert('封面图不能超过 5MB')
      return
    }
    try {
      const resp = await fetch(`/packs/${encodeURIComponent(entry)}/cover`, {
        method: 'POST',
        headers: auth.bearerHeaders() as Record<string, string>,
        body: f,
      })
      if (resp.ok) {
        packRefreshCardCover(entry)
        const p = packItems.value.find(x => x.entry === entry)
        if (p) p.has_cover = true
        packShowNotice('✅ 封面已更新')
      } else if (resp.status === 401) {
        auth.clearUserAuth()
        alert('登录已失效，请重新登录')
      } else {
        alert('封面上传失败：' + (await resp.text()))
      }
    } catch (e: any) {
      alert('网络错误：' + e.message)
    }
  }
  input.click()
}

function packRefreshCardCover(entry: string) {
  const card = document.getElementById('pack-card-' + entry)
  if (!card) return
  const cover = card.querySelector('.card-cover') as HTMLElement | null
  if (!cover) return
  const url = `/packs/${encodeURIComponent(entry)}/cover?t=${Date.now()}`
  cover.classList.remove('card-cover-placeholder')
  cover.innerHTML = `<img src="${url}" alt="" loading="lazy" onerror="this.parentElement.innerHTML='<span class=cover-icon>📦</span>';this.parentElement.classList.add('card-cover-placeholder')" />`
}

// ── Packs: window helpers ──
function packRegisterWindowHelpers() {
  const w = window as any
  w.__packSetPage = (p: number) => packSetPage(p)
  w.__packShowDetail = (entry: string) => packShowDetail(entry)
  w.__packDelete = (entry: string) => {
    const p = packItems.value.find(x => x.entry === entry)
    packDeleteEntry(entry, p ? p.name : entry)
  }
  w.__packCover = (entry: string) => packUploadCover(entry)
  w.__packJumpToPlugin = (entry: string) => packJumpToPlugin(entry)
}

function packUnregisterWindowHelpers() {
  const w = window as any
  delete w.__packSetPage
  delete w.__packShowDetail
  delete w.__packDelete
  delete w.__packCover
  delete w.__packJumpToPlugin
}

function onPackKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    packCloseModal('packDetailModal')
    packCloseModal('packCreateModal')
    packCloseModal('packUploadModal')
  }
}

function onStorePopState() {
  const v = getInitialStoreView()
  if (v !== storeView.value) {
    storeView.value = v
    if (v === 'packs') fetchPacks()
  }
}

onMounted(() => {
  packRegisterWindowHelpers()
  document.addEventListener('keydown', onPackKeydown)
  window.addEventListener('popstate', onStorePopState)
  if (storeView.value === 'packs') fetchPacks()
})
onUnmounted(() => {
  packUnregisterWindowHelpers()
  document.removeEventListener('keydown', onPackKeydown)
  window.removeEventListener('popstate', onStorePopState)
  if (_packSearchTimer.value) clearTimeout(_packSearchTimer.value)
  if (_packPickerTimer.value) clearTimeout(_packPickerTimer.value)
  if (_packNoticeTimer) clearTimeout(_packNoticeTimer)
})

// 登录态变化会改变卡片上的“我发布的”按钮（删除/传封面）与 mine 过滤可用性，
// 位于 packs 视图时重新拉取网格（不影响插件视图逻辑）
watch(
  () => auth.userAuth,
  () => {
    if (storeView.value === 'packs') {
      packInvalidateMineCache()
      fetchPacks()
    }
  },
)
</script>

<template>
  <div class="page-wrap" style="max-width:clamp(900px,94vw,1500px);">
    <!-- ── Top bar ── -->
    <div class="top-bar">
      <h1>{{ storeView === 'packs' ? '📦 整合包商店' : '🧩 插件商店' }}</h1>
      <div class="view-switch" id="storeViewSwitch">
        <button
          type="button"
          class="view-switch-btn"
          :class="{ active: storeView === 'plugins' }"
          @click="switchStoreView('plugins')"
        >
          🧩 插件
        </button>
        <button
          type="button"
          class="view-switch-btn"
          :class="{ active: storeView === 'packs' }"
          @click="switchStoreView('packs')"
        >
          📦 整合包
        </button>
      </div>
      <div class="top-bar-actions">
        <button
          v-if="FEATURE_COLLECTIONS_UI"
          class="btn btn-collection"
          @click="openCollectionModal()"
        >
          🧰 创建整合包
        </button>
        <button
          v-if="FEATURE_COLLECTIONS_UI"
          class="btn"
          @click="openCollectionsListModal()"
        >
          📚 整合包广场
        </button>
        <button class="btn" @click="openNotificationsModal()">
          🔔 消息
        </button>
        <a
          class="btn btn-me"
          id="myProfileBtn"
          :href="meBtnHref"
          :style="{ display: meBtnDisplay }"
          title="进入我的主页"
        >
          <span class="btn-me-avatar" id="myProfileAvatar" v-html="meAvatarHtml"></span>
          <span>我的主页</span>
        </a>
        <button
          class="btn btn-user"
          :class="{ active: userBtnActive }"
          id="userBtn"
          @click="toggleUser()"
        >
          {{ userBtnLabel }}
        </button>
        <button
          class="btn btn-admin"
          :class="{ active: adminBtnActive }"
          id="adminBtn"
          @click="toggleAdmin()"
        >
          {{ adminBtnLabel }}
        </button>
      </div>
    </div>

    <!-- ── Packs view (v-show to keep refs & state; toggled by storeView) ── -->
    <div class="packs-panel" v-show="storeView === 'packs'">
      <div class="packs-toolbar">
        <div class="packs-actions">
          <button class="btn btn-pack-create" @click="packOpenCreateModal()">🧰 创建整合包</button>
          <button class="btn btn-pack-upload" @click="packOpenUploadModal()">📤 上传 pack.lua</button>
          <span class="packs-actions-divider"></span>
          <button class="chip" :class="{ active: packFilter === 'all' }" @click="packSetFilter('all')">全部</button>
          <button
            v-if="auth.userAuth"
            class="chip"
            :class="{ active: packFilter === 'mine' }"
            @click="packSetFilter('mine')"
          >我发布的</button>
        </div>
        <div class="packs-notice" v-if="packNotice">
          <span>{{ packNotice.text }}</span>
          <button v-if="packNotice.entry" class="btn-sm btn-detail-sm" @click="packShowDetail(packNotice.entry || '')">📄 查看</button>
          <button class="btn-sm" title="关闭" @click="packClearNotice()">×</button>
        </div>
        <div class="search-sort-row">
          <input
            type="search"
            v-model="packSearch"
            placeholder="搜索整合包名称、作者或描述…"
            @input="onPackSearch()"
            autocomplete="off"
          />
          <div class="sort-btns">
            <button class="btn-sort" :class="{ active: packSort === 'newest' }" @click="packSetSort('newest')">🆕 最新</button>
            <button class="btn-sort" :class="{ active: packSort === 'downloads' }" @click="packSetSort('downloads')">⬇ 下载</button>
            <button class="btn-sort" :class="{ active: packSort === 'hot' }" @click="packSetSort('hot')">🔥 热度</button>
          </div>
        </div>
        <p class="pack-install-hint">
          在游戏内「游戏 → 插件管理器 → 商店 → 整合包」安装可自动补装全部成员插件并支持更新/卸载；
          网页端下载为 entry.zip（内含 pack.lua 与 README.md）。
        </p>
      </div>

      <!-- pack grid -->
      <div class="plugin-grid" id="packGrid" ref="packGridRef"></div>

      <!-- pack pagination -->
      <div class="pagination" id="packPagination" ref="packPaginationRef"></div>
    </div>
    <!-- /.packs-panel -->

    <!-- ── Upload box ── -->
    <div class="upload-box" v-show="storeView === 'plugins'">
      <h2>📤 上传插件</h2>
      <div
        id="uploadLoginNotice"
        class="login-notice"
        :style="{ display: uploadLoginNoticeDisplay }"
      >
        ⚠️ 请先登录账户才能上传插件。
      </div>
      <div class="upload-row">
        <div class="upload-col">
          <label>插件包（.zip）</label>
          <div
            class="drop-zone"
            :class="{ 'has-file': _zipHasFile }"
            id="zipDropZone"
            ref="zipDropZoneRef"
          >
            <input
              type="file"
              id="zipFile"
              accept=".zip"
              @change="onZipSelected($event.target as HTMLInputElement)"
              @click="($event.target as HTMLInputElement).value = ''"
            />
            <div class="drop-zone-icon">📦</div>
            <div class="drop-zone-label" id="zipDropLabel">
              {{ _zipHasFile ? `📦 ${_zipFileName}` : '拖拽 .zip 到此，或点击选择' }}
            </div>
          </div>
        </div>
        <div class="upload-col">
          <label>封面图（可选，≤2MB，800 x 450，jpg/png/webp）</label>
          <div
            class="drop-zone"
            :class="{ 'has-file': _coverHasFile }"
            id="coverDropZone"
            ref="coverDropZoneRef"
          >
            <input
              type="file"
              id="coverFile"
              accept="image/*"
              @change="onCoverSelected($event.target as HTMLInputElement)"
              @click="($event.target as HTMLInputElement).value = ''"
            />
            <div class="cover-preview" id="coverPreview" ref="coverPreviewRef">
              <img v-if="_coverPreviewUrl" :src="_coverPreviewUrl" alt="封面预览" />
              <span v-else>🖼</span>
            </div>
          </div>
        </div>
      </div>
      <div
        style="
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        "
      >
        <button class="btn btn-primary" @click="uploadPlugin()">上传</button>
        <span
          id="uploadStatus"
          :style="{ color: uploadStatusColor }"
        >{{ uploadStatusText }}</span>
      </div>
      <p class="upload-hint">
        插件包顶层应包含 <code>config.lua</code> 和
        <code>$entry.lua</code>。同一 entry
        会覆盖旧版本（仅限本人）。
      </p>
      <p class="upload-hint">
        下载后放到
        <code>存档目录/plugins</code>
        目录并解压即完成安装。请注意，应保证可以找到
        <code>存档目录/plugins/$entry/config.lua</code
        >，否则插件无法被识别！
      </p>
      <p class="upload-hint">
        如非必要，建议使用游戏内置的插件商店进行下载。内置的插件商店能够自行完成插件安装，并允许玩家删除、检查更新。
      </p>
    </div>

    <!-- ── Filter & Sort ── -->
    <div class="filter-section" v-show="storeView === 'plugins'">
      <div class="category-chips" id="categoryChips">
        <button
          v-for="c in CATEGORIES"
          :key="c.slug"
          class="chip"
          :class="[
            c.slug ? `chip-${c.slug}` : '',
            { active: currentCategory === c.slug }
          ]"
          :data-cat="c.slug"
          @click="setCategory(c.slug)"
        >
          {{ c.icon }} {{ c.name }}
        </button>
      </div>
      <div class="search-sort-row">
        <input
          type="search"
          id="searchBox"
          ref="searchBoxRef"
          placeholder="搜索插件名称、作者或描述…"
          v-model="currentSearch"
          @input="onSearch()"
          autocomplete="off"
        />
        <div class="sort-btns">
          <button
            class="btn-sort"
            :class="{ active: currentSort === 'hot' }"
            id="sort-hot"
            @click="setSort('hot')"
          >
            🔥 热度
          </button>
          <button
            class="btn-sort"
            :class="{ active: currentSort === 'downloads' }"
            id="sort-downloads"
            @click="setSort('downloads')"
          >
            ⬇ 下载
          </button>
          <button
            class="btn-sort"
            :class="{ active: currentSort === 'newest' }"
            id="sort-newest"
            @click="setSort('newest')"
          >
            🆕 最新
          </button>
        </div>
      </div>
    </div>

    <!-- ── Plugin grid ── -->
    <div class="plugin-grid" id="pluginGrid" ref="pluginGridRef" v-show="storeView === 'plugins'"></div>

    <!-- ── Pagination ── -->
    <div class="pagination" id="pagination" ref="paginationRef" v-show="storeView === 'plugins'"></div>

    <!-- ══ MODALS ══ -->

    <!-- Collection create modal -->
    <div
      v-if="FEATURE_COLLECTIONS_UI"
      class="modal-backdrop"
      :class="{ show: showCollectionModal }"
      id="collectionModal"
      @click="onBackdropClick($event, 'collectionModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>🧰 创建整合包</h3>
          <button class="modal-close" @click="closeModal('collectionModal')">×</button>
        </div>
        <label>名称</label>
        <input
          type="text"
          id="collectionName"
          v-model="collectionName"
          placeholder="例如：我的防御塔平衡包"
          maxlength="100"
        />
        <label>描述</label>
        <input
          type="text"
          id="collectionDesc"
          v-model="collectionDesc"
          placeholder="可选，最多500字"
          maxlength="500"
        />
        <label>插件 Entry 列表（每行一个，可附版本，如 entry@1.2.0）</label>
        <textarea
          id="collectionEntries"
          v-model="collectionEntries"
          rows="8"
          placeholder="tower_balance@1.0.3&#10;hero_tweak&#10;ui_pack@2.1.0"
          style="
            width: 100%;
            background: #111215;
            border: 1px solid var(--border);
            border-radius: 8px;
            color: var(--text);
            padding: 10px;
            font-family: inherit;
            resize: vertical;
          "
        ></textarea>
        <p
          style="
            font-size: 0.8rem;
            color: var(--text-dim);
            margin-top: 6px;
          "
        >
          系统会只按
          <code>entry</code>
          校验是否在商店存在，版本信息用于备注展示。
        </p>
        <div class="modal-btns">
          <button class="btn" @click="closeModal('collectionModal')">取消</button>
          <button class="btn btn-primary" @click="createCollectionFromEntries()">创建</button>
        </div>
        <div class="modal-err" id="collectionErr">{{ collectionErr }}</div>
      </div>
    </div>

    <!-- Collections list modal -->
    <div
      v-if="FEATURE_COLLECTIONS_UI"
      class="modal-backdrop"
      :class="{ show: showCollectionsListModal }"
      id="collectionsListModal"
      @click="onBackdropClick($event, 'collectionsListModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>📚 整合包广场</h3>
          <button class="modal-close" @click="closeModal('collectionsListModal')">×</button>
        </div>
        <div
          style="
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          "
        >
          <button class="btn-sm" @click="setCollectionsFilter('all')">全部</button>
          <button class="btn-sm" @click="setCollectionsFilter('mine')">我创建的</button>
        </div>
        <div
          id="collectionsListContent"
          style="max-height: 55vh; overflow: auto"
        >
          <div v-if="collectionsLoading" style="padding:12px;color:var(--text-dim)">加载中…</div>
          <div v-else-if="collectionsList.length === 0" style="padding:12px;color:var(--text-dim)">暂无整合包。</div>
          <div
            v-for="c in collectionsList"
            :key="c.id"
            style="border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px;background:linear-gradient(180deg,#1a1d27,#14161c);box-shadow:0 6px 20px rgba(0,0,0,.22)"
          >
            <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
              <div style="font-weight:700;color:#fff">{{ escHtml(c.name) }}</div>
              <span
                :style="{ fontSize: '.72rem', color: c.is_public ? '#69db7c' : '#ffa94d', border: `1px solid ${c.is_public ? '#2b8a3e' : '#a86a2f'}`, padding: '1px 6px', borderRadius: '10px' }"
              >{{ c.is_public ? '公开' : '私有' }}</span>
            </div>
            <div style="font-size:0.8rem;color:var(--text-dim);margin:4px 0 8px">
              作者：{{ escHtml(c.creator_username) }} · 插件：{{ c.plugin_count || 0 }} · 关注：{{ c.follower_count || 0 }}
            </div>
            <div style="font-size:0.85rem;color:var(--text-dim);margin:4px 0 10px">{{ escHtml(c.description || '暂无描述') }}</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
              <a class="btn-sm" :href="`/collections/${c.id}/download`">⬇ 下载整合包</a>
              <a
                v-if="auth.userAuth && c.creator_username === auth.userAuth.username"
                class="btn-sm"
                href="javascript:void(0)"
                @click="showCollectionPicker(c.id)"
              >➕ 选择插件</a>
              <button
                v-if="auth.userAuth && c.creator_username !== auth.userAuth.username && c.is_public"
                class="btn-sm"
                @click="toggleCollectionFollow(c.id, auth.myCollectionFollows.has(c.id))"
              >{{ auth.myCollectionFollows.has(c.id) ? '💔 取消关注' : '⭐ 关注整合包' }}</button>
              <button
                v-if="auth.userAuth && c.creator_username === auth.userAuth.username"
                class="btn-sm btn-danger-sm"
                @click="deleteCollection(c.id, c.name)"
              >🗑 删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Notifications modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showNotificationsModal }"
      id="notificationsModal"
      @click="onBackdropClick($event, 'notificationsModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>🔔 消息中心</h3>
          <button class="modal-close" @click="closeModal('notificationsModal')">×</button>
        </div>
        <div
          style="
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            flex-wrap: wrap;
          "
        >
          <button class="btn-sm" @click="markAllNotificationsRead()">全部标已读</button>
          <button class="btn-sm" @click="openNotificationSettings()">通知设置</button>
        </div>
        <div
          id="notificationsContent"
          style="max-height: 55vh; overflow: auto"
        >
          <div v-if="notificationLoading" style="padding:12px;color:var(--text-dim)">加载中…</div>
          <div v-else-if="notificationList.length === 0" style="padding:12px;color:var(--text-dim)">暂无消息。</div>
          <div
            v-for="n in notificationList"
            :key="n.id"
            :style="{ border: '1px solid var(--border)', borderRadius: '8px', padding: '10px', marginBottom: '8px', opacity: n.is_read ? '.75' : '' }"
          >
            <div style="font-weight:700;color:#fff">{{ escHtml(n.title) }}</div>
            <div style="font-size:.85rem;color:var(--text-dim);margin:4px 0">{{ escHtml(n.content) }}</div>
            <div style="font-size:.75rem;color:var(--text-dim)">{{ escHtml(n.created_at) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- User login/register modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showUserModal }"
      id="userModal"
      @click="onBackdropClick($event, 'userModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>👤 用户账户</h3>
          <button class="modal-close" @click="closeModal('userModal')">×</button>
        </div>
        <div class="modal-tabs">
          <button
            class="modal-tab"
            :class="{ active: _userTab === 'login' }"
            id="tabLogin"
            @click="switchUserTab('login')"
          >
            登录
          </button>
          <button
            class="modal-tab"
            :class="{ active: _userTab === 'register' }"
            id="tabRegister"
            @click="switchUserTab('register')"
          >
            注册
          </button>
        </div>
        <div v-show="_userTab === 'login'" id="loginForm">
          <label>用户名</label>
          <input
            type="text"
            id="loginUsername"
            ref="loginUsernameRef"
            v-model="loginUsername"
            placeholder="用户名"
            autocomplete="username"
            @keydown.enter="confirmUser()"
          />
          <label>密码</label>
          <input
            type="password"
            id="loginPassword"
            v-model="loginPassword"
            placeholder="密码"
            autocomplete="current-password"
            @keydown.enter="confirmUser()"
          />
        </div>
        <div v-show="_userTab === 'register'" id="registerForm">
          <label>用户名</label>
          <input
            type="text"
            id="regUsername"
            v-model="regUsername"
            placeholder="用户名（最长 32 字符）"
            autocomplete="username"
            @keydown.enter="confirmUser()"
          />
          <label>密码</label>
          <input
            type="password"
            id="regPassword"
            v-model="regPassword"
            placeholder="密码（至少 6 位）"
            autocomplete="new-password"
            @keydown.enter="confirmUser()"
          />
          <p
            style="
              margin: 0 0 4px;
              font-size: 11px;
              color: #888;
            "
          >
            用户名注册后不可修改，应与插件 config.lua 中的
            <code>by</code> 字段相同。
          </p>
        </div>
        <div class="modal-btns">
          <button class="btn" @click="closeModal('userModal')">取消</button>
          <button class="btn btn-primary" id="userConfirmBtn" @click="confirmUser()">
            {{ _userTab === 'login' ? '登录' : '注册' }}
          </button>
        </div>
        <div class="modal-err" id="userErr">{{ userErr }}</div>
      </div>
    </div>

    <!-- Admin modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showAdminModal }"
      id="adminModal"
      @click="onBackdropClick($event, 'adminModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>🔑 管理员模式</h3>
          <button class="modal-close" @click="closeModal('adminModal')">×</button>
        </div>
        <p
          style="
            margin: 0 0 12px;
            font-size: 0.85rem;
            color: var(--text-dim);
          "
        >
          输入管理员 Token，验证通过后可删除任意插件和评论。
        </p>
        <input
          type="password"
          id="adminTokenInput"
          ref="adminTokenInputRef"
          v-model="adminTokenInput"
          placeholder="管理员 Token"
          @keydown.enter="confirmAdmin()"
        />
        <div class="modal-btns">
          <button class="btn" @click="closeModal('adminModal')">取消</button>
          <button class="btn btn-primary" :disabled="adminSubmitting" @click="confirmAdmin()">
            {{ adminSubmitting ? '验证中…' : '确认' }}
          </button>
        </div>
        <div class="modal-err" id="adminErr">{{ adminErr }}</div>
      </div>
    </div>

    <!-- Delete confirm modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showDeleteModal }"
      id="deleteModal"
      @click="onBackdropClick($event, 'deleteModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>🗑 删除插件</h3>
          <button class="modal-close" @click="closeModal('deleteModal')">×</button>
        </div>
        <p
          style="
            margin: 0 0 12px;
            font-size: 0.88rem;
            color: var(--text-dim);
          "
        >
          确认删除 "<strong id="deleteName">{{ deleteName }}</strong>"？此操作不可撤销。
        </p>
        <div class="modal-btns">
          <button class="btn" @click="closeModal('deleteModal')">取消</button>
          <button class="btn btn-danger" @click="confirmDelete()">确认删除</button>
        </div>
        <div class="modal-err" id="deleteErr">{{ deleteErr }}</div>
      </div>
    </div>

    <!-- Pack detail modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showPackDetailModal }"
      id="packDetailModal"
      @click="packOnBackdropClick($event, 'packDetailModal')"
    >
      <div class="modal large">
        <div class="modal-header">
          <h3>📦 {{ packDetailTitle }}</h3>
          <button class="modal-close" @click="packCloseModal('packDetailModal')">×</button>
        </div>
        <div v-if="packDetailCoverHtml" class="pack-detail-cover" v-html="packDetailCoverHtml"></div>
        <div class="readme-plugin-info pack-detail-info" v-html="packDetailInfoHtml"></div>
        <div class="pack-detail-actions">
          <a
            v-if="packDetailFilename"
            class="btn-sm btn-download-sm"
            :href="`/packs/download/${encodeURIComponent(packDetailFilename)}`"
          >⬇ 下载 .zip（pack.lua + README）</a>
          <span class="pack-install-hint-inline">游戏内插件商店安装可自动补装全部成员插件并支持更新/卸载</span>
          <span style="flex:1"></span>
          <button
            v-if="packDetailCanModify && !packDetailLoading"
            class="btn-sm btn-danger-sm"
            @click="packDeleteEntry(packDetailEntry, packDetailTitle)"
          >🗑 删除整合包</button>
        </div>
        <div class="modal-body" id="packDetailContent" v-html="packDetailContentHtml"></div>
      </div>
    </div>

    <!-- Pack create (form) modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showPackCreateModal }"
      id="packCreateModal"
      @click="packOnBackdropClick($event, 'packCreateModal')"
    >
      <div class="modal large pack-create-modal">
        <div class="modal-header">
          <h3>🧰 创建整合包（表单）</h3>
          <button class="modal-close" @click="packCloseModal('packCreateModal')">×</button>
        </div>
        <div class="modal-scroll">
          <label>entry（可选，留空由服务端自动生成）</label>
          <input type="text" v-model="packFormEntry" placeholder="pack_my_kit（字母/数字/_/-）" maxlength="64" />
          <label>名称 *</label>
          <input type="text" v-model="packFormName" placeholder="例如：我的塔防整合包" maxlength="60" />
          <label>版本 *</label>
          <input type="text" v-model="packFormVersion" placeholder="1.0.0" maxlength="30" />
          <label>简介</label>
          <input type="text" v-model="packFormDesc" placeholder="可选，一句话介绍" maxlength="1000" />
          <label>README（Markdown，可选）</label>
          <textarea
            v-model="packFormReadme"
            rows="5"
            placeholder="支持 Markdown 语法，将展示在整合包详情页"
            style="width:100%;background:#111215;border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:inherit;resize:vertical;margin-bottom:4px"
          ></textarea>
          <label>成员插件（至少 1 个，下方从商店挑选或手动输入）</label>
          <div class="pack-picker">
            <div class="pack-picker-cats">
              <button
                v-for="c in CATEGORIES"
                :key="c.slug"
                type="button"
                class="chip"
                :class="[
                  c.slug ? `chip-${c.slug}` : '',
                  { active: packPickerCat === c.slug }
                ]"
                :data-cat="c.slug"
                @click="packSetPickerCat(c.slug)"
              >
                {{ c.icon }} {{ c.name }}
              </button>
            </div>
            <div class="pack-picker-search">
              <input
                type="search"
                v-model="packPickerSearch"
                placeholder="搜索商店插件…"
                @input="onPackPickerSearch()"
                autocomplete="off"
              />
              <span class="pack-picker-count">共 {{ packPickerTotal }} 个</span>
            </div>
            <div class="pack-picker-list" v-if="!packPickerLoading">
              <label v-for="p in packPickerItems" :key="p.entry" class="pack-picker-item">
                <input
                  type="checkbox"
                  :checked="packMembers.includes(p.entry)"
                  @change="packToggleMember(p.entry, ($event.target as HTMLInputElement).checked)"
                />
                <span class="pack-picker-item-main">
                  <span class="pack-picker-name-row">
                    <span class="pack-picker-name">{{ p.name }}</span>
                    <code class="pack-picker-entry">{{ p.entry }}</code>
                  </span>
                  <span class="pack-picker-item-cat">{{ getCategory(p.category).icon }} {{ getCategory(p.category).name }}</span>
                </span>
              </label>
              <div v-if="packPickerItems.length === 0" class="pack-picker-empty">没有更多插件</div>
            </div>
            <div v-else class="pack-picker-empty">加载中…</div>
            <div class="pack-picker-pages">
              <button class="page-btn" :disabled="packPickerPage <= 1" @click="packPickerPrev()">‹</button>
              <span style="font-size:0.8rem;color:var(--text-dim)">第 {{ packPickerPage }} 页</span>
              <button
                class="page-btn"
                :disabled="packPickerPage * PACK_PICKER_LIMIT >= packPickerTotal"
                @click="packPickerNext()"
              >›</button>
            </div>
            <div class="pack-picker-manual">
              <input
                type="text"
                v-model="packMemberManualInput"
                placeholder="或手动输入插件 entry，回车添加"
                @keydown.enter.prevent="packAddManualMember()"
                autocomplete="off"
              />
              <button class="btn-sm" @click="packAddManualMember()">添加</button>
            </div>
            <div class="pack-selected" v-if="packMembers.length">
              <span class="pack-selected-label">已选：</span>
              <span v-for="m in packMembers" :key="m" class="pack-selected-tag">
                {{ m }}
                <button class="pack-selected-remove" @click="packRemoveMember(m)">×</button>
              </span>
            </div>
          </div>
        </div>
        <div class="modal-btns">
          <button class="btn" @click="packCloseModal('packCreateModal')">取消</button>
          <button class="btn btn-primary" :disabled="packCreateSubmitting" @click="packCreateSubmit()">
            {{ packCreateSubmitting ? '创建中…' : '发布整合包' }}
          </button>
        </div>
        <div class="modal-err">{{ packCreateErr }}</div>
      </div>
    </div>

    <!-- Pack upload modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showPackUploadModal }"
      id="packUploadModal"
      @click="packOnBackdropClick($event, 'packUploadModal')"
    >
      <div class="modal">
        <div class="modal-header">
          <h3>📤 上传 pack.lua</h3>
          <button class="modal-close" @click="packCloseModal('packUploadModal')">×</button>
        </div>
        <p style="margin:0 0 12px;font-size:0.85rem;color:var(--text-dim)">
          选择 .lua/.txt 文件（或先粘贴内容再编辑）。pack.lua 需包含
          <code>entry/name/version/by/members</code>，成员插件必须已在商店上架；内容会在上传前展示以便核对。
        </p>
        <div class="drop-zone" style="position:relative;padding:14px;margin-bottom:10px">
          <input
            ref="packUploadFileInput"
            type="file"
            accept=".lua,.txt"
            @change="onPackUploadFileSelected($event.target as HTMLInputElement)"
            @click="($event.target as HTMLInputElement).value = ''"
          />
          <div class="drop-zone-icon" style="font-size:1.4rem">📄</div>
          <div class="drop-zone-label">{{ packUploadFileName || '拖拽 pack.lua 到此，或点击选择' }}</div>
        </div>
        <label>pack.lua 内容（可直接编辑）</label>
        <textarea
          v-model="packUploadBody"
          rows="12"
          spellcheck="false"
          placeholder="return { entry = '...', name = '...', version = '1.0.0', members = { ... } }"
          style="width:100%;background:#111215;border:1px solid var(--border);border-radius:8px;color:var(--text);padding:10px;font-family:ui-monospace,Consolas,monospace;font-size:0.8rem;resize:vertical"
        ></textarea>
        <div class="modal-btns">
          <button class="btn" @click="packCloseModal('packUploadModal')">取消</button>
          <button class="btn btn-primary" :disabled="packUploadSubmitting" @click="packUploadSubmit()">
            {{ packUploadSubmitting ? '上传中…' : '上传发布' }}
          </button>
        </div>
        <div class="modal-err">{{ packUploadErr }}</div>
      </div>
    </div>

    <!-- Detail (README) modal -->
    <div
      class="modal-backdrop"
      :class="{ show: showDetailModal }"
      id="detailModal"
      @click="onBackdropClick($event, 'detailModal')"
    >
      <div class="modal large">
        <div class="modal-header">
          <h3 id="detailTitle">{{ detailTitle }}</h3>
          <button class="modal-close" @click="closeModal('detailModal')">×</button>
        </div>
        <div id="detailPluginInfo" class="readme-plugin-info" v-html="detailPluginInfoHtml"></div>
        <div class="modal-body" id="detailContent" v-html="detailContentHtml"></div>
      </div>
    </div>

    <!-- Comments modal -->
    <PluginCommentsModal
      v-model="showCommentsModal"
      :entry="_commentEntry || ''"
      :plugin-name="commentPluginName"
      @close="showCommentsModal = false"
      @count-change="onCommentCountChange"
      @need-login="toggleUser"
    />
  </div>
  <!-- /.page-wrap -->
</template>

<style>


/* ── Top bar ───────────────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0 16px;
  flex-wrap: wrap;
}
.top-bar h1 {
  margin: 0;
  flex: 1;
  font-size: 1.6rem;
  color: #fff;
}
.top-bar-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}
.btn-me {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding-right: 10px;
}
.btn-me-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #1a1b20;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
}
.btn-me-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.btn-collection {
  border-color: #7c4dff;
  color: #c4b5fd;
  background: #221a3a;
}
.btn-collection:hover {
  background: #2d2450;
  color: #e9ddff;
}
.btn-admin.active {
  background: #3d2a0a;
  border-color: var(--warn);
  color: var(--warn);
}
.btn-user.active {
  background: #12301e;
  border-color: var(--accent2);
  color: var(--accent2);
}

/* ── Upload box ────────────────────────────────── */
.upload-box {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 20px 24px;
  margin-bottom: 20px;
  background: var(--surface);
  transition: border-color 0.2s;
}
.upload-box h2 {
  margin: 0 0 12px;
  font-size: 1rem;
  color: #fff;
}
.drop-zone {
  border: 2px dashed var(--border);
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  cursor: pointer;
  transition:
    border-color 0.2s,
    background 0.2s;
  position: relative;
  background: var(--bg);
  color: var(--text-dim);
  font-size: 0.88rem;
}
.drop-zone.dragover {
  border-color: var(--accent);
  background: #1a2a3a;
  color: var(--accent);
}
.drop-zone input[type="file"] {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  width: 100%;
  height: 100%;
}
.drop-zone-icon {
  font-size: 2rem;
  margin-bottom: 6px;
}
.drop-zone-label {
  font-size: 0.88rem;
}
.drop-zone.has-file {
  border-color: var(--accent2);
}
.drop-zone.has-file .drop-zone-label {
  color: var(--accent2);
}
.upload-row {
  display: flex;
  gap: 10px;
  align-items: stretch;
  flex-wrap: wrap;
}
.upload-col {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
}
.upload-col label {
  font-size: 0.82rem;
  color: var(--text-dim);
  display: block;
  margin-bottom: 6px;
}
.upload-col .drop-zone {
  flex: 1;
}
.cover-preview {
  flex: 1;
  background: var(--bg);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  overflow: hidden;
}
.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
#uploadStatus {
  font-size: 0.85rem;
  margin-top: 8px;
}
.upload-hint {
  font-size: 0.82rem;
  color: var(--text-dim);
  margin: 10px 0 0;
}
.login-notice {
  font-size: 0.85rem;
  color: var(--warn);
  background: #3d2a0a;
  border: 1px solid var(--warn);
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 10px;
}

/* ── Category chips ────────────────────────────── */
.filter-section {
  margin-bottom: 14px;
}
.category-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.chip {
  padding: 4px 12px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s;
  user-select: none;
}
.chip:hover {
  border-color: var(--accent);
  color: var(--text);
}
.chip.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  font-weight: 600;
}
.chip-gameplay {
  --chip-c: #74c0fc;
}
.chip-cosmetic {
  --chip-c: #f783ac;
}
.chip-display {
  --chip-c: #b197fc;
}
.chip-tower {
  --chip-c: #ffa94d;
}
.chip-hero {
  --chip-c: #69db7c;
}
.chip-enemy {
  --chip-c: #ff8787;
}
.chip-level {
  --chip-c: #ffe066;
}
.chip-other {
  --chip-c: #868e96;
}
.chip.active[data-cat="gameplay"] {
  background: #74c0fc;
  border-color: #74c0fc;
}
.chip.active[data-cat="cosmetic"] {
  background: #f783ac;
  border-color: #f783ac;
}
.chip.active[data-cat="display"] {
  background: #b197fc;
  border-color: #b197fc;
}
.chip.active[data-cat="tower"] {
  background: #ffa94d;
  border-color: #ffa94d;
}
.chip.active[data-cat="hero"] {
  background: #69db7c;
  border-color: #69db7c;
}
.chip.active[data-cat="enemy"] {
  background: #ff8787;
  border-color: #ff8787;
}
.chip.active[data-cat="level"] {
  background: #ffe066;
  border-color: #ffe066;
  color: #333;
}
.chip.active[data-cat="other"] {
  background: #868e96;
  border-color: #868e96;
}
.search-sort-row {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.search-sort-row input[type="search"] {
  flex: 1;
  min-width: 160px;
}
.sort-btns {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.btn-sort {
  padding: 5px 12px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.82rem;
  transition: all 0.15s;
}
.btn-sort:hover {
  border-color: var(--accent);
  color: var(--text);
}
.btn-sort.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  font-weight: 600;
}

/* ── Plugin grid ───────────────────────────────── */
.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(270px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}
.grid-loading,
.grid-empty {
  grid-column: 1 / -1;
  text-align: center;
  color: var(--text-dim);
  padding: 48px;
  font-size: 0.95rem;
}
.grid-loading::before {
  content: "⏳ ";
}
.grid-empty::before {
  content: "📭 ";
}

/* ── Plugin card ───────────────────────────────── */
.plugin-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition:
    transform 0.15s,
    box-shadow 0.15s,
    border-color 0.15s;
}
.plugin-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.4);
  border-color: #4a4d57;
}
.card-cover {
  width: 100%;
  aspect-ratio: 16/9;
  overflow: hidden;
  background: #1a1b20;
}
.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
}
.cover-icon {
  font-size: 2.5rem;
  opacity: 0.35;
}
.cover-icon-gameplay {
  color: #74c0fc;
}
.cover-icon-cosmetic {
  color: #f783ac;
}
.cover-icon-display {
  color: #b197fc;
}
.cover-icon-tower {
  color: #ffa94d;
}
.cover-icon-hero {
  color: #69db7c;
}
.cover-icon-enemy {
  color: #ff8787;
}
.cover-icon-level {
  color: #ffe066;
}
.card-body {
  padding: 12px 14px 8px;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.card-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.card-category {
  font-size: 0.72rem;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  background: #2a2b31;
  color: #888;
  border: 1px solid var(--border);
}
.cat-gameplay {
  color: #74c0fc;
  border-color: #2d4a6a;
  background: #12243a;
}
.cat-cosmetic {
  color: #f783ac;
  border-color: #6a2a4a;
  background: #3a1225;
}
.cat-display {
  color: #b197fc;
  border-color: #3d2a6a;
  background: #1f1232;
}
.cat-tower {
  color: #ffa94d;
  border-color: #6a4a1a;
  background: #3a2510;
}
.cat-hero {
  color: #69db7c;
  border-color: #1f5a2a;
  background: #0e2a15;
}
.cat-enemy {
  color: #ff8787;
  border-color: #6a2a2a;
  background: #3a1212;
}
.cat-level {
  color: #ffe066;
  border-color: #5a5010;
  background: #2a2808;
}
.cat-other {
  color: #868e96;
  border-color: #3a3b42;
  background: #1a1b20;
}
.btn-like {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-dim);
  padding: 2px 4px;
  border-radius: 4px;
  transition:
    color 0.15s,
    background 0.15s;
  white-space: nowrap;
}
.btn-like:hover {
  color: #ff6b6b;
  background: #3a1212;
}
.btn-like.liked {
  color: #ff6b6b;
}
.btn-like.favorited {
  color: #ffd700;
}
.btn-like.favorited:hover {
  color: #ffed4e;
  background: #3a3612;
}
.card-title {
  font-size: 0.98rem;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.card-author {
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.card-author a {
  color: var(--accent2);
  text-decoration: none;
}
.card-author a:hover {
  text-decoration: underline;
}
.author-avatar-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: #1a1b20;
  flex-shrink: 0;
}
.author-avatar-link img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.card-version {
  color: var(--text-dim);
  font-size: 0.75rem;
}
.card-desc {
  font-size: 0.8rem;
  color: var(--text-dim);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.card-footer {
  padding: 8px 14px 10px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: auto;
}
.card-stats {
  display: flex;
  gap: 10px;
  font-size: 0.75rem;
  color: var(--text-dim);
  flex-wrap: wrap;
}
.card-actions {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}
.btn-sm {
  padding: 3px 9px;
  font-size: 0.78rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  text-decoration: none;
  display: inline-block;
}
.btn-sm:hover {
  background: #2a2b31;
  color: var(--text);
  text-decoration: none;
}
.btn-detail-sm {
  border-color: #2d8ca8;
  color: #63c9e8;
  background: #0e2a35;
}
.btn-detail-sm:hover {
  background: #1a4a5e;
}
.btn-comment-sm {
  border-color: #3d5a3a;
  color: #88c890;
  background: #0e2018;
}
.btn-comment-sm:hover {
  background: #1a3520;
}
.btn-download-sm {
  border-color: #2d7a4a;
  color: #69db7c;
  background: #0e2a1a;
}
.btn-download-sm:hover {
  background: #1a4a2e;
}
.btn-danger-sm {
  border-color: #7f1d1d;
  color: #f87171;
  background: transparent;
}
.btn-danger-sm:hover {
  background: #3d1010;
}

/* ── Pagination ────────────────────────────────── */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 4px;
  margin-bottom: 32px;
  flex-wrap: wrap;
}
.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 10px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.15s;
  font-family: inherit;
}
.page-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.page-btn.active {
  background: var(--accent);
  color: #000;
  border-color: var(--accent);
  font-weight: 700;
}
.page-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.page-ellipsis {
  color: var(--text-dim);
  padding: 0 4px;
  font-size: 0.85rem;
}

/* ── Modal backdrop ────────────────────────────── */
.modal-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.68);
  z-index: 100;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-backdrop.show {
  display: flex;
}

/* ── Modal card ────────────────────────────────── */
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  position: relative;
}
.modal.wide {
  max-width: 720px;
}
.modal.large {
  max-width: 860px;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
  color: #fff;
}
.modal-close {
  background: none;
  border: none;
  font-size: 22px;
  cursor: pointer;
  color: var(--text-dim);
  line-height: 1;
  transition: color 0.15s;
  flex-shrink: 0;
}
.modal-close:hover {
  color: #fff;
}
.modal label {
  display: block;
  font-size: 0.82rem;
  color: var(--text-dim);
  margin-bottom: 4px;
}
.modal input {
  margin-bottom: 12px;
}
.modal-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 16px;
  border-bottom: 2px solid var(--border);
}
.modal-tab {
  padding: 6px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  border: none;
  background: none;
  color: var(--text-dim);
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  font-family: inherit;
}
.modal-tab.active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 600;
}
.modal-btns {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 16px;
}
.modal-err {
  color: var(--danger);
  font-size: 0.82rem;
  margin-top: 8px;
  min-height: 18px;
}
.modal-body {
  max-height: 60vh;
  overflow-y: auto;
  padding: 12px 4px 0;
  line-height: 1.75;
}
.modal-body h1,
.modal-body h2,
.modal-body h3 {
  margin-top: 1.2em;
  margin-bottom: 0.5em;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.3em;
  color: #fff;
}
.modal-body ul,
.modal-body ol {
  padding-left: 1.5em;
  margin-bottom: 1em;
}
.modal-body p {
  margin-bottom: 0.9em;
}
.modal-body pre {
  background: #1a1b20;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 10px 14px;
  overflow-x: auto;
  font-size: 0.82rem;
}
.modal-body code {
  background: #1a1b20;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.82rem;
}
.modal-body pre code {
  background: none;
  padding: 0;
}
.modal-body img {
  max-width: 100%;
  border-radius: 6px;
  margin: 6px 0;
}
.modal-body table {
  border-collapse: collapse;
  width: 100%;
  margin-bottom: 1em;
}
.modal-body th,
.modal-body td {
  border: 1px solid var(--border);
  padding: 6px 12px;
  text-align: left;
}
.modal-body th {
  background: #2a2b31;
  font-weight: 600;
}
.modal-body tr:nth-child(even) td {
  background: #1e1f24;
}
.readme-plugin-info {
  padding: 12px;
  background: var(--bg);
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-bottom: 16px;
  font-size: 0.85rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
}
.readme-plugin-info span {
  color: var(--text-dim);
}
.readme-plugin-info strong {
  color: var(--text);
}

/* ── Responsive ────────────────────────────────── */
@media (max-width: 640px) {
  .plugin-grid {
    grid-template-columns: 1fr;
  }
  .top-bar-actions {
    width: 100%;
  }
  .top-bar-actions .btn {
    flex: 1;
  }
}
@media (max-width: 900px) {
  .plugin-grid {
    grid-template-columns: repeat(
      auto-fill,
      minmax(230px, 1fr)
    );
  }
}

/* ── Packs ───────────────────────────────────────── */
.view-switch {
  display: inline-flex;
  gap: 4px;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 18px;
  padding: 3px;
  flex-shrink: 0;
}
.view-switch-btn {
  border: none;
  background: none;
  color: var(--text-dim);
  font-size: 0.85rem;
  padding: 5px 14px;
  border-radius: 15px;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.view-switch-btn:hover {
  color: var(--text);
}
.view-switch-btn.active {
  background: var(--accent);
  color: #000;
  font-weight: 700;
}
.packs-panel {
  margin-bottom: 12px;
}
.packs-toolbar {
  margin: 4px 0 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.packs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.packs-actions-divider {
  width: 1px;
  height: 22px;
  background: var(--border);
  margin: 0 4px;
  flex-shrink: 0;
}
.btn-pack-create {
  border-color: #7c4dff;
  color: #c4b5fd;
  background: #221a3a;
}
.btn-pack-create:hover {
  background: #2d2450;
  color: #e9ddff;
}
.btn-pack-upload {
  border-color: #2d8ca8;
  color: #63c9e8;
  background: #0e2a35;
}
.btn-pack-upload:hover {
  background: #1a4a5e;
}
.packs-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  background: #12301e;
  border: 1px solid var(--accent2);
  color: var(--accent2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
}
.pack-install-hint {
  margin: 0;
  font-size: 0.78rem;
  color: var(--text-dim);
}
.pack-card-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.pack-card-title-row .card-title {
  flex: 1;
  min-width: 0;
}
.pack-card-hint {
  font-size: 0.68rem;
  color: var(--text-dim);
  line-height: 1.4;
}
.btn-pack-cover-sm {
  border-color: #a86a2f;
  color: #ffa94d;
  background: #2a1a08;
}
.btn-pack-cover-sm:hover {
  background: #3d2a10;
  color: #ffc078;
}
.pack-detail-cover {
  width: 100%;
  aspect-ratio: 16 / 7;
  overflow: hidden;
  border-radius: 10px;
  margin-bottom: 12px;
  background: #1a1b20;
}
.pack-detail-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.pack-detail-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pack-install-hint-inline {
  font-size: 0.75rem;
  color: var(--text-dim);
}
.pack-desc-fallback {
  white-space: pre-wrap;
  color: var(--text);
}
.pack-members-block {
  margin-top: 18px;
  border-top: 1px solid var(--border);
  padding-top: 12px;
}
.pack-members-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}
.pack-table-wrap {
  overflow-x: auto;
}
.pack-member-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.pack-member-table th,
.pack-member-table td {
  border: 1px solid var(--border);
  padding: 6px 10px;
  text-align: left;
  white-space: nowrap;
}
.pack-member-table th {
  background: #2a2b31;
  color: var(--text-dim);
  font-weight: 600;
}
.pack-member-table td {
  background: var(--surface);
  color: var(--text);
}
.pack-member-table tr:nth-child(even) td {
  background: #1e1f24;
}
.pack-member-name {
  color: #fff;
  font-weight: 600;
}
.pack-member-entry {
  font-size: 0.7rem;
  color: var(--text-dim);
  font-family: ui-monospace, Consolas, monospace;
}
.pack-off-badge {
  display: inline-block;
  margin-left: 6px;
  font-size: 0.7rem;
  color: #ff8787;
  border: 1px solid #6a2a2a;
  background: #3a1212;
  padding: 0 6px;
  border-radius: 10px;
  vertical-align: middle;
}
.pack-create-modal .modal-scroll {
  max-height: 62vh;
  overflow-y: auto;
  padding-right: 4px;
}
.pack-picker {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 8px;
  background: var(--bg);
  margin-bottom: 6px;
}
.pack-picker-cats {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.pack-picker-cats .chip {
  padding: 2px 10px;
  font-size: 0.78rem;
}
.pack-picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.pack-picker-search input {
  flex: 1;
  margin-bottom: 0;
}
.pack-picker-count {
  font-size: 0.75rem;
  color: var(--text-dim);
  white-space: nowrap;
}
.pack-picker-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 6px;
  background: #14161b;
}
.pack-picker-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 5px 2px;
  cursor: pointer;
  border-bottom: 1px solid rgba(55, 58, 64, 0.4);
  font-size: 0.85rem;
}
.pack-picker-item:last-child {
  border-bottom: none;
}
.pack-picker-item input {
  margin: 2px 0 0;
  flex-shrink: 0;
}
.pack-picker-item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.pack-picker-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.pack-picker-name {
  color: var(--text);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pack-picker-entry {
  color: var(--text-dim);
  font-size: 0.72rem;
  background: #1a1b20;
  padding: 1px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}
.pack-picker-item-cat {
  color: var(--text-dim);
  font-size: 0.72rem;
  opacity: 0.85;
}
.pack-picker-empty {
  color: var(--text-dim);
  font-size: 0.82rem;
  text-align: center;
  padding: 12px;
}
.pack-picker-pages {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 8px 0 4px;
}
.pack-picker-manual {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-top: 6px;
}
.pack-picker-manual input {
  flex: 1;
  margin-bottom: 0;
}
.pack-selected {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 6px;
}
.pack-selected-label {
  font-size: 0.8rem;
  color: var(--text-dim);
}
.pack-selected-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #221a3a;
  border: 1px solid #7c4dff;
  color: #c4b5fd;
  border-radius: 12px;
  padding: 1px 6px 1px 10px;
  font-size: 0.78rem;
  font-family: ui-monospace, Consolas, monospace;
}
.pack-selected-remove {
  border: none;
  background: none;
  color: #c4b5fd;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0 2px;
  border-radius: 50%;
}
.pack-selected-remove:hover {
  color: #fff;
  background: #3a2a6a;
}
@media (max-width: 640px) {
  .pack-detail-actions {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
