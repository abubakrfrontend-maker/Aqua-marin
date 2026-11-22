import { randomInt } from 'node:crypto'
import { adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { escapeHtml, sendMessage } from '../telegram.js'

/**
 * Konkurs (masalan, bloggerlar orqali «botga START bosing — 5 ta set
 * o'ynaladi»).
 *
 * Ishtirokchilar — konkurs oralig'ida botda /start bosganlar. Bot har
 * /start ni `start_events` ga yozadi (bot/firebase_db.py → record_start),
 * shuning uchun botni o'zgartirish shart emas.
 *
 * Do'st taklifi: shaxsiy havola `t.me/aqua_marin_bot?start=ref_<telegram id>`.
 * Bot uni oddiy manba sifatida yozadi (source = «ref_123»). Taklif
 * hisoblanadi, agar do'st: botga BIRINCHI marta kirib START bosgan (isNewUser),
 * o'zini o'zi taklif qilmagan va admin uni chiqarib tashlamagan bo'lsa
 * (soxta akkaunt — «Chiqarish»). Mini app'ni ochish shart emas (2026-11-02,
 * Abubakr qarori). Har bir taklif +1 imkoniyat, cheklovsiz.
 *
 * Tanlov serverda: `crypto.randomInt`, har imkoniyat teng ehtimol. Admin
 * panel baraban animatsiyasini faqat ko'rsatadi — natija oldindan shu yerda.
 */

const DOC = () => adminDb().then((db) => db.collection('giveaways').doc('current'))

export type GiveawayConfig = {
  title: string
  prize: string
  startAt: string | null
  endAt: string | null
  winners: number
  /**
   * Bosqichlar (har sovg'a — bitta): `top` — reytingdagi eng yuqori (barabansiz),
   * `draw` — reytingning birinchi `pool` tasi orasida baraban (ochkoga mutanosib).
   * Avval yutganlar keyingi bosqichga kirmaydi. Bo'lmasa — hamma orasida baraban.
   */
  rounds?: Round[] | null
  /** Do'st taklifi — cheklovsiz: har bir haqiqiy yangi do'st +1 imkoniyat (Abubakr, 2026-10-26). */
  referral: { enabled: boolean }
  messageUz: string
  messageRu: string
}

export type Round = { mode: 'top' | 'draw'; pool: number }

/** Abubakr (2026-11-02): 1 — reyting 1-o'rni, 2 — TOP-5, 3 — TOP-10, 4–5 — TOP-100. */
export const DEFAULT_ROUNDS: Round[] = [
  { mode: 'top', pool: 1 },
  { mode: 'draw', pool: 5 },
  { mode: 'draw', pool: 10 },
  { mode: 'draw', pool: 100 },
  { mode: 'draw', pool: 100 },
]

/** Reyting tartibi: ochko, keyin takliflar, keyin kim oldinroq qo'shilgan. */
const byRank = (a: { tickets: number; refs: number; firstAt: string }, b: { tickets: number; refs: number; firstAt: string }) =>
  b.tickets - a.tickets || b.refs - a.refs || a.firstAt.localeCompare(b.firstAt)

function readRounds(value: unknown): Round[] | undefined {
  if (!Array.isArray(value) || !value.length) return undefined
  if (value.length > 20) throw new Error('Bosqichlar 20 tadan ko‘p bo‘lmaydi')
  return value.map((r, i) => {
    const raw = (r ?? {}) as { mode?: unknown; pool?: unknown }
    const mode = raw.mode === 'top' ? 'top' : 'draw'
    const pool = Math.round(Number(raw.pool))
    if (mode === 'draw' && (!Number.isFinite(pool) || pool < 1 || pool > 100000)) throw new Error(`${i + 1}-bosqich: TOP soni noto‘g‘ri`)
    return { mode, pool: mode === 'top' ? 1 : pool }
  })
}

type Draw = { id: string; name: string; username: string | null; tickets: number; at: string; by: string; mode?: 'top' | 'draw'; pool?: number; rank?: number }

const DEFAULTS: GiveawayConfig = {
  title: 'Aqua Marin konkursi',
  prize: 'Aqua Marin sovg‘a to‘plami',
  startAt: null,
  endAt: null,
  winners: 5,
  referral: { enabled: true },
  messageUz: '🎉 Tabriklaymiz, {name}!\n\nSiz Aqua Marin konkursida g‘olib bo‘ldingiz va <b>{prize}</b> yutib oldingiz! 🎁\n\nSovg‘ani topshirish uchun tez orada operatorimiz siz bilan bog‘lanadi.',
  messageRu: '🎉 Поздравляем, {name}!\n\nВы стали победителем конкурса Aqua Marin и выиграли <b>{prize}</b>! 🎁\n\nНаш оператор скоро свяжется с вами, чтобы передать подарок.',
}

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const iso = (v: unknown): string | null => {
  if (typeof v !== 'string' || !v) return null
  const t = Date.parse(v)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

async function load() {
  const ref = await DOC()
  const snap = await ref.get()
  const data = snap.exists ? snap.data() ?? {} : {}
  const config: GiveawayConfig = { ...DEFAULTS, ...(data.config ?? {}), referral: { ...DEFAULTS.referral, ...(data.config?.referral ?? {}) } }
  return {
    ref,
    config,
    draws: (Array.isArray(data.draws) ? data.draws : []) as Draw[],
    excluded: (Array.isArray(data.excluded) ? data.excluded.map(String) : []) as string[],
    /** Qo'shimcha ochko (admin qarori, sababi bilan): { [telegramId]: { points, reason, by, at } }. */
    bonus: (data.bonus && typeof data.bonus === 'object' ? data.bonus : {}) as Record<string, { points: number; reason: string; by: string; at: string }>,
    confirmedAt: (data.confirmedAt as string | undefined) ?? null,
    sent: (data.sent ?? null) as { ok: number; failed: number } | null,
    board: (data.board ?? null) as Board | null,
  }
}

type Board = { at: string; rows: { id: string; name: string; points: number; refs: number }[] }

export type Participant = {
  id: string
  name: string
  username: string | null
  starts: number
  firstAt: string
  isNew: boolean
  refs: number
  tickets: number
  excluded: boolean
  /** Qo'shimcha ochko (admin bergan) va sababi. */
  bonus: number
  bonusReason: string | null
}

const displayName = (u: FirebaseFirestore.DocumentData | undefined, id: string) =>
  text(u?.contactName, 60) || [u?.first_name, u?.last_name].filter(Boolean).join(' ').trim() || (u?.username ? `@${u.username}` : `ID ${id}`)

/** Ishtirokchilar va imkoniyatlari (konkurs oralig'i bo'yicha). */
/**
 * Yig'ma: ishtirokchilar va takliflar `giveaway_cache/agg` da saqlanadi.
 * Har safar butun jurnal (minglab START + foydalanuvchi) o'qilmaydi —
 * faqat oxirgi `cursor` dan keyingi yozuvlar va ularning egalari.
 * 2026-11-09: har «Konkurs» bosishda to'liq qayta hisob Firestore kunlik
 * limitini tugatib, butun do'konni to'xtatib qo'ygan edi.
 * Konkurs vaqti o'zgarsa (yoki admin saqlasa) — bir marta to'liq quriladi.
 */
type Agg = {
  key: string
  /** Oxirgi ko'rilgan yozuv vaqti (ms). */
  cursor: number
  /** cursor − OVERLAP oralig'idagi ko'rilgan yozuvlar (qayta sanalmasin). */
  seen: string[]
  /** id → [START soni, birinchi vaqt, yangi foydalanuvchi, ism, username] */
  users: Record<string, [number, string, 0 | 1, string, string | null]>
  /** [taklif qilgan, do'st] */
  pairs: [string, string][]
}
const AGG_OVERLAP_MS = 2 * 60 * 1000
const AGG_MAX_BYTES = 900_000
const aggRef = () => adminDb().then((db) => db.collection('giveaway_cache').doc('agg'))
const ms = (v: unknown) => {
  const t = Date.parse(String(v ?? ''))
  return Number.isNaN(t) ? 0 : t
}

/** Admin saqlasa/chiqarsa — keyingi so'rovda yig'ma noldan quriladi. */
async function resetAgg() {
  await (await aggRef()).delete()
}

async function aggregate(config: GiveawayConfig): Promise<Agg> {
  const db = await adminDb()
  const ref = await aggRef()
  const key = `${config.startAt}|${config.endAt ?? ''}`
  const startMs = ms(config.startAt)
  let agg: Agg | null = null
  const snap = await ref.get()
  if (snap.exists) {
    try {
      const parsed = JSON.parse(String(snap.data()?.json ?? '')) as Agg
      if (parsed?.key === key) agg = parsed
    } catch { /* buzilgan — qayta quriladi */ }
  }
  const fresh = !agg
  if (!agg) agg = { key, cursor: startMs, seen: [], users: {}, pairs: [] }

  const from = new Date(Math.max(startMs, agg.cursor - AGG_OVERLAP_MS)).toISOString()
  // Mijozlar /start ni ham, «🎁 Konkurs» tugmasini ham (START bosmagan eski mijozlar) bosadi
  let q = db.collection('start_events').where('createdAt', '>=', fresh ? config.startAt! : from)
  if (config.endAt) q = q.where('createdAt', '<', config.endAt)
  let jq = db.collection('giveaway_entries').where('createdAt', '>=', fresh ? config.startAt! : from)
  if (config.endAt) jq = jq.where('createdAt', '<', config.endAt)
  const [evSnap, enSnap] = await Promise.all([q.get(), jq.get()])
  const items = [
    ...evSnap.docs.map((d) => {
      const e = d.data()
      return { key: `s:${d.id}`, id: String(e.telegramUserId ?? ''), at: String(e.createdAt ?? ''), source: String(e.source ?? ''), isNew: !!e.isNewUser }
    }),
    ...enSnap.docs.map((d) => {
      const e = d.data()
      return { key: `g:${d.id}:${e.createdAt}`, id: String(e.telegramUserId ?? ''), at: String(e.createdAt ?? ''), source: 'konkurs_button', isNew: false }
    }),
  ]

  const seen = new Set(agg.seen)
  const touched = new Set<string>()
  let cursor = agg.cursor
  for (const e of items) {
    if (seen.has(e.key)) continue
    seen.add(e.key)
    cursor = Math.max(cursor, ms(e.at))
    if (!e.id) continue
    const row = agg.users[e.id] ?? [0, e.at, 0, '', null]
    row[0]++
    if (e.at < row[1]) row[1] = e.at
    if (e.isNew) row[2] = 1
    agg.users[e.id] = row
    touched.add(e.id)
    const m = /^ref_(\d{3,20})$/.exec(e.source)
    if (m && e.isNew && m[1] !== e.id) agg.pairs.push([m[1], e.id])
  }

  // Ism va username — faqat yangi kelganlarniki o'qiladi
  const ids = [...touched]
  for (let i = 0; i < ids.length; i += 300) {
    const snaps = await db.getAll(...ids.slice(i, i + 300).map((id) => db.collection('users').doc(id)))
    for (const s of snaps) {
      const row = agg.users[s.id]
      if (!row) continue
      const u = s.exists ? s.data() : undefined
      row[3] = displayName(u, s.id)
      row[4] = u?.username ? String(u.username) : null
    }
  }

  // Keyingi so'rov cursor − OVERLAP dan o'qiydi — o'sha oraliqdagilar «ko'rilgan» bo'lib qolsin
  const keep = new Set(items.filter((e) => ms(e.at) >= cursor - AGG_OVERLAP_MS || !ms(e.at)).map((e) => e.key))
  agg.seen = [...seen].filter((k) => keep.has(k))
  agg.cursor = cursor
  if (fresh || touched.size) {
    const json = JSON.stringify(agg)
    if (json.length < AGG_MAX_BYTES) await ref.set({ json, at: new Date().toISOString() })
    else console.warn('[giveaway] yig\'ma juda katta, saqlanmadi:', json.length)
  }
  return agg
}

async function participants(state: Awaited<ReturnType<typeof load>>): Promise<Participant[]> {
  const { config, excluded, bonus } = state
  if (!config.startAt) return []
  const agg = await aggregate(config)

  const byUser = new Map<string, { starts: number; firstAt: string; isNew: boolean }>()
  const users = new Map<string, { name: string; username: string | null }>()
  for (const [id, [starts, firstAt, isNew, name, username]] of Object.entries(agg.users)) {
    byUser.set(id, { starts, firstAt, isNew: !!isNew })
    users.set(id, { name, username })
  }
  const refPairs = agg.pairs.map(([from, to]) => ({ from, to }))
  const ids = [...byUser.keys()]

  // Taklif: START bosgan yangi do'st yetarli; chiqarilgan (soxta) do'st hisoblanmaydi
  const refs = new Map<string, Set<string>>()
  if (config.referral.enabled) {
    for (const { from, to } of refPairs) {
      if (!byUser.has(from)) continue
      if (excluded.includes(to)) continue
      const set = refs.get(from) ?? new Set<string>()
      set.add(to)
      refs.set(from, set)
    }
  }

  return ids
    .map((id) => {
      const u = users.get(id)
      const row = byUser.get(id)!
      const r = refs.get(id)?.size ?? 0
      return {
        id,
        name: u?.name || `ID ${id}`,
        username: u?.username ?? null,
        starts: row.starts,
        firstAt: row.firstAt,
        isNew: row.isNew,
        refs: r,
        tickets: 1 + (config.referral.enabled ? r : 0) + Math.max(0, Math.round(Number(bonus[id]?.points) || 0)),
        excluded: excluded.includes(id),
        bonus: Math.max(0, Math.round(Number(bonus[id]?.points) || 0)),
        bonusReason: bonus[id]?.reason ?? null,
      }
    })
    .sort(byRank)
}

/** Mini app uchun ochiq qismi (settings/giveaway — kirgan har kim o'qiydi). */
async function publish(config: GiveawayConfig, confirmed: boolean) {
  const db = await adminDb()
  await db.collection('settings').doc('giveaway').set({
    title: config.title,
    prize: config.prize,
    startAt: config.startAt,
    endAt: config.endAt,
    winners: config.winners,
    referral: config.referral.enabled,
    finished: confirmed,
  })
}

export async function giveawayGet() {
  const state = await load()
  const list = await participants(state)
  const pool = list.filter((p) => !p.excluded)
  return {
    config: state.config,
    draws: state.draws,
    confirmedAt: state.confirmedAt,
    sent: state.sent,
    participants: list,
    stats: {
      people: pool.length,
      tickets: pool.reduce((s, p) => s + p.tickets, 0),
      newUsers: pool.filter((p) => p.isNew).length,
      refs: pool.reduce((s, p) => s + p.refs, 0),
    },
  }
}

export async function giveawaySave(actor: Staff, body: Record<string, unknown>) {
  const state = await load()
  if (state.confirmedAt) throw new Error('Konkurs yakunlangan — yangi konkurs uchun «Yangi konkurs» ni bosing')
  const winners = Math.round(Number(body.winners))
  const config: GiveawayConfig = {
    title: text(body.title, 120) || DEFAULTS.title,
    prize: text(body.prize, 120) || DEFAULTS.prize,
    startAt: iso(body.startAt),
    endAt: iso(body.endAt),
    winners: Number.isFinite(winners) && winners >= 1 && winners <= 50 ? winners : 5,
    rounds: readRounds(body.rounds) ?? null,
    referral: {
      enabled: (body.referral as { enabled?: unknown } | undefined)?.enabled !== false,
    },
    messageUz: text(body.messageUz, 1500) || DEFAULTS.messageUz,
    messageRu: text(body.messageRu, 1500) || DEFAULTS.messageRu,
  }
  // null — merge bilan eski bosqichlar qolib ketmasin
  if (config.rounds) config.winners = config.rounds.length
  if (!config.startAt) throw new Error('Boshlanish vaqtini kiriting')
  if (config.endAt && config.endAt <= config.startAt) throw new Error('Tugash vaqti boshlanishidan keyin bo‘lishi kerak')
  await state.ref.set({ config, board: null, updatedAt: new Date().toISOString(), updatedBy: actor.name || actor.email }, { merge: true })
  await resetAgg()
  await publish(config, false)
  return { ok: true }
}

/** Ishtirokchini chiqarish/qaytarish (masalan, xodim yoki test akkaunt). */
export async function giveawayExclude(_actor: Staff, body: Record<string, unknown>) {
  const id = text(body.id, 20)
  if (!/^\d+$/.test(id)) throw new Error('Ishtirokchi topilmadi')
  const state = await load()
  if (state.confirmedAt) throw new Error('Konkurs yakunlangan')
  if (state.draws.some((d) => d.id === id)) throw new Error('G‘olibni chiqarib bo‘lmaydi — avval uni bekor qiling')
  const set = new Set(state.excluded)
  if (body.excluded === false) set.delete(id)
  else set.add(id)
  await state.ref.set({ excluded: [...set], board: null }, { merge: true })
  return { ok: true }
}

/** Barabanda ko'pi bilan shuncha bo'lak; qolganlari bitta «Yana N kishi» bo'lagiga (ochkolari yig'iladi). */
const WHEEL_MAX = 24
type WheelItem = { id: string; name: string; username: string | null; tickets: number; others?: number }
function compactWheel(pool: WheelItem[], winnerId?: string): WheelItem[] {
  if (pool.length <= WHEEL_MAX) return pool
  let shown = pool.slice(0, WHEEL_MAX - 1)
  const winner = winnerId ? pool.find((p) => p.id === winnerId) : undefined
  if (winner && !shown.includes(winner)) shown = [...pool.slice(0, WHEEL_MAX - 2), winner]
  const ids = new Set(shown.map((p) => p.id))
  const rest = pool.filter((p) => !ids.has(p.id))
  return [...shown, { id: 'others', name: `Yana ${rest.length} kishi`, username: null, tickets: rest.reduce((s, p) => s + p.tickets, 0), others: rest.length }]
}

/**
 * Navbatdagi g'olib. Bosqich bo'lsa — reytingning birinchi `pool` tasi
 * (avval yutganlarsiz) orasidan; `top` — eng yuqorisi, `draw` — ochkoga
 * mutanosib tasodifiy. Bosqich bo'lmasa — hamma orasida baraban.
 */
export async function giveawayDraw(actor: Staff) {
  const state = await load()
  if (state.confirmedAt) throw new Error('Konkurs yakunlangan')
  const rounds = state.config.rounds
  const total = rounds?.length ?? state.config.winners
  if (state.draws.length >= total) throw new Error(`${total} ta g‘olib aniqlandi`)
  const drawn = new Set(state.draws.map((d) => d.id))
  const ranked = (await participants(state)).filter((p) => !p.excluded)
  const round = rounds?.[state.draws.length] ?? { mode: 'draw' as const, pool: ranked.length }
  let pool = ranked.slice(0, round.mode === 'top' ? ranked.length : round.pool).filter((p) => !drawn.has(p.id))
  // Ishtirokchi kam bo'lsa — qolgan hamma
  if (!pool.length) pool = ranked.filter((p) => !drawn.has(p.id))
  if (!pool.length) throw new Error('Tanlash uchun ishtirokchi qolmadi')

  let winner = pool[0]
  if (round.mode === 'draw') {
    const sum = pool.reduce((s, p) => s + p.tickets, 0)
    let ticket = randomInt(sum)
    for (const p of pool) {
      if (ticket < p.tickets) { winner = p; break }
      ticket -= p.tickets
    }
  }
  const rank = ranked.findIndex((p) => p.id === winner.id) + 1
  const draw: Draw = { id: winner.id, name: winner.name, username: winner.username, tickets: winner.tickets, at: new Date().toISOString(), by: actor.name || actor.email, mode: round.mode, pool: round.mode === 'top' ? 1 : round.pool, rank }
  await state.ref.set({ draws: [...state.draws, draw] }, { merge: true })

  // Baraban: shu bosqich havzasi, bo'lak kattaligi = ochko (haqiqiy imkoniyat). `top` — faqat g'olib.
  const items = (round.mode === 'top' ? [winner] : pool).map((p) => ({ id: p.id, name: p.name, username: p.username, tickets: p.tickets }))
  const wheel = compactWheel(items, winner.id)
  return { ok: true, winner: draw, wheel, number: state.draws.length + 1, mode: round.mode, pool: pool.length }
}

/** Oxirgi aniqlangan g'olibni bekor qilish (tasdiqlashdan oldin). */
export async function giveawayUndo() {
  const state = await load()
  if (state.confirmedAt) throw new Error('Konkurs yakunlangan')
  await state.ref.set({ draws: state.draws.slice(0, -1) }, { merge: true })
  return { ok: true }
}

/** Tasdiqlash: g'oliblarga bot orqali xabar. Bir marta. */
export async function giveawayConfirm(actor: Staff) {
  const db = await adminDb()
  const state = await load()
  if (state.confirmedAt) throw new Error('G‘oliblarga xabar allaqachon yuborilgan')
  if (!state.draws.length) throw new Error('Avval g‘oliblarni aniqlang')
  const now = new Date().toISOString()
  // Avval belgilanadi — ikki marta bosilsa ham xabar ikki marta ketmasin
  await state.ref.set({ confirmedAt: now, confirmedBy: actor.name || actor.email }, { merge: true })

  let ok = 0
  let failed = 0
  const results: { id: string; ok: boolean; error?: string }[] = []
  for (const d of state.draws) {
    const user = (await db.collection('users').doc(d.id).get()).data()
    const ru = user?.language === 'ru'
    const template = ru ? state.config.messageRu : state.config.messageUz
    const firstName = text(user?.first_name, 60) || d.name
    const message = template
      .replace(/\{name\}/g, escapeHtml(firstName))
      .replace(/\{prize\}/g, escapeHtml(state.config.prize))
    const res = await sendMessage(Number(d.id), message)
    if (res.ok) ok++
    else failed++
    results.push({ id: d.id, ok: res.ok, ...(res.ok ? {} : { error: res.error }) })
  }
  await state.ref.set({ sent: { ok, failed, results } }, { merge: true })
  await publish(state.config, true)
  return { ok: true, sent: ok, failed }
}

/** Yangi konkurs: oldingisi tarixga ko'chiriladi. */
export async function giveawayReset(actor: Staff) {
  const db = await adminDb()
  const state = await load()
  const snap = await state.ref.get()
  if (snap.exists) await db.collection('giveaways').add({ ...snap.data(), archivedAt: new Date().toISOString(), archivedBy: actor.name || actor.email })
  await state.ref.delete()
  await db.collection('settings').doc('giveaway').delete()
  await resetAgg()
  return { ok: true }
}

// ─── Bot uchun: ochko, reyting, ishtirok (api/linko-cron.ts ?giveaway=1) ───

/** Oxirgi muvaffaqiyatli reyting (shu server nusxasi xotirasida) — baza javob bermasa ko'rsatiladi. */
let lastBoard: { config: GiveawayConfig; done: boolean; rows: Board['rows']; winnersList: { name: string }[] } | null = null

/**
 * Baza butunlay yetib bo'lmaganda (2026-11-09: Firestore limiti / to'lov hisobi)
 * xotirada hech narsa bo'lmasa — joriy konkursning ochiq ma'lumoti.
 * Faqat shu konkurs uchun; tugagach (endAt) ishlatilmaydi.
 */
const OFFLINE_CONFIG: GiveawayConfig = {
  ...DEFAULTS,
  title: 'Aqua Marin konkursi',
  prize: "Aqua Marin sovg'a to'plami",
  startAt: '2026-11-02T00:00:00.000Z',
  endAt: '2026-11-09T13:00:00.000Z',
  winners: 5,
  referral: { ...DEFAULTS.referral, enabled: true },
}

const FALLBACK_TIMEOUT_MS = 7000

/**
 * Bot uchun xavfsiz: baza xato bersa yoki 7 soniyada javob bermasa —
 * oxirgi saqlangan reyting (`stale: true`). Ishtirok keyin, baza tiklanganda,
 * bot navbatidagi START lar orqali o'zi yoziladi.
 */
export async function giveawayBoardSafe(userId: string, join = false) {
  const live = giveawayBoard(userId, join)
  live.catch(() => {}) // kech kelgan xato funksiyani yiqitmasin
  try {
    return await Promise.race([
      live,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), FALLBACK_TIMEOUT_MS)),
    ])
  } catch (e) {
    console.warn('[giveaway] baza javob bermadi, oxirgi ro\'yxat:', String(e).slice(0, 200))
    return giveawayOffline(userId)
  }
}

export function giveawayOffline(userId: string, now = Date.now()) {
  const memo = lastBoard
  const config = memo?.config ?? OFFLINE_CONFIG
  const done = memo?.done ?? false
  if (!memo && config.endAt && Date.parse(config.endAt) <= now) throw new Error('GIVEAWAY_OFFLINE')
  const rows = memo?.rows ?? []
  const index = rows.findIndex((r) => r.id === userId)
  const me = index >= 0 ? rows[index] : null
  return {
    stale: true,
    exists: !!config.startAt,
    active: isActive(config, done, now),
    finished: done,
    title: config.title,
    prize: config.prize,
    startAt: config.startAt,
    endAt: config.endAt,
    winners: config.winners,
    referral: config.referral.enabled,
    participants: rows.length,
    me: me ? { points: me.points, refs: me.refs, rank: index + 1 } : null,
    top: rows.slice(0, 10).map((r) => ({ name: r.name, points: r.points, refs: r.refs })),
    winnersList: memo?.winnersList ?? [],
  }
}

/** Hozir konkurs davom etyaptimi. */
const isActive = (c: GiveawayConfig, done: boolean, now = Date.now()) =>
  !done && !!c.startAt && Date.parse(c.startAt) <= now && (!c.endAt || Date.parse(c.endAt) > now)

/** Reytingda to'liq ism emas: «Aziza», username bo'lsa — qisman yashirin. */
function publicName(p: Participant): string {
  const first = p.name.startsWith('@') || p.name.startsWith('ID ') ? '' : p.name.split(/\s+/)[0]
  if (first) return first.slice(0, 18)
  if (p.username) return `@${p.username.slice(0, 3)}***`
  return 'Ishtirokchi'
}

const BOARD_TTL_MS = 3 * 60 * 1000

/**
 * Ochko = imkoniyatlar soni (1 + taklif qilgan yangi do'stlar, cheklovsiz).
 * Ro'yxat 3 daqiqa keshlanadi — har tugma bosishda butun jurnal o'qilmasin.
 */
export async function giveawayBoard(userId: string, join = false) {
  const state = await load()
  const { config } = state
  const done = !!state.confirmedAt
  const active = isActive(config, done)
  const db = await adminDb()

  // Ishtirok: konkurs davomida tugma bosilsa — birinchi marta yoziladi
  let joinedNow = false
  if (join && active && /^\d{3,20}$/.test(userId)) {
    const ref = db.collection('giveaway_entries').doc(userId)
    const snap = await ref.get()
    const fresh = !snap.exists || !config.startAt || String(snap.data()?.createdAt ?? '') < config.startAt
    if (fresh) {
      await ref.set({ telegramUserId: Number(userId), createdAt: new Date().toISOString() })
      joinedNow = true
    }
  }

  const cached = state.board
  let rows = cached?.rows ?? []
  // Yangi qo'shilgan uchun qayta hisoblanmaydi — ro'yxat oxiriga 1 ochko bilan
  // (keyingi yangilanishda o'z o'rniga tushadi). Har bosishda qayta hisob limitni tugatgan edi.
  if (!cached || Date.now() - Date.parse(cached.at) > BOARD_TTL_MS) {
    const list = (await participants(state)).filter((p) => !p.excluded)
    rows = [...list].sort(byRank)
      .map((p) => ({ id: p.id, name: publicName(p), points: p.tickets, refs: p.refs }))
    await state.ref.set({ board: { at: new Date().toISOString(), rows } }, { merge: true })
  }

  let index = rows.findIndex((r) => r.id === userId)
  if (index < 0 && joinedNow) {
    rows = [...rows, { id: userId, name: 'Ishtirokchi', points: 1, refs: 0 }]
    index = rows.length - 1
  }
  const me = index >= 0 ? rows[index] : null
  lastBoard = { config, done, rows, winnersList: done ? state.draws.map((d) => ({ name: publicName({ name: d.name, username: d.username } as Participant) })) : [] }
  return {
    exists: !!config.startAt,
    active,
    finished: done,
    title: config.title,
    prize: config.prize,
    startAt: config.startAt,
    endAt: config.endAt,
    winners: config.winners,
    referral: config.referral.enabled,
    participants: rows.length,
    me: me ? { points: me.points, refs: me.refs, rank: index + 1 } : null,
    top: rows.slice(0, 10).map((r) => ({ name: r.name, points: r.points, refs: r.refs })),
    winnersList: done ? state.draws.map((d) => ({ name: publicName({ name: d.name, username: d.username } as Participant) })) : [],
  }
}
