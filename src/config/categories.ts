import type { Category } from '../types/domain'

/**
 * Aqua Marin ning asosiy yo'nalishlari.
 *
 * Bular Firestore'dan emas, shu yerdan keladi — bozorga chiqish
 * yo'nalishlari kamdan-kam o'zgaradi va katalog bo'sh bo'lganda ham
 * ko'rinib turishi kerak. Bot admin paneli orqali qo'shiladigan mayda
 * kategoriyalar (Kukunlar, Gellar, Oyna tozalagich...) esa bazadan keladi va
 * shularning yoniga qo'shiladi.
 *
 * ⚠️ `name` — mahsulotning Firestore'dagi `category` maydoni bilan
 * AYNAN mos bo'lishi shart. Bot admin panelida mahsulot qo'shganda
 * kategoriya nomi shu ro'yxatdan yozilsa, filtr ishlaydi. Nomni
 * o'zgartirsangiz, bazadagi mahsulotlarnikini ham o'zgartiring.
 */
export type MainLine = {
  name: string
  /** Ruscha nomi va chip uchun qisqa ruscha nomi. */
  nameRu?: string
  shortRu?: string
  /** category-icons.ts dagi kalit. */
  icon: string
  /** Karta foni — logotipdagi uch rangdan. */
  gradient: string
  /**
   * Foto — gradient o'rniga ko'rinadi. Rasmning nisbati karta bilan
   * bir xil bo'lsin, aks holda `cover` uni qirqadi: keng karta 2.2:1
   * (1320x600), yarim kartalar 1.27:1 (990x780).
   */
  image?: string
  /**
   * Katalogdagi chip uchun qisqa nom. `name` filtr kaliti bo'lgani uchun
   * o'zgarmaydi — bu faqat ko'rinish: uzun nom chipni cho'zib yuborardi.
   */
  short?: string
  /** Keng karta (butun qator, 2.2:1) — birinchisi doim keng. */
  wide?: boolean
}

// TODO(AQUA): yo'nalishlar va ularning rasmlari mijoz bilan tasdiqlanadi.
// Hozircha rasmsiz — karta gradient bilan ko'rinadi.
export const MAIN_LINES: MainLine[] = [
  {
    name: 'Kir yuvish vositalari',
    short: 'Kir yuvish',
    nameRu: 'Средства для стирки',
    shortRu: 'Стирка',
    icon: 'kir',
    gradient: 'linear-gradient(135deg, #2a6fb0 0%, #12385f 100%)',
  },
  {
    name: 'Idish yuvish vositalari',
    short: 'Idish yuvish',
    nameRu: 'Средства для мытья посуды',
    shortRu: 'Посуда',
    icon: 'idish',
    gradient: 'linear-gradient(135deg, #1fc8d8 0%, #0b6f7d 100%)',
  },
  {
    name: 'Uy tozalash vositalari',
    short: 'Uy tozalash',
    nameRu: 'Средства для уборки',
    shortRu: 'Уборка',
    icon: 'tozalash',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #1e3a8a 100%)',
  },
  {
    // Admin «Set qo'shish» shu kategoriyaga qo'yadi (ProductsPage → SET_CATEGORY)
    name: 'Setlar',
    nameRu: 'Наборы',
    icon: 'set',
    gradient: 'linear-gradient(135deg, #1b4f82 0%, #22b8d0 100%)',
    wide: true,
  },
]

const MAIN_NAMES = new Set(MAIN_LINES.map((line) => line.name.toLowerCase()))

/** Chipda ko'rsatiladigan nom — yo'nalishning qisqa nomi bo'lsa o'sha. */
export function shortCategoryName(name: string): string {
  const line = MAIN_LINES.find((l) => l.name.toLowerCase() === name.trim().toLowerCase())
  return line?.short ?? name
}

/**
 * Ekranda ko'rinadigan kategoriya nomi.
 *
 * `name` — filtr kaliti (mahsulotdagi `category` bilan bir xil), shuning
 * uchun u hech qachon tarjima qilinmaydi. Bu funksiya faqat KO'RINISHNI
 * beradi: ruscha tilda tarjima bo'lsa o'sha, bo'lmasa o'zbekchasi.
 */
export function categoryLabel(
  category: { name: string; nameRu?: string },
  lang: string,
): string {
  const line = MAIN_LINES.find(
    (l) => l.name.toLowerCase() === category.name.trim().toLowerCase(),
  )
  if (lang === 'ru') {
    return category.nameRu || line?.shortRu || line?.nameRu || line?.short || category.name
  }
  return line?.short ?? category.name
}

/** Bo'lim sarlavhasi — kategoriyadagi kabi. */
export function sectionLabel(section: { name: string; nameRu?: string }, lang: string): string {
  return lang === 'ru' ? section.nameRu || section.name : section.name
}

/** Yo'nalish nomimi? Bosh sahifadagi lentada takrorlanmasligi uchun. */
export function isMainLine(name: string): boolean {
  return MAIN_NAMES.has(name.trim().toLowerCase())
}

/**
 * Yo'nalishlarni bazadagi kategoriyalar bilan birlashtiradi.
 *
 * Yo'nalishlar oldinda turadi; bazada shu nomli kategoriya bo'lsa
 * ikki marta chiqmaydi. Identifikatorlar manfiy — bazadagi musbat
 * id'lar bilan to'qnashmaydi.
 */
export function withMainLines(dbCategories: Category[]): Category[] {
  const byName = new Map(dbCategories.map((c) => [c.name.trim().toLowerCase(), c]))
  const lines: Category[] = MAIN_LINES.map((line, index) => ({
    id: -100 - index,
    name: line.name,
    // Bazadagi nusxada tarjima bo'lsa o'sha, bo'lmasa shu yerdagisi
    nameRu: byName.get(line.name.toLowerCase())?.nameRu || line.nameRu,
    icon: line.icon,
    // Bazadagi nusxaning tartibi — admin panelda belgilangani
    order: byName.get(line.name.toLowerCase())?.order,
  }))
  const all = [...lines, ...dbCategories.filter((c) => !isMainLine(c.name))]

  /*
   * Admin tartibi bo'yicha. Tartib belgilanmaganlar joyida qoladi:
   * yo'nalishlar oldinda, qolganlari keyin (stable sort).
   */
  return all
    .map((category, index) => ({ category, index }))
    .sort(
      (a, b) =>
        (a.category.order ?? 1e9 + a.index) - (b.category.order ?? 1e9 + b.index),
    )
    .map(({ category }) => category)
}
