import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { useAuthStore } from './auth'

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
  game_version?: string[]
}

export const usePluginStore = defineStore('pluginStore', () => {
  const currentSort = ref('hot')
  const currentCategory = ref('')
  const currentSearch = ref('')
  const currentPage = ref(1)
  const totalPlugins = ref(0)
  const currentItems = ref<Plugin[]>([])
  const loading = ref(false)

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
    })
    if (currentCategory.value) params.set('category', currentCategory.value)
    if (currentSearch.value.trim()) params.set('q', currentSearch.value.trim())
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

  function onSearch(query: string) {
    currentSearch.value = query
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      resetPage()
      fetchPage()
    }, 400)
  }

  return {
    currentSort, currentCategory, currentSearch, currentPage,
    totalPlugins, currentItems, loading,
    CATEGORIES, PAGE_SIZE, FEATURE_COLLECTIONS_UI,
    zipFile, coverFile,
    fetchPage, setSort, setCategory, onSearch, resetPage,
  }
})
