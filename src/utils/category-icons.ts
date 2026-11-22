import type { ComponentType, SVGProps } from 'react'
import {
  Beef, Cake, Carrot, CookingPot, Drumstick, Egg,
  Fish, Grid2X2, Ham, IceCreamBowl, IceCreamCone, Milk, Package, Pizza,
  Popsicle, Salad, Sandwich, Snowflake, Soup, Vegan, Wheat,
  Bath, BrushCleaning, Droplets, Shirt, SoapDispenserDroplet, Sparkles, SprayCan, WashingMachine,
} from 'lucide-react'
import { CurdBarIcon, DumplingIcon, SamsaIcon } from '../components/icons/FoodIcons'

/**
 * Ikonka komponenti.
 *
 * `LucideIcon` emas: ro'yxatda o'zimiz chizgan ikonkalar ham bor
 * (chuchvara, sirok, somsa) — lucide'da ular yo'q edi.
 */
export type CategoryIconType = ComponentType<SVGProps<SVGSVGElement> & { size?: number | string }>

/**
 * Kategoriya ikonkasi.
 *
 * Avval bazadagi `icon` maydoniga qaraydi (admin tanlagan), topilmasa
 * nom bo'yicha taxmin qiladi, u ham bo'lmasa umumiy qozon ishlatiladi.
 * Ilgari faqat oldindan yozilgan nomlar bilan solishtirilardi, shuning
 * uchun har qanday yangi kategoriya doim quti bo'lib qolardi (F-17).
 *
 * Ro'yxat Aqua Marin assortimentiga moslangan: yarim tayyor mahsulotlar
 * (chuchvara, manti, somsa, kotlet, naggets), muzqaymoq va siroklar.
 */
const BY_KEY: Record<string, CategoryIconType> = {
  all: Grid2X2,
  // Aqua Marin — maishiy kimyo
  kir: WashingMachine,
  laundry: WashingMachine,
  idish: Droplets,
  dishes: Droplets,
  tozalash: SprayCan,
  cleaning: SprayCan,
  pol: BrushCleaning,
  floor: BrushCleaning,
  santexnika: Bath,
  bath: Bath,
  sovun: SoapDispenserDroplet,
  soap: SoapDispenserDroplet,
  kiyim: Shirt,
  oyna: Sparkles,
  glass: Sparkles,

  // Xamirli mahsulotlar
  dumpling: DumplingIcon,
  chuchvara: DumplingIcon,
  pelmeni: DumplingIcon,
  manti: DumplingIcon,
  somsa: SamsaIcon,
  samsa: SamsaIcon,
  hanum: CookingPot,
  xamir: Wheat,
  dough: Wheat,
  lagmon: Soup,
  ugra: Wheat,

  // Go'shtli mahsulotlar
  meat: Beef,
  gosht: Beef,
  beef: Beef,
  mol: Beef,
  chicken: Drumstick,
  tovuq: Drumstick,
  nugget: Drumstick,
  kotlet: Ham,
  cutlet: Ham,
  lulya: Ham,
  kabob: Ham,
  sausage: Ham,
  hotdog: Sandwich,
  burger: Sandwich,
  pizza: Pizza,

  // Muzqaymoq va sut shirinliklari
  muzqaymoq: IceCreamCone,
  morojniy: IceCreamCone,
  plombir: IceCreamCone,
  eskimo: Popsicle,
  popsicle: Popsicle,
  rojok: IceCreamCone,
  vedro: IceCreamBowl,
  sirok: CurdBarIcon,
  syrok: CurdBarIcon,
  glazur: CurdBarIcon,
  tvorog: Milk,
  sut: Milk,
  dairy: Milk,
  milk: Milk,

  // Boshqa
  fish: Fish,
  baliq: Fish,
  egg: Egg,
  tuxum: Egg,
  vegetable: Carrot,
  sabzavot: Carrot,
  salad: Salad,
  vegan: Vegan,
  dessert: Cake,
  shirinlik: Cake,
  frozen: Snowflake,
  muzlatilgan: Snowflake,
  set: Package,
  box: Package,
}

const BY_NAME: [RegExp, CategoryIconType][] = [
  [/kir|kukun|stirk|стир|порош/i, WashingMachine],
  [/idish|посуд/i, Droplets],
  [/pol|пол\b|швабр/i, BrushCleaning],
  [/santex|vanna|unitaz|сантех|ванн|унитаз/i, Bath],
  [/sovun|suyuq sovun|мыл/i, SoapDispenserDroplet],
  [/oyna|shisha|стекл|зеркал/i, Sparkles],
  [/tozala|уборк|чист/i, SprayCan],
  [/chuchvara|pelmen|dumpling|пельмен|чучвар/i, DumplingIcon],
  [/manti|hanum|xonim|мант|ханум/i, DumplingIcon],
  [/somsa|samsa|самс/i, SamsaIcon],
  [/lagʻmon|lagmon|ugra|лагман/i, Soup],
  [/xamir|dough|тест/i, Wheat],
  [/kotlet|lyulya|lʻulya|kabob|kolbasa|sosiska|котлет|люля|колбас|сосис/i, Ham],
  [/tovuq|nagget|nugget|chicken|товук|кур|наггет/i, Drumstick],
  [/goʻsht|gosht|mol|qoʻy|beef|meat|мяс|говяд/i, Beef],
  [/baliq|fish|рыб/i, Fish],
  [/burger|sendvich|hot ?dog|бургер|сэндвич/i, Sandwich],
  [/pitsa|pizza|пицц/i, Pizza],
  [/tuxum|egg|яйц/i, Egg],
  [/sabzavot|vegetable|овощ/i, Carrot],
  [/salat|salad|салат/i, Salad],
  [/sirok|syrok|glazur|tvorog|сырок|сырк|творож|глазир/i, CurdBarIcon],
  [/eskimo|muzli tayoq|эскимо/i, Popsicle],
  [/muzqaymoq|plombir|morojen|rojok|морожен|пломбир|рожок/i, IceCreamCone],
  [/sut|dairy|молоч|молоко/i, Milk],
  [/shirinlik|dessert|tort|десерт|торт/i, Cake],
  [/muzlatilgan|frozen|заморож/i, Snowflake],
  [/toʻplam|set|combo|набор/i, Package],
  [/yarim tayyor|полуфабрикат/i, DumplingIcon],
  [/barcha|hamma|все|all/i, Grid2X2],
]

/**
 * Bot yangi kategoriyaga doim "package" yozadi — bu "tanlanmagan" degani.
 * Shuning uchun uni e'tiborsiz qoldirib, nom bo'yicha aniqlashga o'tamiz.
 */
const UNSET_ICONS = new Set(['', 'package', 'Package'])

export function categoryIcon(icon?: string, name?: string): CategoryIconType {
  if (icon && !UNSET_ICONS.has(icon.trim())) {
    const found = BY_KEY[icon.toLowerCase().trim()]
    if (found) return found
  }
  if (name) {
    for (const [pattern, Icon] of BY_NAME) {
      if (pattern.test(name)) return Icon
    }
  }
  return CookingPot
}
