/**
 * Vercel o'rniga oddiy Node server (Railway va boshqa xostinglar uchun).
 *
 *   npm run build && node server-dist/index.mjs      (PORT env, standart 3000)
 *
 * - dist/ dagi mini ilova va admin panel (/admin → admin.html);
 * - api/*.ts funksiyalari — Vercel'ning req/res ko'rinishiga moslab;
 * - vercel.json dagi cron'lar — shu jarayon ichida (CRON_SECRET bilan).
 *
 * api/ kodi o'zgarmaydi: Vercel'da ham, shu serverda ham bir xil ishlaydi.
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve } from 'node:path'
import type { VercelRequest, VercelResponse } from '@vercel/node'

import adminAction from '../api/admin/action.js'
import adminSession from '../api/admin/session.js'
import auth from '../api/auth.js'
import courier from '../api/courier.js'
import linkoCron from '../api/linko-cron.js'
import orderCancel from '../api/order-cancel.js'
import orders from '../api/orders.js'
import payment from '../api/payment.js'
import ping from '../api/ping.js'
import promo from '../api/promo.js'
import reviews from '../api/reviews.js'
import track from '../api/track.js'

type Handler = (req: VercelRequest, res: VercelResponse) => unknown
const ROUTES: Record<string, Handler> = {
  '/api/admin/action': adminAction,
  '/api/admin/session': adminSession,
  '/api/auth': auth,
  '/api/courier': courier,
  '/api/linko-cron': linkoCron,
  '/api/order-cancel': orderCancel,
  '/api/orders': orders,
  '/api/payment': payment,
  '/api/ping': ping,
  '/api/promo': promo,
  '/api/reviews': reviews,
  '/api/track': track,
}

const DIST = resolve(process.env.DIST_DIR || 'dist')
const PORT = Number(process.env.PORT) || 3000
const MAX_BODY = 12 * 1024 * 1024

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp4': 'video/mp4',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webmanifest': 'application/manifest+json',
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((ok, fail) => {
    const chunks: Buffer[] = []
    let size = 0
    req.on('data', (c: Buffer) => {
      size += c.length
      if (size > MAX_BODY) { fail(new Error('Body too large')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks)))
    req.on('error', fail)
  })
}

/** Vercel'dagidek: JSON → obyekt, form → obyekt, matn → satr. */
function parseBody(raw: Buffer, type: string): unknown {
  if (!raw.length) return undefined
  if (type.includes('application/json')) {
    try { return JSON.parse(raw.toString('utf8')) } catch { return raw.toString('utf8') }
  }
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(raw.toString('utf8')))
  if (type.startsWith('text/')) return raw.toString('utf8')
  return raw
}

function queryOf(url: URL): Record<string, string | string[]> {
  const q: Record<string, string | string[]> = {}
  for (const [k, v] of url.searchParams) {
    const prev = q[k]
    q[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v]
  }
  return q
}

function decorate(res: ServerResponse): VercelResponse {
  const r = res as unknown as VercelResponse & Record<string, unknown>
  r.status = (code: number) => { res.statusCode = code; return r }
  r.json = (data: unknown) => {
    if (!res.headersSent && !res.getHeader('content-type')) res.setHeader('content-type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(data))
    return r
  }
  r.send = (data: unknown) => {
    if (data === undefined || data === null) res.end()
    else if (Buffer.isBuffer(data) || typeof data === 'string') res.end(data)
    else return r.json(data)
    return r
  }
  r.redirect = ((a: number | string, b?: string) => {
    const [code, loc] = typeof a === 'number' ? [a, b ?? '/'] : [307, a]
    res.statusCode = code
    res.setHeader('location', loc)
    res.end()
    return r
  }) as VercelResponse['redirect']
  return r
}

async function handleApi(handler: Handler, req: IncomingMessage, res: ServerResponse, url: URL) {
  const raw = req.method === 'GET' || req.method === 'HEAD' ? Buffer.alloc(0) : await readBody(req)
  const vreq = req as unknown as VercelRequest & Record<string, unknown>
  vreq.query = queryOf(url)
  vreq.cookies = {}
  vreq.body = parseBody(raw, String(req.headers['content-type'] || ''))
  const vres = decorate(res)
  try {
    await handler(vreq, vres)
  } catch (error) {
    console.error('[api]', url.pathname, error)
    if (!res.headersSent) vres.status(500).json({ error: 'Server xatosi' })
    else res.end()
  }
}

function serveStatic(req: IncomingMessage, res: ServerResponse, url: URL) {
  let path = decodeURIComponent(url.pathname)
  if (path === '/admin' || path === '/admin/') path = '/admin.html'
  let file = normalize(join(DIST, path))
  if (!file.startsWith(DIST)) { res.statusCode = 400; return res.end() }
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // SPA: nomaʼlum sahifa → index.html (fayl so'ralgan bo'lsa — 404)
    if (extname(path)) { res.statusCode = 404; return res.end('Not found') }
    file = join(DIST, 'index.html')
  }
  const ext = extname(file).toLowerCase()
  res.setHeader('content-type', MIME[ext] || 'application/octet-stream')
  res.setHeader('cache-control', path.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : ext === '.html' ? 'no-cache' : 'public, max-age=3600')
  if (req.method === 'HEAD') return res.end()
  createReadStream(file).pipe(res)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', 'http://localhost')
    const route = ROUTES[url.pathname.replace(/\/+$/, '')]
    if (route) return await handleApi(route, req, res, url)
    if (url.pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('{"error":"Not found"}') }
    serveStatic(req, res, url)
  } catch (error) {
    console.error('[server]', error)
    if (!res.headersSent) { res.statusCode = 500; res.end() }
  }
})
server.requestTimeout = 120_000
server.listen(PORT, () => console.log(`Aqua Marin server: http://localhost:${PORT}`))

/* vercel.json cron'lari (UTC): 03:00 — Linko sinxron, 19:00 — smenalar. */
const CRONS = [
  { hour: 3, path: '/api/linko-cron' },
  { hour: 19, path: '/api/linko-cron?shifts=1' },
]
const ran = new Set<string>()
setInterval(() => {
  const secret = process.env.CRON_SECRET
  if (!secret) return
  const now = new Date()
  for (const c of CRONS) {
    const key = `${now.toISOString().slice(0, 10)}|${c.path}`
    if (now.getUTCHours() !== c.hour || now.getUTCMinutes() > 5 || ran.has(key)) continue
    ran.add(key)
    fetch(`http://127.0.0.1:${PORT}${c.path}`, { headers: { authorization: `Bearer ${secret}` } })
      .then((r) => console.log('[cron]', c.path, r.status))
      .catch((e) => console.error('[cron]', c.path, e))
  }
}, 60_000)
