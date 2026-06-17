import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomePage.vue'),
    },
    {
      path: '/plugins',
      name: 'plugins',
      component: () => import('../views/PluginStore.vue'),
    },
    {
      path: '/challenges',
      name: 'challenges',
      component: () => import('../views/ChallengesPage.vue'),
    },
    {
      path: '/history',
      name: 'history',
      component: () => import('../views/HistoryPage.vue'),
    },
    {
      path: '/changelog',
      redirect: '/wiki',
    },
    {
      path: '/plugin_guide',
      name: 'pluginGuide',
      component: () => import('../views/PluginGuidePage.vue'),
    },
    {
      path: '/developer/:username',
      name: 'developer',
      component: () => import('../views/DeveloperProfile.vue'),
    },
    {
      path: '/files',
      name: 'files',
      component: () => import('../views/FileListPage.vue'),
    },
    {
      path: '/_assets',
      name: 'assets',
      component: () => import('../views/FileListPage.vue'),
    },
    {
      path: '/wiki',
      name: 'wiki',
      component: () => import('../views/WikiPage.vue'),
    },
    {
      path: '/wiki/:pathMatch(.*)*',
      name: 'wikiSub',
      component: () => import('../views/WikiPage.vue'),
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
