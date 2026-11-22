/**
 * Aqua Marin brend va kompaniya ma'lumotlari — bitta manba.
 *
 * Bot username, domen va aloqa raqamlari shu yerda turadi; ilovaning
 * qolgan qismi faqat shu konstantalarga murojaat qiladi. Bot tomonida
 * nusxasi: bot/config.py, API tomonida: api/_lib/site.ts.
 *
 * TODO(AQUA) belgisi bor qiymatlar — hali olinmagan, vaqtincha.
 */
export const BRAND = {
  name: 'Aqua Marin',
  legalName: 'Aqua Marin',
  tagline: 'Maishiy kimyo va uy tozalash vositalari',
  taglineRu: 'Бытовая химия и средства для уборки',

  /** Telegram bot — mini app shu bot ichida ochiladi. */
  botUsername: 'aqua_marin_bot',

  /** Bonus sharti va otzivlar uchun Telegram kanal / guruh (@ siz). TODO(AQUA) */
  channel: 'aquamarin_uz',
  group: 'aquamarin_group',

  /** Mijozlar xizmati — standart; amaldagisi admin panelda (src/config/contact.ts). TODO(AQUA) */
  phone: '',
  phoneHref: '',
  email: '',
  telegram: '',
  telegramHref: '',

  /** Ish vaqti va manzil — bot javoblarida ham ishlatiladi. TODO(AQUA) */
  city: "Toshkent, O'zbekiston",
  workHours: '09:00 — 20:00',
} as const

export const BOT_URL = `https://t.me/${BRAND.botUsername}`
