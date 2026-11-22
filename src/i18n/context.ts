import { createContext } from 'react'
import { uz, type TranslationKey } from './uz'
import { ru } from './ru'
import { toCyrillic } from './cyrillic'
import { getTelegram } from '../utils/telegram'

/** uzc — o'zbekcha, kirill yozuvi (lug'ati uz dan avtomatik o'giriladi). */
export type Language = 'uz' | 'uzc' | 'ru'

export const LANGUAGES: { code: Language; label: TranslationKey; native: string }[] = [
  { code: 'uz', label: 'language.uz', native: "O'zbekcha" },
  { code: 'uzc', label: 'language.uzc', native: 'Ўзбекча' },
  { code: 'ru', label: 'language.ru', native: 'Русский' },
]

const uzc = Object.fromEntries(
  Object.entries(uz).map(([key, value]) => [key, toCyrillic(value)]),
) as Record<TranslationKey, string>

export const DICTIONARIES: Record<Language, Record<TranslationKey, string>> = { uz, uzc, ru }

/** Server, bot va formatlash funksiyalari faqat uz/ru ni biladi — kirill ham «uz». */
export const baseLang = (lang: Language): 'uz' | 'ru' => (lang === 'ru' ? 'ru' : 'uz')

/** <html lang> uchun BCP-47 kodi. */
export const HTML_LANG: Record<Language, string> = { uz: 'uz', uzc: 'uz-Cyrl', ru: 'ru' }

/** Til hali tanlanganmi (yangi foydalanuvchi — yo'q). */
export function hasChosenLanguage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return true
  }
}

export const STORAGE_KEY = 'aquaShopLang'

/**
 * Profildan (serverdan) oxirgi marta qo'llangan til.
 *
 * Mijoz tilni botda ham tanlashi mumkin - o'sha qiymat `users/<id>.language`
 * ga yoziladi. Bu kalit "shu qiymatni allaqachon qo'lladik" degan belgi:
 * botdagi yangi tanlov ilovaga ham o'tadi, ilovaning o'zida qilingan tanlov
 * esa har ochilishda qayta yozilib ketmaydi.
 */
export const SERVER_LANG_KEY = 'aquaShopLangSynced'

/** Telegram tilidan boshlang'ich tanlov: ruscha bo'lsa ru, aks holda uz. */
export function detectLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'uz' || saved === 'uzc' || saved === 'ru') return saved
  } catch {
    // localStorage yopiq bo'lishi mumkin
  }

  const code = getTelegram()?.initDataUnsafe?.user?.language_code
  if (code && code.toLowerCase().startsWith('ru')) return 'ru'
  return 'uz'
}

/** {count} kabi o'rin egallovchilarni almashtiradi. */
export function interpolate(template: string, values?: Record<string, string | number>): string {
  if (!values) return template
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in values ? String(values[key]) : match,
  )
}

export type I18nValue = {
  lang: Language
  setLang: (lang: Language) => void
  t: (key: TranslationKey, values?: Record<string, string | number>) => string
}

export const I18nContext = createContext<I18nValue | null>(null)
