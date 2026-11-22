/** Faqat dev: `?walletDemo` — serversiz 50 000 so'mlik bonus karta (ko'rinishni tekshirish uchun). */
export const WALLET_DEMO_BALANCE =
  import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).has('walletDemo') ? 50000 : undefined
/** `?walletDemo=claim` — hali olinmagan (qulf) karta. */
export const WALLET_DEMO_LOCKED =
  import.meta.env.DEV && typeof location !== 'undefined' && new URLSearchParams(location.search).get('walletDemo') === 'claim'
/** Namunaviy muddat — hozirdan 30 kun (modul yuklanganda bir marta). */
export const WALLET_DEMO_EXPIRES = WALLET_DEMO_BALANCE ? new Date(Date.now() + 30 * 864e5).toISOString() : undefined
