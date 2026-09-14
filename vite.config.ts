import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import fs from 'fs'
import path from 'path'

const wikiDir = path.resolve(__dirname, 'wiki')
// 英文内容树（与线上 src/wiki_services.rs 的约定一致）
const wikiEnDir = path.resolve(wikiDir, 'en')

function extractTitle(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    const match = content.match(/^# (.+)$/m)
    return match ? match[1].trim() : path.basename(filePath, '.md')
  } catch {
    return path.basename(filePath, '.md')
  }
}

function buildSidebar(dir: string, basePath: string, relBase: string = wikiDir): any[] {
  const entries: any[] = []
  const items = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))
  
  for (const item of items) {
    if (item.name.startsWith('.')) continue
    // en 是英文内容树，不在中文目录里显示
    if (item.name === 'en' && dir === wikiDir) continue
    const fullPath = path.join(dir, item.name)
    
    if (item.isDirectory()) {
      if (!fs.existsSync(path.join(fullPath, 'index.md'))) continue
      const title = extractTitle(path.join(fullPath, 'index.md'))
      const children = buildSidebar(fullPath, path.join(basePath, item.name), relBase)
      entries.push({
        name: item.name,
        title,
        path: '/wiki/' + path.relative(relBase, fullPath).replace(/\\/g, '/'),
        is_dir: true,
        children,
      })
    } else if (item.name.endsWith('.md') && item.name !== 'index.md') {
      const title = extractTitle(fullPath)
      const relPath = path.relative(relBase, fullPath).replace(/\\/g, '/').replace(/\.md$/, '')
      entries.push({
        name: item.name.replace(/\.md$/, ''),
        title,
        path: '/wiki/' + relPath,
        is_dir: false,
        children: [],
      })
    }
  }
  return entries
}

export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'wiki-files',
      configureServer(server) {
        // 拦截 /api/wiki/sidebar，从本地目录生成
        server.middlewares.use('/api/wiki/sidebar', (req, res) => {
          try {
            const lang = new URL(req.url || '/', 'http://localhost').searchParams.get('lang')
            const entries = lang === 'en' && fs.existsSync(wikiEnDir)
              ? buildSidebar(wikiEnDir, '', wikiDir)
              : buildSidebar(wikiDir, '')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(entries))
          } catch (e: any) {
            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: e.message }))
          }
        })

        // 拦截 /static/wiki，从本地 wiki/ 读文件
        server.middlewares.use('/static/wiki', (req, res, next) => {
          const url = decodeURIComponent(req.url || '')
          const filePath = path.join(wikiDir, url.replace(/^\//, '').split('?')[0])
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const ext = path.extname(filePath)
            const mime: Record<string, string> = {
              '.md': 'text/markdown; charset=utf-8',
              '.png': 'image/png',
              '.jpg': 'image/jpeg',
              '.webp': 'image/webp',
              '.gif': 'image/gif',
              '.svg': 'image/svg+xml',
            }
            res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' })
            res.end(fs.readFileSync(filePath))
          } else {
            next()
          }
        })
      }
    }
  ],
  base: '/static/dist/',
  server: {
    proxy: {
      '/api': {
        target: 'https://krdovedownload4.crazyspotteddove.top',
        bypass: (req) => {
          if (req.url?.startsWith('/api/wiki/sidebar')) return
        },
      },
    },
  },
  build: {
    outDir: '../static/dist',
    emptyOutDir: true,
    manifest: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['vue', 'vue-router', 'pinia'],
          marked: ['marked'],
          dompurify: ['dompurify'],
        },
      },
    },
  },
})
