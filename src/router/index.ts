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
      // 下载增量热度榜：不进导航栏，入口挂在插件商店页
      path: '/plugins/rank',
      name: 'pluginRank',
      component: () => import('../views/PluginRank.vue'),
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
      redirect: '/wiki/plugin_guide',
    },
    {
      path: '/developer/:username',
      name: 'developer',
      component: () => import('../views/DeveloperProfile.vue'),
    },
    {
      path: '/_assets',
      name: 'assets',
      component: () => import('../views/FileListPage.vue'),
    },
    {
      path: '/admin/traffic',
      name: 'adminTraffic',
      component: () => import('../views/AdminTraffic.vue'),
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
