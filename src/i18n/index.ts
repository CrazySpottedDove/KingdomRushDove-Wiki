import { ref } from 'vue'
import { zhCN, type MessageKey } from './zh-CN'
import { en } from './en'

/**
 * 轻量 i18n：不引入额外依赖，仅靠一个响应式 locale + 两张文案表。
 *
 * - 默认语言为简体中文，用户选择保存在 localStorage（`krdove_locale`）。
 * - 也支持通过 `?lang=en` / `?lang=zh-CN` 指定，方便分享链接。
 * - 模板里 `import { t } from '../i18n'` 后直接用 `t('nav.plugins')`；
 *   `t` 内部读取 `locale.value`，切换语言后依赖它的组件会自动重渲染。
 */
export type Locale = 'zh-CN' | 'en'

export const DEFAULT_LOCALE: Locale = 'zh-CN'

export const LOCALES: ReadonlyArray<{ value: Locale; label: string; htmlLang: string }> = [
  { value: 'zh-CN', label: '中文', htmlLang: 'zh-CN' },
  { value: 'en', label: 'English', htmlLang: 'en' },
]

const STORAGE_KEY = 'krdove_locale'
const TABLES: Record<Locale, Record<MessageKey, string>> = { 'zh-CN': zhCN, en }

function isLocale(value: unknown): value is Locale {
  return LOCALES.some((l) => l.value === value)
}

function readStoredLocale(): Locale | null {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY)
    return isLocale(v) ? v : null
  } catch {
    return null
  }
}

function readQueryLocale(): Locale | null {
  try {
    const v = new URLSearchParams(window.location.search).get('lang')
    if (!v) return null
    // 允许 zh / zh-cn / en / en-US 之类的写法
    const lower = v.toLowerCase()
    if (lower.startsWith('zh')) return 'zh-CN'
    if (lower.startsWith('en')) return 'en'
    return null
  } catch {
    return null
  }
}

function detectLocale(): Locale {
  return readQueryLocale() ?? readStoredLocale() ?? DEFAULT_LOCALE
}

/** 当前语言（响应式，模板中读取即可自动跟随切换） */
export const locale = ref<Locale>(detectLocale())

/**
 * 取文案。key 不在表中时回退到中文，再回退到 key 本身（便于发现漏翻）。
 * `params` 用于替换 `{name}` 形式的插值。
 */
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  const table = TABLES[locale.value]
  let text: string = table[key] ?? zhCN[key] ?? key
  if (params) {
    for (const name of Object.keys(params)) {
      text = text.split(`{${name}}`).join(String(params[name]))
    }
  }
  return text
}

function syncDocument() {
  const info = LOCALES.find((l) => l.value === locale.value) ?? LOCALES[0]
  document.documentElement.lang = info.htmlLang
  document.title = t('site.title')
}

/** 切换语言并持久化（同时同步 <html lang> 与页面标题） */
export function setLocale(next: Locale) {
  if (!isLocale(next) || next === locale.value) {
    syncDocument()
    return
  }
  locale.value = next
  try {
    window.localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* 隐私模式下写不了 localStorage，忽略即可 */
  }
  syncDocument()
}

/** 组件内使用：`const { t, locale, setLocale } = useI18n()` */
export function useI18n() {
  return { t, locale, setLocale, locales: LOCALES }
}

syncDocument()

export type { MessageKey }
