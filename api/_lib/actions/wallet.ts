import { adminDb } from '../firebase-admin.js'
import type { Staff } from '../admin-auth.js'
import { escapeHtml, sendMessage, sendRows, telegramCall } from '../telegram.js'
import { userLang, type Lang } from '../i18n.js'
import { DEFAULT_BOT_USERNAME, TG_CHANNEL, TG_GROUP } from '../site.js'

/**
 * Bonus karta (hamyon): mijozning bonus balansi.
 *
 * Balans — `users/{id}.walletBalance` (mijoz o'qiydi, yoza OLMAYDI:
 * firestore.rules faqat ism/telefon/manzil/savatni ochadi). Buyurtmada
 * «Bonus kartadan ishlatish» yoqilsa server (api/orders.ts) balansdan
 * `perOrderMax` gacha ayiradi — buyurtma bilan bitta tranzaksiyada.
 * Buyurtma bekor bo'lsa — summa qaytadi (refundWallet, bir marta).
 *
 * Admin: hammaga yoki bitta mijozga summa tashlaydi (wallet_grants, wallet_tx).
 * Yangi mijoz ilovani birinchi ochganda `welcomeAmount` oladi (api/auth.ts).
 *
 * Shartlar (Abubakr, 2026-11-07): bonus tushgandan `validDays` (30) kun amal
 * qiladi (`users.walletExpiresAt`), faqat `minOrder` (200 000) dan katta
 * buyurtmada ishlatiladi. Muddati o'tgan qoldiq keyingi tashlashda qo'shilmaydi.
 *
 * «Tasdiqlab olish» (Abubakr, 2026-11-09): har mijoz `claimAmount` (50 000) ni
 * bir marta o'zi oladi — Telegram kanal va guruhga obuna bo'lgach (bot
 * getChatMember bilan tekshiradi). Instagram tekshirib bo'lmaydi — faqat havola.
 * Olgan — `users.walletClaimedAt`.
 * Bitta mijozga (sinov yoki alohida taklif): admin `users.walletOffer` qo'yadi —
 * umumiy summa 0 bo'lsa ham shu mijozga qulf karta chiqadi (walletOffer).
 */

export type WalletSettings = {
  enabled: boolean; perOrderMax: number; welcomeAmount: number; minOrder: number; validDays: number
  /** «Tasdiqlab olish» summasi (0 — o'chiq, standart; admin e'lon paytida yoqadi). */
  claimAmount: number
  /** Shartlardagi Instagram sahifa (bo'sh — qadam ko'rinmaydi). */
  instagramUrl: string
}
export const WALLET_DEFAULTS: WalletSettings = { enabled: true, perOrderMax: 15000, welcomeAmount: 0, minOrder: 200000, validDays: 30, claimAmount: 0, instagramUrl: '' }

/** Obuna tekshiriladigan joylar (bot ikkalasida ham admin). */
export const CLAIM_CHATS = [
  { key: 'channel', chat: `@${TG_CHANNEL}`, url: `https://t.me/${TG_CHANNEL}` },
  { key: 'group', chat: `@${TG_GROUP}`, url: `https://t.me/${TG_GROUP}` },
] as const
const INSTAGRAM_RE = /^https:\/\/(www\.)?instagram\.com\/[\w.\-/?=&%]{1,200}$/
const DAY_MS = 24 * 60 * 60 * 1000
const MAX_AMOUNT = 10_000_000

const money = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n >= 0 && n <= MAX_AMOUNT ? n : fallback
}

export function readWalletSettings(data: FirebaseFirestore.DocumentData | undefined): WalletSettings {
  return {
    enabled: data?.enabled !== false,
    perOrderMax: money(data?.perOrderMax, WALLET_DEFAULTS.perOrderMax),
    welcomeAmount: money(data?.welcomeAmount, WALLET_DEFAULTS.welcomeAmount),
    minOrder: money(data?.minOrder, WALLET_DEFAULTS.minOrder),
    validDays: Math.min(366, Math.max(1, Math.round(Number(data?.validDays)) || WALLET_DEFAULTS.validDays)),
    claimAmount: money(data?.claimAmount, WALLET_DEFAULTS.claimAmount),
    instagramUrl: typeof data?.instagramUrl === 'string' && INSTAGRAM_RE.test(data.instagramUrl) ? data.instagramUrl : '',
  }
}

/** Bonus hali amal qiladimi (muddat yozilmagan bo'lsa — ha). */
export function walletLive(user: FirebaseFirestore.DocumentData | undefined, now = Date.now()): boolean {
  const expires = Date.parse(String(user?.walletExpiresAt ?? ''))
  return !Number.isFinite(expires) || expires > now
}

/** Yangi tushgan bonus muddati: hozirdan `validDays` kun. */
const expiryFrom = (settings: WalletSettings, now = Date.now()) => new Date(now + settings.validDays * DAY_MS).toISOString()

/** Amaldagi balans: muddati o'tgan bo'lsa — 0. */
const liveBalance = (user: FirebaseFirestore.DocumentData | undefined) =>
  walletLive(user) ? Number(user?.walletBalance) || 0 : 0

/** Bitta buyurtmada hamyondan ishlatiladigan summa. */
export function walletUse(balance: number, payable: number, settings: WalletSettings): number {
  if (!settings.enabled) return 0
  return Math.max(0, Math.floor(Math.min(Number(balance) || 0, settings.perOrderMax, Number(payable) || 0)))
}

const som = (n: number) => `${Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ')} so‘m`

/** Bekor qilingan buyurtma — ishlatilgan bonus qaytadi (bir marta). */
export async function refundWallet(orderId: string): Promise<number> {
  try {
    const db = await adminDb()
    return await db.runTransaction(async (tx) => {
      const ref = db.collection('orders').doc(orderId)
      const snap = await tx.get(ref)
      const order = snap.data()
      const used = Math.round(Number(order?.walletUsed) || 0)
      if (!order || used <= 0 || order.walletRefundedAt || !order.userId) return 0
      const userRef = db.collection('users').doc(String(order.userId))
      const user = await tx.get(userRef)
      const balance = (Number(user.data()?.walletBalance) || 0) + used
      const at = new Date().toISOString()
      tx.set(userRef, { walletBalance: balance }, { merge: true })
      tx.update(ref, { walletRefundedAt: at })
      tx.set(db.collection('wallet_tx').doc(), { userId: String(order.userId), amount: used, type: 'refund', orderId, at, balanceAfter: balance })
      return used
    })
  } catch (error) {
    console.error('[wallet] qaytarilmadi:', orderId, error)
    return 0
  }
}

/** Yangi mijoz — ilovani birinchi ochganda bonus (api/auth.ts). */
export async function welcomeWallet(uid: string): Promise<void> {
  try {
    const db = await adminDb()
    const settings = readWalletSettings((await db.collection('settings').doc('wallet').get()).data())
    const ref = db.collection('users').doc(uid)
    await db.runTransaction(async (tx) => {
      const user = (await tx.get(ref)).data() ?? {}
      if (user.walletInit) return
      const amount = settings.enabled ? settings.welcomeAmount : 0
      const balance = liveBalance(user) + amount
      tx.set(ref, { walletInit: true, ...(amount > 0 ? { walletBalance: balance, walletExpiresAt: expiryFrom(settings) } : {}) }, { merge: true })
      if (amount > 0) {
        tx.set(db.collection('wallet_tx').doc(), { userId: uid, amount, type: 'welcome', at: new Date().toISOString(), balanceAfter: balance })
      }
    })
  } catch (error) {
    console.error('[wallet] xush kelibsiz bonusi yozilmadi:', error)
  }
}

// ── Admin ────────────────────────────────────────────────────

export async function walletGet() {
  const db = await adminDb()
  const [settings, grants, txs] = await Promise.all([
    db.collection('settings').doc('wallet').get(),
    db.collection('wallet_grants').orderBy('at', 'desc').limit(20).get(),
    db.collection('wallet_tx').orderBy('at', 'desc').limit(40).get(),
  ])
  return {
    settings: readWalletSettings(settings.data()),
    grants: grants.docs.map((d) => ({ id: d.id, ...d.data() })),
    recent: txs.docs.map((d) => ({ id: d.id, ...d.data() })),
  }
}

export async function walletSave(actor: Staff, body: Record<string, unknown>) {
  const perOrderMax = money(body.perOrderMax, -1)
  const welcomeAmount = money(body.welcomeAmount, -1)
  if (perOrderMax < 1000) throw new Error('Bitta buyurtmaga kamida 1 000 so‘m bo‘lsin')
  if (welcomeAmount < 0) throw new Error('Yangi mijoz bonusi noto‘g‘ri')
  const minOrder = money(body.minOrder, -1)
  if (minOrder < 0) throw new Error('Minimal buyurtma summasi noto‘g‘ri')
  const validDays = Math.round(Number(body.validDays))
  if (!Number.isFinite(validDays) || validDays < 1 || validDays > 366) throw new Error('Amal qilish muddati 1–366 kun bo‘lsin')
  const claimAmount = money(body.claimAmount, -1)
  if (claimAmount < 0) throw new Error('«Tasdiqlab olish» summasi noto‘g‘ri')
  const instagramUrl = String(body.instagramUrl ?? '').trim()
  if (instagramUrl && !INSTAGRAM_RE.test(instagramUrl)) throw new Error('Instagram havolasi https://instagram.com/... ko‘rinishida bo‘lsin')
  const settings: WalletSettings = { enabled: body.enabled !== false, perOrderMax, welcomeAmount, minOrder, validDays, claimAmount, instagramUrl }
  const db = await adminDb()
  await db.collection('settings').doc('wallet').set({ ...settings, updatedAt: new Date().toISOString(), updatedBy: actor.name || actor.email })
  return { ok: true, settings }
}

/** Hammaga (kuryerlardan tashqari) summa tashlash. */
export async function walletGrantAll(actor: Staff, body: Record<string, unknown>) {
  const amount = money(body.amount, 0)
  if (amount < 1000) throw new Error('Summa kamida 1 000 so‘m bo‘lsin')
  const note = String(body.note ?? '').trim().slice(0, 200)
  const db = await adminDb()
  const { FieldValue } = await import('firebase-admin/firestore')
  const settings = readWalletSettings((await db.collection('settings').doc('wallet').get()).data())
  const at = new Date().toISOString()
  const walletExpiresAt = expiryFrom(settings)
  let count = 0
  let last: FirebaseFirestore.QueryDocumentSnapshot | null = null
  for (;;) {
    let q = db.collection('users').orderBy('__name__').limit(400)
    if (last) q = q.startAfter(last)
    const page = await q.get()
    if (page.empty) break
    const batch = db.batch()
    let n = 0
    for (const doc of page.docs) {
      if (doc.data()?.courier === true) continue
      // walletInit — keyin ilovani ochganda «yangi mijoz» bonusi ikkinchi marta tushmasin.
      // Muddati o'tgan qoldiq qo'shilmaydi — yangi summa noldan.
      const live = walletLive(doc.data())
      batch.set(doc.ref, {
        walletBalance: live ? FieldValue.increment(amount) : amount,
        walletExpiresAt,
        walletInit: true,
      }, { merge: true })
      n++
    }
    if (n) await batch.commit()
    count += n
    last = page.docs[page.docs.length - 1]
    if (page.size < 400) break
  }
  await db.collection('wallet_grants').add({ amount, note, count, by: actor.name || actor.email, at, expiresAt: walletExpiresAt })
  return { ok: true, count, amount, expiresAt: walletExpiresAt }
}

const NOTIFY: Record<Lang, (amount: string, balance: string, until: string) => string> = {
  uz: (a, b, u) => `💳 <b>Bonus kartangizga ${a} tushdi!</b>\n\nBalans: <b>${b}</b> · ${u} gacha amal qiladi\nBuyurtma berishda «Bonus kartadan ishlatish» ni yoqing 🛒`,
  ru: (a, b, u) => `💳 <b>На вашу бонусную карту зачислено ${a}!</b>\n\nБаланс: <b>${b}</b> · действует до ${u}\nПри заказе включите «Оплатить бонусами» 🛒`,
}
const day = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { timeZone: 'Asia/Tashkent' })

/** Bitta mijozni topish: Telegram ID yoki @username. */
async function findUser(raw: unknown) {
  const value = String(raw ?? '').trim().replace(/^@/, '')
  if (!value) throw new Error('Mijoz ID yoki @username kiriting')
  const db = await adminDb()
  if (/^\d{3,20}$/.test(value)) {
    const snap = await db.collection('users').doc(value).get()
    if (snap.exists) return snap
  }
  const byName = await db.collection('users').where('username', '==', value).limit(1).get()
  if (!byName.empty) return byName.docs[0]
  throw new Error('Mijoz topilmadi')
}

export async function walletLookup(body: Record<string, unknown>) {
  const snap = await findUser(body.user)
  const db = await adminDb()
  const u = snap.data() ?? {}
  const txs = await db.collection('wallet_tx').where('userId', '==', snap.id).get()
  return {
    id: snap.id,
    name: [u.first_name, u.last_name].filter(Boolean).join(' ') || (u.username ? `@${u.username}` : `ID ${snap.id}`),
    username: u.username ?? null,
    balance: Number(u.walletBalance) || 0,
    expiresAt: typeof u.walletExpiresAt === 'string' ? u.walletExpiresAt : null,
    expired: !walletLive(u),
    offer: money(u.walletOffer, 0),
    claimedAt: typeof u.walletClaimedAt === 'string' ? u.walletClaimedAt : null,
    history: txs.docs.map((d) => d.data()).sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 15),
  }
}

/** Bitta mijozga qo'shish (+) yoki ayirish (−). */
export async function walletGrant(actor: Staff, body: Record<string, unknown>) {
  const amount = Math.round(Number(body.amount))
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > MAX_AMOUNT) throw new Error('Summa noto‘g‘ri')
  const note = String(body.note ?? '').trim().slice(0, 200)
  const snap = await findUser(body.user)
  const db = await adminDb()
  const settings = readWalletSettings((await db.collection('settings').doc('wallet').get()).data())
  const at = new Date().toISOString()
  let expiresAt = ''
  const balance = await db.runTransaction(async (tx) => {
    const user = (await tx.get(snap.ref)).data() ?? {}
    const current = liveBalance(user)
    const next = current + amount
    if (next < 0) throw new Error(`Balansda faqat ${som(current)} bor`)
    // Qo'shilganda muddat yangilanadi (hozirdan validDays kun), ayirilganda — o'zgarmaydi
    expiresAt = amount > 0 ? expiryFrom(settings) : String(user.walletExpiresAt ?? '')
    tx.set(snap.ref, { walletBalance: next, walletInit: true, ...(amount > 0 ? { walletExpiresAt: expiresAt } : {}) }, { merge: true })
    tx.set(db.collection('wallet_tx').doc(), { userId: snap.id, amount, type: 'grant', note, by: actor.name || actor.email, at, balanceAfter: next })
    return next
  })
  let notified = false
  if (amount > 0 && body.notify !== false) {
    const lang = await userLang(snap.id)
    const res = await sendMessage(snap.id, NOTIFY[lang](escapeHtml(som(amount)), escapeHtml(som(balance)), day(expiresAt)))
    notified = res.ok
  }
  return { ok: true, id: snap.id, balance, notified }
}

// ── Mijoz: «Tasdiqlab olish» ─────────────────────────────────

type TgMember = { status: string; is_member?: boolean }

/** Kanal/guruh a'zosimi. Bot huquqi yetmasa (tekshirib bo'lmasa) — o'tkaziladi, jurnalga yoziladi. */
async function isMember(chat: string, userId: number): Promise<boolean> {
  const r = await telegramCall<TgMember>('getChatMember', { chat_id: chat, user_id: userId })
  if (r.ok) {
    const s = r.result.status
    return s === 'member' || s === 'administrator' || s === 'creator' || (s === 'restricted' && r.result.is_member === true)
  }
  if (/user not found|participant|USER_ID_INVALID/i.test(r.error)) return false
  console.warn('[wallet] a’zolik tekshirilmadi:', chat, r.error)
  return true
}

/**
 * Mijoz bonusni o'zi oladi (bir marta): kanal va guruh tekshiriladi,
 * keyin `claimAmount` tushadi va muddat `validDays` kun.
 * → { ok: true, amount, balance, expiresAt } | { ok: false, missing: ['channel'|'group'] }
 */
export async function walletClaim(uid: string) {
  if (!/^\d{3,20}$/.test(uid)) throw new Error('Foydalanuvchi aniqlanmadi')
  const db = await adminDb()
  const settings = readWalletSettings((await db.collection('settings').doc('wallet').get()).data())
  const ref = db.collection('users').doc(uid)
  const before = (await ref.get()).data()
  if (before?.walletClaimedAt) {
    return { ok: true as const, already: true, amount: 0, balance: liveBalance(before), expiresAt: String(before.walletExpiresAt ?? '') }
  }
  const amount = settings.claimAmount > 0 ? settings.claimAmount : money(before?.walletOffer, 0)
  if (!settings.enabled || amount <= 0 || before?.courier === true) return { ok: false as const, off: true, missing: [] as string[] }

  const checks = await Promise.all(CLAIM_CHATS.map(async (c) => ((await isMember(c.chat, Number(uid))) ? null : c.key)))
  const missing = checks.filter((k): k is (typeof CLAIM_CHATS)[number]['key'] => k !== null)
  if (missing.length) return { ok: false as const, missing }

  const at = new Date().toISOString()
  const expiresAt = expiryFrom(settings)
  const { FieldValue } = await import('firebase-admin/firestore')
  const result = await db.runTransaction(async (tx) => {
    const user = (await tx.get(ref)).data() ?? {}
    if (user.walletClaimedAt) return { already: true, balance: liveBalance(user), expiresAt: String(user.walletExpiresAt ?? '') }
    const balance = liveBalance(user) + amount
    tx.set(ref, { walletBalance: balance, walletExpiresAt: expiresAt, walletClaimedAt: at, walletInit: true, walletOffer: FieldValue.delete() }, { merge: true })
    tx.set(db.collection('wallet_tx').doc(), { userId: uid, amount, type: 'claim', at, balanceAfter: balance })
    return { already: false, balance, expiresAt }
  })
  return { ok: true as const, already: result.already, amount: result.already ? 0 : amount, balance: result.balance, expiresAt: result.expiresAt }
}

/** Xabardagi tugma: ilova profilda, «Tasdiqlab olish» oynasi ochiq (src/components/wallet/WalletCard.tsx). */
export const CLAIM_LINK = `https://t.me/${DEFAULT_BOT_USERNAME}?startapp=q${Buffer.from('page=profile&wallet=claim').toString('base64url')}`

const OFFER_TEXT: Record<Lang, (amount: string) => { text: string; button: string }> = {
  uz: (a) => ({
    text: `🎁 <b>Sizga ${a} sovg'a!</b>\n\nAqua Marin bonus kartangizga <b>${a}</b> tayyorlab qo'ydik. Olish juda oson: «✅ Tasdiqlab olish» tugmasini bosing, Telegram kanal va guruhimizga obuna bo'ling — pul darhol kartangizga tushadi!`,
    button: '✅ Tasdiqlab olish',
  }),
  ru: (a) => ({
    text: `🎁 <b>Вам подарок — ${a}!</b>\n\nМы подготовили <b>${a}</b> на вашу бонусную карту Aqua Marin. Получить просто: нажмите «✅ Получить», подпишитесь на наш Telegram-канал и группу — деньги сразу поступят на карту!`,
    button: '✅ Получить',
  }),
}

/**
 * Bitta mijozga «Tasdiqlab olish» taklifi (sinov yoki alohida sovg'a):
 * pul darhol tushmaydi — mijoz obuna bo'lib o'zi oladi. Oldin olgan bo'lsa,
 * qayta taklif qilinadi (admin qarori).
 */
export async function walletOffer(actor: Staff, body: Record<string, unknown>) {
  const amount = money(body.amount, 0)
  if (amount < 1000) throw new Error('Summa kamida 1 000 so‘m bo‘lsin')
  const snap = await findUser(body.user)
  if (snap.data()?.courier === true) throw new Error('Kuryerga bonus berilmaydi')
  const { FieldValue } = await import('firebase-admin/firestore')
  await snap.ref.set({ walletOffer: amount, walletClaimedAt: FieldValue.delete(), walletOfferBy: actor.name || actor.email, walletOfferAt: new Date().toISOString() }, { merge: true })
  let notified = false
  if (body.notify !== false) {
    const m = OFFER_TEXT[await userLang(snap.id)](escapeHtml(som(amount)))
    const res = await sendRows(snap.id, m.text, [[{ text: m.button, url: CLAIM_LINK }]])
    notified = res.ok
  }
  return { ok: true, id: snap.id, amount, notified }
}
