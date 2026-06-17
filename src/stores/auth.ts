import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getCookie, setCookie, deleteCookie } from '../utils/cookies'

export interface UserAuth {
  username: string
  token: string
}

export const useAuthStore = defineStore('auth', () => {
  const userAuth = ref<UserAuth | null>(null)
  const adminToken = ref<string | null>(null)
  const myLikes = ref<Set<number | string>>(new Set())
  const myFollows = ref<Set<string>>(new Set())
  const myCollectionFollows = ref<Set<number>>(new Set())
  const myFollowedDevs = ref<Set<string>>(new Set())

  const isLoggedIn = computed(() => userAuth.value !== null)
  const isAdmin = computed(() => adminToken.value !== null)

  function bearerHeaders(): Record<string, string> {
    return userAuth.value
      ? { Authorization: 'Bearer ' + userAuth.value.token }
      : {}
  }

  function adminHeaders(): Record<string, string> {
    return adminToken.value ? { 'X-Admin-Token': adminToken.value } : {}
  }

  function setUserAuth(username: string, token: string) {
    userAuth.value = { username, token }
    setCookie('krd_user', JSON.stringify({ username, token }), 30)
  }

  function clearUserAuth() {
    if (userAuth.value) {
      fetch('/plugins/logout', {
        method: 'POST',
        headers: bearerHeaders(),
      }).catch(() => {})
    }
    userAuth.value = null
    adminToken.value = null
    myLikes.value = new Set()
    myFollows.value = new Set()
    myCollectionFollows.value = new Set()
    myFollowedDevs.value = new Set()
    deleteCookie('krd_user')
    deleteCookie('krd_admin')
  }

  function setAdminToken(token: string) {
    adminToken.value = token
    setCookie('krd_admin', token, 30)
  }

  function clearAdminToken() {
    adminToken.value = null
    deleteCookie('krd_admin')
  }

  async function loadUserReactionState(token: string): Promise<boolean> {
    try {
      const [likesResp, followsResp] = await Promise.all([
        fetch('/plugins/my_likes', {
          headers: { Authorization: 'Bearer ' + token },
        }),
        fetch('/plugins/my_follows', {
          headers: { Authorization: 'Bearer ' + token },
        }),
      ])
      if (!likesResp.ok || !followsResp.ok) return false
      myLikes.value = new Set(await likesResp.json())
      myFollows.value = new Set(await followsResp.json())
      return true
    } catch {
      return false
    }
  }

  async function loadDevReactionState(token: string): Promise<boolean> {
    try {
      const [likesResp, followsResp, devFollowsResp] = await Promise.all([
        fetch('/plugins/my_likes', {
          headers: { Authorization: 'Bearer ' + token },
        }),
        fetch('/plugins/my_follows', {
          headers: { Authorization: 'Bearer ' + token },
        }),
        fetch('/developers/my_follows', {
          headers: { Authorization: 'Bearer ' + token },
        }),
      ])
      if (!likesResp.ok || !followsResp.ok) return false
      myLikes.value = new Set(await likesResp.json())
      myFollows.value = new Set(await followsResp.json())
      if (devFollowsResp.ok) {
        myFollowedDevs.value = new Set(await devFollowsResp.json())
      }
      return true
    } catch {
      return false
    }
  }

  async function loadChallengeLikes(token: string): Promise<boolean> {
    try {
      const resp = await fetch('/challenges/my_likes', {
        headers: { Authorization: 'Bearer ' + token },
      })
      if (!resp.ok) return false
      myLikes.value = new Set(await resp.json())
      return true
    } catch {
      return false
    }
  }

  async function restoreSession(type: 'plugins' | 'challenges' | 'developer' = 'plugins') {
    const savedUser = getCookie('krd_user')
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser)
        let ok = false
        if (type === 'challenges') {
          ok = await loadChallengeLikes(parsed.token)
        } else if (type === 'developer') {
          ok = await loadDevReactionState(parsed.token)
        } else {
          ok = await loadUserReactionState(parsed.token)
        }
        if (ok) {
          userAuth.value = { username: parsed.username, token: parsed.token }
        } else {
          deleteCookie('krd_user')
        }
      } catch {
        deleteCookie('krd_user')
      }
    }

    const savedAdmin = getCookie('krd_admin')
    if (savedAdmin) {
      adminToken.value = savedAdmin
    }
  }

  return {
    userAuth,
    adminToken,
    myLikes,
    myFollows,
    myCollectionFollows,
    myFollowedDevs,
    isLoggedIn,
    isAdmin,
    bearerHeaders,
    adminHeaders,
    setUserAuth,
    clearUserAuth,
    setAdminToken,
    clearAdminToken,
    loadUserReactionState,
    loadDevReactionState,
    loadChallengeLikes,
    restoreSession,
  }
})
