/**
 * O'zbek lotin yozuvini kirill yozuviga o'giradi (Ўзбекча tili uchun).
 *
 * Kirillcha lug'at alohida yozilmaydi — o'zbekcha (lotin) lug'atdan shu
 * funksiya bilan yasaladi, shuning uchun yangi matn qo'shilganda faqat
 * uz.ts ga yoziladi.
 *
 * Tegilmaydigan qismlar: {count} kabi o'rin egallovchilar, HTML teglari,
 * havolalar, @username, brend va xizmat nomlari (Aqua Marin, Telegram...).
 */

const PROTECTED = /(\{\w+\}|<[^>]+>|https?:\/\/\S+|@\w+|\bt\.me\/\S+|aqua marin|telegram|click|payme|uzum|paylov|linko|excel|google|yandex|wi-?fi|sms|pdf|qr|id\b)/gi

const APOS = "'ʼʻ‘’`"
const VOWELS = 'aeiouAEIOU'

const SINGLE: Record<string, string> = {
  a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м',
  n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з',
  c: 'с', w: 'в',
}

const isUpper = (ch: string) => ch !== ch.toLowerCase()
const isLetter = (ch: string | undefined) => !!ch && /[a-zA-Z]/.test(ch)

/** Manba harf(lar)ining katta-kichikligini natijaga ko'chiradi. */
function withCase(src: string, out: string): string {
  if (!isUpper(src[0])) return out
  // «SH» yoki «Sh» — ikkalasida ham bitta bosh harf
  return out.toUpperCase()
}

function convertPlain(text: string): string {
  let res = ''
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    const lo = ch.toLowerCase()
    const next = text[i + 1]
    const nextLo = next?.toLowerCase()
    const prev = text[i - 1]

    // o' → ў, g' → ғ
    if ((lo === 'o' || lo === 'g') && next && APOS.includes(next)) {
      res += withCase(ch, lo === 'o' ? 'ў' : 'ғ')
      i += 1
      continue
    }
    // sh → ш, ch → ч
    if ((lo === 's' || lo === 'c') && nextLo === 'h') {
      res += withCase(ch, lo === 's' ? 'ш' : 'ч')
      i += 1
      continue
    }
    // yo → ё, yu → ю, ya → я, ye → е (yo' — bu «й» + «ў»)
    if (lo === 'y' && nextLo && 'ouae'.includes(nextLo) && !(nextLo === 'o' && APOS.includes(text[i + 2] ?? ''))) {
      const map: Record<string, string> = { o: 'ё', u: 'ю', a: 'я', e: 'е' }
      res += withCase(ch, map[nextLo])
      i += 1
      continue
    }
    // e — so'z boshida yoki unlidan keyin «э», aks holda «е»
    if (lo === 'e') {
      res += withCase(ch, !isLetter(prev) || VOWELS.includes(prev!) ? 'э' : 'е')
      continue
    }
    // Tutuq belgisi (masalan ta'lim) → ъ
    if (APOS.includes(ch) && isLetter(prev) && isLetter(next)) {
      res += 'ъ'
      continue
    }
    const mapped = SINGLE[lo]
    res += mapped ? withCase(ch, mapped) : ch
  }
  return res
}

export function toCyrillic(text: string): string {
  let out = ''
  let last = 0
  for (const m of text.matchAll(PROTECTED)) {
    out += convertPlain(text.slice(last, m.index)) + m[0]
    last = m.index! + m[0].length
  }
  return out + convertPlain(text.slice(last))
}
