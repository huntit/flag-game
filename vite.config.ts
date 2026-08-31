import { defineConfig, type Plugin, type Connect } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function serveAndCopyData(): Plugin {
  const dataDir = path.resolve(__dirname, 'data')
  return {
    name: 'serve-and-copy-data',
    configureServer(server) {
      server.middlewares.use((req: Connect.IncomingMessage, res, next) => {
        const url = req.url?.split('?')[0] || ''
        const match = url.match(/^(?:\/flag-game)?\/data\/(.+)$/)
        if (!match) {
          next()
          return
        }
        const filePath = path.resolve(dataDir, match[1])
        if (!filePath.startsWith(dataDir) || !fs.existsSync(filePath)) {
          next()
          return
        }
        const ext = path.extname(filePath)
        res.setHeader('Content-Type', ext === '.json' ? 'application/json' : 'text/plain; charset=utf-8')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const dest = path.resolve(__dirname, 'dist/data')
      fs.mkdirSync(dest, { recursive: true })
      for (const file of fs.readdirSync(dataDir)) {
        fs.copyFileSync(path.join(dataDir, file), path.join(dest, file))
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), serveAndCopyData()],
  base: '/flag-game/',
  assetsInclude: ['**/*.txt'],
})
