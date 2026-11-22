/**
 * Ommaviy xabar: `{uid}` li tugma har mijozga o'z ID si bilan (konkurs taklifi).
 *   node --experimental-strip-types --no-warnings --import ./scripts/testing/register.mjs ./scripts/testing/broadcast-uid.test.ts
 */
export {}
const g = globalThis as any
process.env.MINI_APP_URL = 'https://aquamarin.test'
const { broadcast } = await import('../../api/_lib/actions/people.ts')

const failures: string[] = []
function check(name: string, cond: boolean, extra: unknown = '') {
  console.log((cond ? 'OK   ' : 'XATO ') + name + (cond ? '' : '  -> ' + JSON.stringify(extra).slice(0, 400)))
  if (!cond) failures.push(name)
}

g.__sent = []
g.__data = {
  'users/111': { id: 111, language: 'uz' },
  'users/222': { id: 222, language: 'ru' },
}
const share = 'https://t.me/share/url?url=https%3A%2F%2Ft.me%2Faqua_marin_bot%3Fstart%3Dref_{uid}&text=Konkurs'
await broadcast({ uid: 'a', email: '', name: 'Ega', role: 'owner', active: true } as any, {
  text: 'Salom', textRu: 'Привет',
  buttons: [
    { text: '📤 Do‘stlarga ulashish', textRu: '📤 Поделиться', kind: 'url', url: share },
    { text: '🎁 Ochkolarim', kind: 'url', url: 'https://t.me/aqua_marin_bot?start=konkurs' },
  ],
  recipients: ['111', '222'],
  campaignId: 'abc123',
})
const rows = (id: number) => g.__sent.find((m: any) => m.chatId === '' + id || m.chatId === id)?.rows
const r1 = rows(111)
const r2 = rows(222)
check('111 ga o‘z havolasi', r1?.[0]?.[0]?.url.includes('ref_111') && !r1[0][0].url.includes('{uid}'), r1)
check('222 ga o‘z havolasi va ruscha yozuv', r2?.[0]?.[0]?.url.includes('ref_222') && r2[0][0].text.includes('Поделиться'), r2)
check('shaxsiy tugma kuzatuv sahifasidan o‘tmaydi', r1?.[0]?.[0]?.url.startsWith('https://t.me/share/url'))
check('t.me havola to‘g‘ridan-to‘g‘ri', r1?.[1]?.[0]?.url === 'https://t.me/aqua_marin_bot?start=konkurs', r1?.[1])

console.log('\nNATIJA:', failures.length ? `${failures.length} ta xato` : 'hammasi joyida')
process.exit(failures.length ? 1 : 0)
