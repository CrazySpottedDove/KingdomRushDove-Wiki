import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: false })

export function mdToHtml(md: string): string {
  if (DOMPurify && marked) {
    return DOMPurify.sanitize(marked.parse(md || '') as string)
  }
  if (marked) return marked.parse(md || '') as string
  return '<pre>' + escHtml(md || '') + '</pre>'
}

export function escHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
