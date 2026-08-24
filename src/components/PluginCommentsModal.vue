<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { useAuthStore } from '../stores/auth'
import { escHtml, mdToHtml } from '../utils/markdown'

const props = withDefaults(defineProps<{
  modelValue: boolean
  entry: string
  pluginName?: string
  pluginAuthor?: string
}>(), {
  pluginName: '',
  pluginAuthor: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'count-change': [entry: string, count: number]
  'close': []
  'need-login': []
}>()

const auth = useAuthStore()
const loading = ref(false)
const listHtml = ref('')
const formHtml = ref('')
const comments = ref<any[]>([])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function findPluginAuthor(): string {
  return props.pluginAuthor || ''
}

function renderCommentItemHtml(c: any, isReply: boolean, pluginAuthor: string): string {
  const tagMap: Record<string, [string, string]> = {
    bug: ['tag-badge tag-bug', '🐛 Bug'],
    suggestion: ['tag-badge tag-suggestion', '💡 建议'],
    general: ['tag-badge tag-general', '💬'],
  }
  const [tagCls, tagLabel] = tagMap[c.tag] || tagMap.general
  const resolvedBadge = c.tag === 'bug' && c.resolved
    ? '<span class="resolved-badge">✅ 已修复</span>' : ''
  const canDel = auth.adminToken ||
    (auth.userAuth && (auth.userAuth.username === c.username || auth.userAuth.username === pluginAuthor))
  const canResolve = !isReply && c.tag === 'bug' && auth.userAuth && auth.userAuth.username === pluginAuthor
  const delBtn = canDel
    ? `<button class="btn-cmt-sm btn-cmt-danger" onclick="window.__deleteCmt('${escHtml(c.entry)}',${c.id})">🗑</button>` : ''
  const resBtn = canResolve
    ? c.resolved
      ? `<button class="btn-cmt-sm btn-cmt-resolve" onclick="window.__toggleResolve('${escHtml(c.entry)}',${c.id},false)">↩ 撤销</button>`
      : `<button class="btn-cmt-sm btn-cmt-resolve" onclick="window.__toggleResolve('${escHtml(c.entry)}',${c.id},true)">✅ 标记已修复</button>`
    : ''
  const md = mdToHtml(c.content)
  const replyBtn = !isReply
    ? `<button class="btn-cmt-sm" onclick="window.__openReply('${escHtml(c.entry)}',${c.id})">↩ 回复</button>` : ''
  const repliesHtml = !isReply
    ? `
    <div class="comment-replies" id="replies-${c.id}">
      ${(c.replies || []).map((r: any) => renderCommentItemHtml(r, true, pluginAuthor)).join('')}
    </div>
    <div class="reply-form" id="reply-form-${c.id}" style="display:none">
      <textarea rows="2" id="reply-content-${c.id}" placeholder="回复… (支持 Markdown)"></textarea>
      <div style="display:flex;gap:6px;margin-top:6px;justify-content:flex-end">
        <button class="btn-cmt-sm" onclick="window.__closeReply(${c.id})">取消</button>
        <button class="btn btn-primary" style="padding:2px 10px;font-size:0.8rem" onclick="window.__submitReply('${escHtml(c.entry)}',${c.id})">回复</button>
      </div>
    </div>`
    : ''
  return `<div class="comment${isReply ? ' comment-reply' : ''}" id="comment-${c.id}">
    <div class="comment-header">
      <span class="${tagCls}">${tagLabel}</span>${resolvedBadge}
      <span class="comment-author">${escHtml(c.username)}</span>
      <span class="comment-time">${c.created_at}</span>
      ${delBtn}${resBtn}
    </div>
    <div class="comment-body">${md}</div>
    <div class="comment-actions">${replyBtn}</div>
    ${repliesHtml}
  </div>`
}

function renderPanel() {
  const pluginAuthor = findPluginAuthor()
  if (comments.value.length === 0) {
    listHtml.value = '<div class="comments-empty">暂无评论，来发表第一条吧！</div>'
  } else {
    listHtml.value = comments.value
      .map((c: any) => renderCommentItemHtml(c, false, pluginAuthor))
      .join('')
  }
  if (auth.userAuth) {
    formHtml.value = `<div class="comment-form">
      <div class="comment-form-row">
        <span style="font-size:0.83rem;color:var(--text-dim)">发表评论</span>
        <select id="commentTag">
          <option value="general">💬 普通</option>
          <option value="bug">🐛 Bug 反馈</option>
          <option value="suggestion">💡 建议</option>
        </select>
      </div>
      <textarea id="commentContent" rows="3" placeholder="支持 Markdown，可粘贴或拖拽图片…"></textarea>
      <div class="comment-form-row" style="margin-top:6px;justify-content:flex-end">
        <span id="commentStatus" style="font-size:0.8rem;flex:1"></span>
        <button class="btn btn-primary" style="padding:4px 14px;font-size:0.83rem" onclick="window.__postComment('${props.entry}')">发布</button>
      </div>
    </div>`
    nextTick(() => {
      const ta = document.getElementById('commentContent') as HTMLTextAreaElement
      if (ta) bindImageUpload(ta, () => ta.value, (v) => { ta.value = v })
    })
  } else {
    formHtml.value = `<div class="comment-form">
      <p style="color:var(--text-dim);font-size:0.86rem;text-align:center">
        <a href="javascript:void(0)" onclick="window.__commentsNeedLogin()" style="color:var(--accent2)">登录</a>后才能发表评论
      </p>
    </div>`
  }
}

async function load() {
  if (!props.modelValue || !props.entry) return
  loading.value = true
  listHtml.value = '<div style="text-align:center;padding:20px;color:var(--text-dim)">加载中…</div>'
  formHtml.value = ''
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(props.entry) + '/comments')
    if (resp.ok) {
      comments.value = await resp.json()
      renderPanel()
    } else {
      listHtml.value = '<div style="text-align:center;padding:30px;color:var(--danger)">加载失败</div>'
    }
  } catch {
    listHtml.value = '<div style="text-align:center;padding:30px;color:var(--danger)">网络错误</div>'
  } finally {
    loading.value = false
  }
}

watch(() => [props.modelValue, props.entry] as const, ([show]) => {
  if (show) load()
})

function openReply(entry: string, parentId: number) {
  if (!auth.userAuth) {
    ;(window as any).__commentsNeedLogin()
    return
  }
  document.querySelectorAll('.reply-form').forEach(el => {
    if (el.id !== 'reply-form-' + parentId) (el as HTMLElement).style.display = 'none'
  })
  const form = document.getElementById('reply-form-' + parentId)
  if (!form) return
  const show = form.style.display === 'none'
  form.style.display = show ? '' : 'none'
  if (show) {
    const ta = document.getElementById('reply-content-' + parentId) as HTMLTextAreaElement
    if (ta) {
      ta.focus()
      bindImageUpload(ta, () => ta.value, (v) => { ta.value = v })
    }
  }
}

function closeReply(parentId: number) {
  const f = document.getElementById('reply-form-' + parentId)
  if (f) f.style.display = 'none'
}

async function postComment(entry: string) {
  const ta = document.getElementById('commentContent') as HTMLTextAreaElement
  const sel = document.getElementById('commentTag') as HTMLSelectElement
  const statusEl = document.getElementById('commentStatus') as HTMLElement
  const content = ta?.value || ''
  const tag = sel?.value || 'general'
  if (!content.trim()) {
    if (statusEl) statusEl.textContent = '❌ 内容不能为空'
    return
  }
  if (statusEl) statusEl.textContent = '发布中…'
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(entry) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
      body: JSON.stringify({ tag, content, parent_id: null }),
    })
    if (resp.ok) {
      if (statusEl) statusEl.textContent = ''
      await load()
      emit('count-change', entry, comments.value.length)
    } else if (resp.status === 401) {
      auth.clearUserAuth()
      if (statusEl) statusEl.textContent = '❌ 登录已失效，请重新登录'
    } else {
      if (statusEl) statusEl.textContent = '❌ ' + (await resp.text())
    }
  } catch (e: any) {
    if (statusEl) statusEl.textContent = '❌ 网络错误：' + e.message
  }
}

async function submitReply(entry: string, parentId: number) {
  if (!auth.userAuth) {
    ;(window as any).__commentsNeedLogin()
    return
  }
  const ta = document.getElementById('reply-content-' + parentId) as HTMLTextAreaElement
  const content = ta?.value.trim() || ''
  if (!content) return
  try {
    const resp = await fetch('/plugins/' + encodeURIComponent(entry) + '/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
      body: JSON.stringify({ tag: 'general', content, parent_id: parentId }),
    })
    if (resp.ok) {
      closeReply(parentId)
      await load()
      emit('count-change', entry, comments.value.length)
    } else if (resp.status === 401) {
      auth.clearUserAuth()
      alert('登录已失效，请重新登录')
    } else {
      alert('❌ ' + (await resp.text()))
    }
  } catch (e: any) {
    alert('❌ 网络错误：' + e.message)
  }
}

async function deleteCmt(entry: string, id: number) {
  if (!confirm('确认删除这条评论？')) return
  const headers = auth.adminToken ? auth.adminHeaders() : auth.bearerHeaders()
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/comments/${id}`, {
      method: 'DELETE',
      headers: headers as Record<string, string>,
    })
    if (resp.ok) {
      await load()
      emit('count-change', entry, comments.value.length)
    } else if (resp.status === 401) {
      if (auth.adminToken) auth.clearAdminToken()
      else auth.clearUserAuth()
      alert('认证已失效，请重新登录')
    } else {
      alert('❌ ' + (await resp.text()))
    }
  } catch (e: any) {
    alert('❌ 网络错误：' + e.message)
  }
}

async function toggleResolve(entry: string, id: number, resolved: boolean) {
  if (!auth.userAuth) return
  try {
    const resp = await fetch(`/plugins/${encodeURIComponent(entry)}/comments/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...auth.bearerHeaders() } as Record<string, string>,
      body: JSON.stringify({ resolved }),
    })
    if (resp.ok) await load()
    else alert('❌ ' + (await resp.text()))
  } catch (e: any) {
    alert('❌ 网络错误：' + e.message)
  }
}

function bindImageUpload(ta: HTMLTextAreaElement, getVal: () => string, setVal: (v: string) => void) {
  if ((ta as any)._imgBound) return
  ;(ta as any)._imgBound = true
  async function upload(file: File) {
    if (!auth.userAuth || !file.type.startsWith('image/')) return
    const ph = '![上传中…]()'
    setVal(getVal() + ph)
    try {
      const resp = await fetch('/plugins/comments/upload_image', {
        method: 'POST',
        headers: auth.bearerHeaders() as Record<string, string>,
        body: file,
      })
      if (resp.ok) {
        const { url } = await resp.json()
        const name = file.name.replace(/\.[^.]+$/, '') || 'image'
        setVal(getVal().replace(ph, `![${name}](${url})`))
      } else {
        setVal(getVal().replace(ph, ''))
        alert('❌ 图片上传失败：' + (await resp.text()))
      }
    } catch (_) {
      setVal(getVal().replace(ph, ''))
    }
  }
  ta.addEventListener('dragover', (e) => { e.preventDefault() })
  ta.addEventListener('drop', (e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (file) upload(file)
  })
  ta.addEventListener('paste', (e) => {
    const item = Array.from(e.clipboardData?.items || []).find(i => i.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (file) upload(file)
  })
}

// Expose to inline HTML handlers
;(window as any).__commentsNeedLogin = () => { emit('need-login') }
;(window as any).__postComment = (entry: string) => postComment(entry)
;(window as any).__submitReply = (entry: string, parentId: number) => submitReply(entry, parentId)
;(window as any).__openReply = (entry: string, parentId: number) => openReply(entry, parentId)
;(window as any).__closeReply = (parentId: number) => closeReply(parentId)
;(window as any).__deleteCmt = (entry: string, id: number) => deleteCmt(entry, id)
;(window as any).__toggleResolve = (entry: string, id: number, resolved: boolean) => toggleResolve(entry, id, resolved)

defineExpose({ reload: load })
</script>

<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-backdrop" :class="{ show: modelValue }" @click.self="close">
      <div class="modal wide" style="max-width:720px">
        <div class="modal-header">
          <h3>💬 评论 — {{ pluginName || entry }}</h3>
          <button class="modal-close" @click="close">×</button>
        </div>
        <div class="comments-scroll" style="max-height:50vh;overflow-y:auto;padding:4px 2px" v-html="listHtml"></div>
        <div id="commentFormArea" style="margin-top:12px" v-html="formHtml"></div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  display: flex;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.68);
  z-index: 100;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 28px;
  max-width: 720px;
  width: 100%;
  box-shadow: 0 12px 40px rgba(0,0,0,0.6);
  position: relative;
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
/* ── Comments ──────────────────────────────────── */
.comments-scroll {
  max-height: 55vh;
  overflow-y: auto;
  padding: 0 2px;
}
.comment {
  padding: 10px 0;
  border-bottom: 1px solid var(--border);
}
.comment:last-child {
  border-bottom: none;
}
.comment-reply {
  padding: 8px 0 8px 18px;
  border-bottom: none;
  border-left: 2px solid var(--border);
  margin: 6px 0 0 10px;
}
.comment-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 5px;
  font-size: 0.8rem;
}
.comment-author {
  color: var(--accent2);
  font-weight: 600;
}
.comment-time {
  color: var(--text-dim);
}
.comment-body {
  font-size: 0.86rem;
  line-height: 1.7;
}
.comment-body p {
  margin: 0 0 0.5em;
}
.comment-body p:last-child {
  margin-bottom: 0;
}
.comment-body pre {
  background: #1a1b20;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 8px 12px;
  overflow-x: auto;
  font-size: 0.8rem;
}
.comment-body code {
  background: #1a1b20;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.8rem;
}
.comment-body pre code {
  background: none;
  padding: 0;
}
.comment-body img {
  max-width: 100%;
  border-radius: 6px;
  margin: 4px 0;
}
.comment-actions {
  margin-top: 5px;
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}
.comment-replies {
  margin-top: 2px;
}
.tag-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
}
.tag-general {
  background: #2a2b31;
  color: #888;
  border: 1px solid #3a3b42;
}
.tag-bug {
  background: #3d1010;
  color: #f87171;
  border: 1px solid #7f1d1d;
}
.tag-suggestion {
  background: #0d2a4a;
  color: #60a5fa;
  border: 1px solid #1d4ed8;
}
.resolved-badge {
  display: inline-block;
  padding: 1px 7px;
  border-radius: 10px;
  font-size: 0.72rem;
  font-weight: 600;
  background: #0f3020;
  color: #4ade80;
  border: 1px solid #166534;
}
.btn-cmt-sm {
  padding: 2px 7px;
  font-size: 0.75rem;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-dim);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
}
.btn-cmt-sm:hover {
  background: #2a2b31;
  color: var(--text);
}
.btn-cmt-danger {
  border-color: #7f1d1d;
  color: #f87171;
}
.btn-cmt-danger:hover {
  background: #3d1010;
}
.btn-cmt-resolve {
  border-color: #166534;
  color: #4ade80;
}
.btn-cmt-resolve:hover {
  background: #0f3020;
}
.reply-form {
  margin: 6px 0 4px 24px;
  padding: 10px;
  background: #1a1b20;
  border-radius: 6px;
  border: 1px solid var(--border);
}
.reply-form textarea,
.comment-form textarea {
  width: 100%;
  box-sizing: border-box;
  background: #111215;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 8px 10px;
  font-family: inherit;
  font-size: 0.86rem;
  resize: vertical;
  outline: none;
}
.reply-form textarea:focus,
.comment-form textarea:focus {
  border-color: var(--accent);
}
.reply-form textarea.dragover,
.comment-form textarea.dragover {
  border-color: var(--accent2);
  background: #12301e;
}
.comment-form {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.comment-form select {
  background: #111215;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  padding: 5px 8px;
  font-family: inherit;
  font-size: 0.83rem;
  cursor: pointer;
}
.comment-form-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.comments-empty {
  text-align: center;
  color: var(--text-dim);
  padding: 24px 0;
  font-size: 0.86rem;
}

</style>
