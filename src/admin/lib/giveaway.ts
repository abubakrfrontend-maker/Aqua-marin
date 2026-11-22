/**
 * Konkurs: admin sahifasi va strim barabani uchun umumiy turlar va hisoblar.
 * Tanlovning o'zi serverda (api/_lib/actions/giveaway.ts) — bu yerdagilar faqat ko'rsatish uchun.
 */

export type Config = {
  title: string
  prize: string
  startAt: string | null
  endAt: string | null
  winners: number
  /** Bosqichlar: `top` — reyting 1-o'rni (aniq), `draw` — TOP-N orasida baraban. */
  rounds?: Round[] | null
  referral: { enabled: boolean }
  messageUz: string
  messageRu: string
}
export type Participant = { id: string; name: string; username: string | null; starts: number; firstAt: string; isNew: boolean; refs: number; tickets: number; excluded: boolean; bonus?: number; bonusReason?: string | null }
export type Round = { mode: 'top' | 'draw'; pool: number }
export type Draw = { id: string; name: string; username: string | null; tickets: number; at: string; mode?: 'top' | 'draw'; pool?: number; rank?: number }

export const roundLabel = (r: Round | undefined) => (!r ? 'hamma orasida baraban' : r.mode === 'top' ? 'reyting 1-o‘rni (aniq)' : `TOP-${r.pool} orasida baraban`)
export type State = {
  config: Config
  draws: Draw[]
  confirmedAt: string | null
  sent: { ok: number; failed: number } | null
  participants: Participant[]
  stats: { people: number; tickets: number; newUsers: number; refs: number }
}
/** Barabanda ko'pi bilan shuncha bo'lak; qolganlari bitta «Yana N kishi» bo'lagiga (ochkolari yig'iladi). */
const WHEEL_MAX = 24
export type WheelName = { id: string; name: string; username: string | null; tickets: number; others?: number }
export function compactWheel(pool: WheelName[], winnerId?: string): WheelName[] {
  if (pool.length <= WHEEL_MAX) return pool
  let shown = pool.slice(0, WHEEL_MAX - 1)
  const winner = winnerId ? pool.find((p) => p.id === winnerId) : undefined
  if (winner && !shown.includes(winner)) shown = [...pool.slice(0, WHEEL_MAX - 2), winner]
  const ids = new Set(shown.map((p) => p.id))
  const rest = pool.filter((p) => !ids.has(p.id))
  return [...shown, { id: 'others', name: `Yana ${rest.length} kishi`, username: null, tickets: rest.reduce((s, p) => s + p.tickets, 0), others: rest.length }]
}

/** Keyingi bosqich havzasi: reyting bo'yicha, avval yutganlarsiz (server bilan bir xil). */
export function nextPool(state: State): WheelName[] {
  const round = state.config.rounds?.[state.draws.length]
  const drawn = new Set(state.draws.map((d) => d.id))
  const ranked = state.participants.filter((p) => !p.excluded)
  const left = ranked.filter((p) => !drawn.has(p.id))
  let pool = round?.mode === 'top' ? left.slice(0, 1) : (round ? ranked.slice(0, round.pool) : ranked).filter((p) => !drawn.has(p.id))
  if (!pool.length) pool = left
  return pool.map((p) => ({ id: p.id, name: p.name, username: p.username, tickets: p.tickets }))
}

/** Ishtirokchining Telegram profili: username bo'lsa t.me, bo'lmasa ID orqali (Telegram ilovasida ochiladi). */
export const tgLink = (p: { id: string; username: string | null }) => (p.username ? `https://t.me/${p.username}` : `tg://user?id=${p.id}`)
