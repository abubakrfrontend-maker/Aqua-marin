/**
 * Otziv so'rovi: «Yetkazildi» dan keyin navbat, kunduzi yuborish, haftada bir marta.
 *   node --experimental-strip-types --no-warnings --import ./scripts/testing/register.mjs ./scripts/testing/reviews.test.ts
 */
export {}
const g = globalThis as any
const { queueReviewRequest, reviewDueAt, sendDueReviewRequests } = await import('../../api/_lib/actions/reviews.ts')

const failures: string[] = []
function check(name: string, cond: boolean, extra: unknown = '') {
  console.log((cond ? 'OK   ' : 'XATO ') + name + (cond ? '' : '  -> ' + JSON.stringify(extra).slice(0, 400)))
  if (!cond) failures.push(name)
}

// Vaqt: 3 soatdan keyin, tunda emas (Toshkent = UTC+5)
check('kunduzi: 12:00 → 15:00', reviewDueAt(Date.parse('2026-11-07T07:00:00Z')) === '2026-11-07T10:00:00.000Z')
check('kechqurun: 19:30 → ertaga 10:00', reviewDueAt(Date.parse('2026-11-07T14:30:00Z')) === '2026-11-08T05:00:00.000Z')
check('tunda: 02:00 → shu kuni 10:00', reviewDueAt(Date.parse('2026-11-06T21:00:00Z')) === '2026-11-07T05:00:00.000Z')
check('erta tong: 06:00 → 10:00', reviewDueAt(Date.parse('2026-11-07T01:00:00Z')) === '2026-11-07T05:00:00.000Z')

g.__sent = []
g.__data = {
  'orders/o1': { status: 'Yetkazildi', userId: '101' },
  'orders/o2': { status: 'Yetkazildi', userId: '202' },
  'orders/o3': { status: 'Bekor qilingan', userId: '303' },
  'orders/o4': { status: 'Yetkazildi', userId: '101' },
  'users/101': { id: 101, language: 'uz' },
  'users/202': { id: 202, language: 'ru' },
  'users/303': { id: 303 },
}

await queueReviewRequest('o1', '101')
const firstDue = g.__data['review_requests/o1']?.dueAt
await queueReviewRequest('o1', '101')
check('navbatga qo‘yildi, qayta qo‘yilsa o‘zgarmaydi', g.__data['review_requests/o1']?.status === 'pending' && g.__data['review_requests/o1'].dueAt === firstDue)

let r = await sendDueReviewRequests()
check('vaqti kelmagan — yuborilmaydi', r.sent === 0 && g.__sent.length === 0, r)

// Vaqti keldi
const past = '2026-01-01T00:00:00.000Z'
g.__data['review_requests/o1'].dueAt = past
g.__data['review_requests/o2'] = { orderId: 'o2', userId: '202', dueAt: past, status: 'pending' }
g.__data['review_requests/o3'] = { orderId: 'o3', userId: '303', dueAt: past, status: 'pending' }
r = await sendDueReviewRequests()
const uz = g.__sent.find((m: any) => m.chatId === '101')
const ru = g.__sent.find((m: any) => m.chatId === '202')
check('2 ta yuborildi, bekor qilingan buyurtmaga yo‘q', r.sent === 2 && r.skipped === 1 && !g.__sent.some((m: any) => m.chatId === '303'), r)
check('o‘zbekcha matn + 2 tugma (botga yuborish, guruh)', uz?.text.includes('Aqua Marin’ni tanlaganingiz uchun rahmat') && uz.rows[0][0].callback_data === 'fb:o1' && uz.rows[1][0].url === 'https://t.me/aquamarin_group', uz)
check('ruscha foydalanuvchiga ruscha', ru?.text.includes('Спасибо, что выбрали Aqua Marin') && ru.rows[1][0].text === '💬 Перейти в группу', ru)
check('holat «sent», mijozda vaqt yozildi', g.__data['review_requests/o1'].status === 'sent' && !!g.__data['users/101'].reviewAskedAt)

// Shu hafta ikkinchi buyurtma — so'ralmaydi
g.__data['review_requests/o4'] = { orderId: 'o4', userId: '101', dueAt: past, status: 'pending' }
r = await sendDueReviewRequests()
check('haftada bir martadan ko‘p so‘ralmaydi', r.sent === 0 && g.__data['review_requests/o4'].status === 'skipped', r)

// O'chirish — deploysiz
g.__data['settings/reviews'] = { enabled: false }
r = await sendDueReviewRequests()
check('settings/reviews.enabled = false — o‘chiq', (r as any).off === true)

console.log(failures.length ? `\nXATOLAR: ${failures.length}` : '\nNATIJA: hammasi joyida')
process.exit(failures.length ? 1 : 0)
