import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from './auth'
import { t } from '../i18n'

export interface Plugin {
  entry: string
  name: string
  version: string
  by: string
  desc: string
  category: string
  filename: string
  downloads: number
  like_count: number
  comment_count: number
  published_at: string
  has_cover: boolean
  branch?: string
  min_version?: string
  release_version?: string
  deprecated?: boolean
  deprecated_reason?: string
  checked_at?: string
  check_state?: string
}

export const usePluginStore = defineStore('pluginStore', () => {
  const currentSort = ref('hot')
  const currentCategory = ref('')
  const currentSearch = ref('')
  const currentBranch = ref<'master' | 'dev'>('master')
  const onlyDeprecated = ref(false)
  const currentPage = ref(1)
  const totalPlugins = ref(0)
  const currentItems = ref<Plugin[]>([])
  const loading = ref(false)

  const FEATURE_COLLECTIONS_UI = false
  const CATEGORIES = [
    // name 用 getter：读取时按当前语言实时取文案，模板/拼接 HTML 都能自动跟随切换
    { slug: '', icon: '🔍', get name() { return t('category.all') } },
    { slug: 'gameplay', icon: '🎮', get name() { return t('category.gameplay') } },
    { slug: 'cosmetic', icon: '🎨', get name() { return t('category.cosmetic') } },
    { slug: 'display', icon: '🖥️', get name() { return t('category.display') } },
    { slug: 'tower', icon: '🏰', get name() { return t('category.tower') } },
    { slug: 'hero', icon: '🦸', get name() { return t('category.hero') } },
    { slug: 'enemy', icon: '👾', get name() { return t('category.enemy') } },
    { slug: 'level', icon: '🗺️', get name() { return t('category.level') } },
    { slug: 'upgrade', icon: '⚙️', get name() { return t('category.upgrade') } },
    { slug: 'generation', icon: '🧬', get name() { return t('category.generation') } },
    { slug: 'spell', icon: '✨', get name() { return t('category.spell') } },
    { slug: 'other', icon: '📦', get name() { return t('category.other') } },
  ]
  const PAGE_SIZE = 15

  const zipFile = shallowRef<File | null>(null)
  const coverFile = shallowRef<File | null>(null)

  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function resetPage() {
    currentPage.value = 1
  }

  async function fetchPage() {
    loading.value = true
    const params = new URLSearchParams({
      sort: currentSort.value,
      page: String(currentPage.value),
      limit: String(PAGE_SIZE),
      branch: currentBranch.value,
    })
    if (currentCategory.value) params.set('category', currentCategory.value)
    if (currentSearch.value.trim()) params.set('q', currentSearch.value.trim())
    if (onlyDeprecated.value) params.set('only_deprecated', 'true')
    try {
      const resp = await fetch('/plugins/list?' + params)
      if (resp.ok) {
        const data = await resp.json()
        totalPlugins.value = data.total || 0
        currentItems.value = data.items || []
      }
    } catch { /* ignore */ }
    loading.value = false
  }

  function setSort(mode: string) {
    currentSort.value = mode
    resetPage()
    fetchPage()
  }

  function setCategory(cat: string) {
    currentCategory.value = cat
    resetPage()
    fetchPage()
  }

  function setBranch(branch: 'master' | 'dev') {
    currentBranch.value = branch
    resetPage()
    fetchPage()
  }

  function setOnlyDeprecated(value: boolean) {
    onlyDeprecated.value = value
    resetPage()
    fetchPage()
  }

  function onSearch(query: string) {
    currentSearch.value = query
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      resetPage()
      fetchPage()
    }, 400)
  }

  return {
    currentSort, currentCategory, currentSearch, currentBranch, onlyDeprecated, currentPage,
    totalPlugins, currentItems, loading,
    CATEGORIES, PAGE_SIZE, FEATURE_COLLECTIONS_UI,
    zipFile, coverFile,
    fetchPage, setSort, setCategory, setBranch, setOnlyDeprecated, onSearch, resetPage,
  }
})
