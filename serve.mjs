/**
 * Minimal static server for the plugin-market index.
 *
 *   node serve.mjs [port] [--lan]
 *
 * Defaults to 127.0.0.1:8099 (this machine only). `--lan` binds 0.0.0.0 so other
 * machines on the same network can read the index too. No dependencies.
 */
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const lan = args.includes('--lan')
const port = Number(args.find((a) => /^\d+$/.test(a)) ?? 8099)
const host = lan ? '0.0.0.0' : '127.0.0.1'

const TYPES = {
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`)
  const relative = decodeURIComponent(url.pathname === '/' ? '/index.json' : url.pathname)
  const file = path.resolve(here, '.' + relative)
  if (!file.startsWith(here)) {
    res.writeHead(403).end('forbidden')
    return
  }
  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }).end(`not found: ${relative}`)
      return
    }
    res.writeHead(200, {
      'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    })
    res.end(data)
  })
})

server.listen(port, host, () => {
  const shown = lan ? '<this-machine-ip>' : '127.0.0.1'
  console.log(`market index served at http://${shown}:${port}/index.json`)
  console.log('stop with Ctrl+C')
})
