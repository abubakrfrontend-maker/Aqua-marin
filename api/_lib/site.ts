/**
 * Saytning asosiy manzili — env (MINI_APP_URL / ADMIN_PANEL_URL) bo'lmasa
 * shu ishlatiladi. 2026-11-11: Vercel to'xtadi, sayt Railway'ga ko'chdi.
 * Xosting yana almashsa — shu yerni va bot/config.py ni yangilang.
 */
// TODO(AQUA): haqiqiy domen (Vercel yoki Railway)
export const DEFAULT_SITE_URL = 'https://aqua-marin.vercel.app'

/** Bot username — env BOT_USERNAME bo'lmasa. Frontenddagi nusxasi: src/config/brand.ts. */
export const DEFAULT_BOT_USERNAME = 'aqua_marin_bot'
/** Telegram kanal va guruh (bonus sharti, otzivlar). TODO(AQUA) */
export const TG_CHANNEL = 'aquamarin_uz'
export const TG_GROUP = 'aquamarin_group'
