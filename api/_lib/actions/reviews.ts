import { adminDb } from '../firebase-admin.js'
import { userLang, type Lang } from '../i18n.js'
import { sendRows } from '../telegram.js'
import { TG_GROUP } from '../site.js'

/**
 * Otziv so'rovi: buyurtma «Yetkazildi» bo'lgach mijozdan mahsulot rasmi va
 * fikrini guruhga qoldirishni yumshoq so'raymiz.
 *
 * Darhol emas — yetkazilganda mijozga holat va baho xabari allaqachon boradi.
 * So'rov navbatga qo'yiladi (`review_requests/{orderId}`) va DELAY dan keyin,
 * faqat kunduzi (Toshkent 10:00–21:00) har daqiqalik vazifa (runTasks) yuboradi.
 * Bir mijozga ko'pi bilan haftada bir marta.
 *
 * «📸 Rasm va fikr yuborish» tugmasi botda ishlaydi (bot/bot.py → fb:): bot
 * rasmni mijoz ismi va niki bilan guruhga joylaydi.
 * O'chirish: settings/reviews.enabled = false (deploysiz).
 */

const COLL = 'review_requests'
export const REVIEW_GROUP_URL = `https://t.me/${TG_GROUP}`
const DELAY_MS = 3 * 60 * 60 * 1000
const REPEAT_MS = 7 * 24 * 60 * 60 * 1000
const TZ_MS = 5 * 60 * 60 * 1000 // Toshkent, yozgi vaqt yo'q
const DAY_FROM = 10
const DAY_TO = 21

/** Yuborish vaqti: 3 soatdan keyin, tun bo'lsa — ertalab 10:00 (Toshkent). */
export function reviewDueAt(nowMs: number): string {
  const due = nowMs + DELAY_MS
  const local = new Date(due + TZ_MS)
  const hour = local.getUTCHours()
  if (hour >= DAY_FROM && hour < DAY_TO) return new Date(due).toISOString()
  const day = local.getUTCDate() + (hour >= DAY_TO ? 1 : 0)
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), day, DAY_FROM) - TZ_MS).toISOString()
}

const TEXT: Record<Lang, { text: string; send: string; group: string }> = {
  uz: {
    text:
      '❤️ <b>Aqua Marin’ni tanlaganingiz uchun rahmat!</b>\n\n' +
      'Agar buyurtmangiz sizga yoqqan bo‘lsa, mahsulot rasmini fikringiz bilan guruhimizga qoldirsangiz, biz uchun katta quvonch bo‘lardi 📸\n\n' +
      'Sizning fikrlaringiz asosida yangi aksiyalar va foydali setlar tayyorlaymiz. Ishonchingizni oqlash uchun doim harakatdamiz 🙏\n\n' +
      '<i>Rasmni shu yerga — botga yuborsangiz ham bo‘ladi, o‘zimiz guruhga joylaymiz.</i>',
    send: '📸 Rasm va fikr yuborish',
    group: '💬 Guruhga o‘tish',
  },
  ru: {
    text:
      '❤️ <b>Спасибо, что выбрали Aqua Marin!</b>\n\n' +
      'Если заказ вам понравился, будем очень рады, если вы поделитесь фото товара и своим отзывом в нашей группе 📸\n\n' +
      'По вашим отзывам мы готовим новые акции и выгодные наборы. Мы стараемся оправдать ваше доверие 🙏\n\n' +
      '<i>Фото можно отправить и прямо боту — мы сами опубликуем его в группе.</i>',
    send: '📸 Отправить фото и отзыв',
    group: '💬 Перейти в группу',
  },
}

/** «Yetkazildi» — otziv so'rovi navbatga (bir buyurtmaga bir marta). */
export async function queueReviewRequest(orderId: string, userId: string | number): Promise<void> {
  try {
    const db = await adminDb()
    await db.collection(COLL).doc(orderId).create({
      orderId,
      userId: String(userId),
      dueAt: reviewDueAt(Date.now()),
      status: 'pending',
      createdAt: new Date().toISOString(),
    })
  } catch {
    // Allaqachon navbatda (holat qayta «Yetkazildi» bo'ldi) — takrorlanmaydi
  }
}

/** Vaqti kelgan so'rovlarni yuboradi (runTasks — har daqiqada). */
export async function sendDueReviewRequests(limit = 25) {
  const db = await adminDb()
  const settings = (await db.collection('settings').doc('reviews').get()).data()
  if (settings?.enabled === false) return { off: true }

  const now = new Date().toISOString()
  // Faqat vaqti kelganlar o'qiladi; ishlangan yozuvdan dueAt olib tashlanadi —
  // har daqiqada butun navbat o'qilmasin (Firestore kunlik limiti)
  const { FieldValue } = await import('firebase-admin/firestore')
  const snap = await db.collection(COLL).where('dueAt', '<=', now).limit(limit * 2).get()
  const due = snap.docs.filter((d) => d.data().status === 'pending').slice(0, limit)
  for (const d of snap.docs) {
    if (d.data().status !== 'pending') await d.ref.update({ dueAt: FieldValue.delete() })
  }
  let sent = 0
  let skipped = 0
  let failed = 0
  for (const doc of due) {
    const { userId, orderId } = doc.data() as { userId: string; orderId: string }
    const [order, user] = await Promise.all([
      db.collection('orders').doc(orderId).get(),
      db.collection('users').doc(userId).get(),
    ])
    const last = Date.parse(String(user.data()?.reviewAskedAt ?? ''))
    const reason = !order.exists || order.data()?.status !== 'Yetkazildi'
      ? 'buyurtma yetkazilgan emas'
      : Number.isFinite(last) && Date.now() - last < REPEAT_MS
        ? 'shu hafta so‘ralgan'
        : ''
    if (reason) {
      await doc.ref.update({ status: 'skipped', reason, at: now, dueAt: FieldValue.delete() })
      skipped++
      continue
    }
    const t = TEXT[await userLang(userId)]
    const res = await sendRows(userId, t.text, [
      [{ text: t.send, callback_data: `fb:${orderId}` }],
      [{ text: t.group, url: REVIEW_GROUP_URL }],
    ])
    await doc.ref.update({ status: res.ok ? 'sent' : 'failed', at: now, error: res.ok ? null : res.error, dueAt: FieldValue.delete() })
    if (res.ok) {
      await db.collection('users').doc(userId).set({ reviewAskedAt: now }, { merge: true })
      sent++
    } else {
      failed++
    }
  }
  return { sent, skipped, failed }
}
