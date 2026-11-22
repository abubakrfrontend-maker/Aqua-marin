/**
 * Bonus karta: buyurtmada ishlatish, bekor qilinsa qaytarish, admin tashlashi, yangi mijoz bonusi.
 *   node --experimental-strip-types --no-warnings --import ./scripts/testing/register.mjs ./scripts/testing/wallet.test.ts
 */
export {}
const g = globalThis as any
const { default: ordersHandler } = await import('../../api/orders.ts')
const { refundWallet, walletClaim, walletGrant, walletGrantAll, walletOffer, walletSave, walletUse, welcomeWallet, WALLET_DEFAULTS } = await import('../../api/_lib/actions/wallet.ts')

const failures: string[] = []
function check(name: string, cond: boolean, extra: unknown = '') {
  console.log((cond ? 'OK   ' : 'XATO ') + name + (cond ? '' : '  -> ' + JSON.stringify(extra).slice(0, 400)))
  if (!cond) failures.push(name)
}
const admin = { uid: 'a', email: 'a@aquamarin.uz', name: 'Ega', role: 'owner', active: true } as any

check('walletUse: 15 000 chegara', walletUse(50000, 60000, WALLET_DEFAULTS) === 15000)
check('walletUse: balans kam — balans', walletUse(5000, 60000, WALLET_DEFAULTS) === 5000)
check('walletUse: buyurtma kichik — buyurtma summasi', walletUse(50000, 9000, WALLET_DEFAULTS) === 9000)
check('walletUse: o‘chiq — 0', walletUse(50000, 60000, { ...WALLET_DEFAULTS, enabled: false }) === 0)

const ADDR = 'Toshkent, Chilonzor 5'
function seed(balance: number, price = 210000, extra: Record<string, unknown> = {}) {
  g.__sent = []
  g.__uid = '101'
  g.__data = {
    'users/101': { id: 101, first_name: 'Aziza', addresses: [{ id: 'a1', address: ADDR }], walletBalance: balance, walletInit: true, ...extra },
    'products/1': { id: 1, name: 'Chuchvara', price, active: true, category: 'muz' },
    'settings/delivery': { fee: 10000, freeFrom: 0, minOrder: 0 },
  }
}
async function order(useWallet: boolean) {
  const out: any = {}
  const res: any = {
    setHeader() { return res }, status(c: number) { out.status = c; return res },
    json(b: unknown) { out.body = b; return res }, end() { return res },
  }
  await ordersHandler({
    method: 'POST', headers: { authorization: 'Bearer x' },
    body: { items: [{ productId: 1, quantity: 1 }], customer: { name: 'Aziza', phone: '+998901234567', address: ADDR, comment: '', paymentMethod: 'Naqd' }, useWallet },
  } as any, res)
  return out
}
const orderDoc = () => Object.entries(g.__data).find(([k]) => /^orders\/[^/]+$/.test(k)) as [string, any] | undefined

// 1) Bonus bilan: 210 000 + 10 000 yetkazish − 15 000
seed(50000)
let r = await order(true)
let o = orderDoc()
check('buyurtma yaratildi, jami 205 000', r.status === 200 && r.body.total === 205000, r)
check('buyurtmada walletUsed 15 000', o?.[1].walletUsed === 15000 && o?.[1].total === 205000, o?.[1])
check('balans 50 000 → 35 000', g.__data['users/101'].walletBalance === 35000)
const tx = Object.entries(g.__data).find(([k, v]: any) => k.startsWith('wallet_tx/') && v.type === 'order') as any
check('jurnalga yozildi (−15 000)', tx?.[1].amount === -15000 && tx?.[1].orderId === o?.[0].split('/')[1], tx)

// 2) Bekor qilinsa — qaytadi, ikkinchi marta emas
const id = o![0].split('/')[1]
check('bekor — 15 000 qaytdi', (await refundWallet(id)) === 15000 && g.__data['users/101'].walletBalance === 50000)
check('qayta chaqirilsa ikki marta qaytmaydi', (await refundWallet(id)) === 0 && g.__data['users/101'].walletBalance === 50000)

// 3) Bonussiz — balansga tegmaydi
seed(50000)
r = await order(false)
check('bonussiz: jami 220 000, balans o‘zgarmadi', r.body.total === 220000 && g.__data['users/101'].walletBalance === 50000 && !orderDoc()?.[1].walletUsed, r)

// 4) Balans kam
seed(4000)
r = await order(true)
check('balans 4 000 — shuncha ishlatildi', r.body.total === 216000 && g.__data['users/101'].walletBalance === 0, r)

// 5) Admin o'chirgan
seed(50000)
g.__data['settings/wallet'] = { enabled: false }
r = await order(true)
check('o‘chiq — ishlatilmaydi', r.body.total === 220000 && g.__data['users/101'].walletBalance === 50000, r)

// 5b) 200 000 dan kichik buyurtma — bonus bilan bo'lmaydi, bonussiz bo'ladi
seed(50000, 150000)
r = await order(true)
check('150 000 + bonus — rad (WALLET_MIN 200 000)', r.status === 400 && r.body.code === 'WALLET_MIN' && r.body.params?.amount === 200000 && !orderDoc() && g.__data['users/101'].walletBalance === 50000, r)
r = await order(false)
check('150 000 bonussiz — qabul qilinadi', r.status === 200 && r.body.total === 160000, r)

// 5c) Muddati o'tgan — ishlatilmaydi (xatosiz)
seed(50000, 210000, { walletExpiresAt: '2026-01-01T00:00:00.000Z' })
r = await order(true)
check('muddati o‘tgan bonus ishlatilmaydi', r.status === 200 && r.body.total === 220000 && g.__data['users/101'].walletBalance === 50000, r)

// 6) Hammaga tashlash (kuryer — yo'q)
g.__data = {
  'users/1': { id: 1 },
  'users/2': { id: 2, walletBalance: 7000, walletExpiresAt: '2099-01-01T00:00:00.000Z' },
  'users/3': { id: 3, courier: true },
  'users/4': { id: 4, walletBalance: 35000, walletExpiresAt: '2026-01-01T00:00:00.000Z' },
}
const all = await walletGrantAll(admin, { amount: 50000, note: 'Aksiya' })
const in30 = Date.parse(g.__data['users/1'].walletExpiresAt) - Date.now()
check('muddat ~30 kun yozildi', in30 > 29.9 * 864e5 && in30 < 30.1 * 864e5, g.__data['users/1'].walletExpiresAt)
check('muddati o‘tgan qoldiq qo‘shilmadi (35 000 + 50 000 emas, 50 000)', g.__data['users/4'].walletBalance === 50000, g.__data['users/4'])
check('hammaga: 3 kishi (kuryersiz)', all.count === 3 && g.__data['users/1'].walletBalance === 50000 && g.__data['users/2'].walletBalance === 57000 && !g.__data['users/3'].walletBalance, all)
check('tashlanganlarga keyin «yangi mijoz» bonusi tushmaydi', g.__data['users/1'].walletInit === true)
check('tarixga yozildi', Object.keys(g.__data).some((k) => k.startsWith('wallet_grants/')))

// 7) Yangi mijoz bonusi
g.__data['settings/wallet'] = { enabled: true, perOrderMax: 15000, welcomeAmount: 50000 }
g.__data['users/9'] = { id: 9 }
await welcomeWallet('9')
await welcomeWallet('9')
check('yangi mijoz: bir marta 50 000, muddat bilan', g.__data['users/9'].walletBalance === 50000 && g.__data['users/9'].walletInit === true && !!g.__data['users/9'].walletExpiresAt)
await welcomeWallet('1')
check('eski (tashlangan) mijozga ikkinchi marta yo‘q', g.__data['users/1'].walletBalance === 50000)

// 8) Bitta mijozga
g.__sent = []
g.__data['users/2'].username = 'bobur'
const one = await walletGrant(admin, { user: '@bobur', amount: 10000, note: 'Sovg‘a' })
check('@username bo‘yicha +10 000 va xabar (muddat bilan)', one.balance === 67000 && one.notified && g.__sent.some((m: any) => m.chatId === '2' && m.text.includes('10 000') && m.text.includes('gacha amal qiladi')), g.__sent)
let threw = ''
try { await walletGrant(admin, { user: '@bobur', amount: -100000 }) } catch (e) { threw = (e as Error).message }
check('manfiyga tushmaydi', threw.includes('Balansda') && g.__data['users/2'].walletBalance === 67000, threw)
const minus = await walletGrant(admin, { user: '@bobur', amount: -7000 })
check('ayirish ishlaydi (xabarsiz)', minus.balance === 60000 && !minus.notified)

// 9) «Tasdiqlab olish»: kanal va guruh obunasi
const members: Record<string, Set<number>> = { '@aquamarin_uz': new Set([501, 502]), '@aquamarin_group': new Set([501]) }
g.__tgCall = (method: string, body: any) => {
  if (method !== 'getChatMember') return { ok: true, result: {} }
  if (body.chat_id === 'broken') return { ok: false, error: 'Bad Request: chat not found' }
  return { ok: true, result: { status: members[body.chat_id]?.has(body.user_id) ? 'member' : 'left' } }
}
g.__data['settings/wallet'] = { enabled: true, perOrderMax: 15000, minOrder: 200000, validDays: 30, claimAmount: 50000 }
g.__data['users/501'] = { id: 501 }
g.__data['users/502'] = { id: 502 }
let c: any = await walletClaim('502')
check('guruhga obuna emas — olmaydi, «group» yetishmaydi', !c.ok && c.missing.join() === 'group' && !g.__data['users/502'].walletBalance, c)
g.__data['users/503'] = { id: 503 }
c = await walletClaim('503')
check('hech qayerga obuna emas — ikkalasi', !c.ok && c.missing.join() === 'channel,group', c)
c = await walletClaim('501')
const until = Date.parse(g.__data['users/501'].walletExpiresAt) - Date.now()
check('obuna — 50 000 tushdi, muddat 30 kun, belgi qo‘yildi', c.ok && c.amount === 50000 && g.__data['users/501'].walletBalance === 50000 && !!g.__data['users/501'].walletClaimedAt && until > 29.9 * 864e5, c)
check('tarixda «claim»', Object.values(g.__data).some((v: any) => v?.type === 'claim' && v.userId === '501' && v.amount === 50000))
c = await walletClaim('501')
check('ikkinchi marta tushmaydi', c.ok && c.already && g.__data['users/501'].walletBalance === 50000, c)
members['@aquamarin_group'].add(502)
c = await walletClaim('502')
check('obuna bo‘lgach — oladi', c.ok && g.__data['users/502'].walletBalance === 50000)
g.__data['users/504'] = { id: 504, courier: true }
c = await walletClaim('504')
check('kuryer olmaydi', !c.ok && !g.__data['users/504'].walletBalance)
g.__data['settings/wallet'].claimAmount = 0
g.__data['users/505'] = { id: 505 }
c = await walletClaim('505')
check('summa 0 — taklif o‘chiq', !c.ok && c.off === true)
await walletSave(admin, { perOrderMax: 15000, welcomeAmount: 0, minOrder: 200000, validDays: 30, claimAmount: 50000, instagramUrl: 'https://instagram.com/aquamarin' })
check('admin: summa va Instagram saqlandi', g.__data['settings/wallet'].claimAmount === 50000 && g.__data['settings/wallet'].instagramUrl === 'https://instagram.com/aquamarin')
threw = ''
try { await walletSave(admin, { perOrderMax: 15000, welcomeAmount: 0, minOrder: 0, validDays: 30, claimAmount: 50000, instagramUrl: 'javascript:alert(1)' }) } catch (e) { threw = (e as Error).message }
check('noto‘g‘ri Instagram havolasi saqlanmaydi', threw.includes('Instagram'), threw)
// 10) Bitta mijozga taklif (umumiy summa 0)
g.__data['settings/wallet'].claimAmount = 0
g.__data['users/601'] = { id: 601, username: 'sinov', language: 'uz' }
members['@aquamarin_uz'].add(601); members['@aquamarin_group'].add(601)
g.__sent = []
const off: any = await walletOffer(admin, { user: '@sinov', amount: 50000 })
check('taklif: pul darhol tushmaydi, walletOffer qo‘yildi, tugmali xabar', off.ok && !g.__data['users/601'].walletBalance && g.__data['users/601'].walletOffer === 50000 && g.__sent.some((m: any) => m.chatId === '601' && JSON.stringify(m.rows).includes('startapp=q')), g.__sent)
c = await walletClaim('601')
check('taklif bo‘yicha oladi (umumiy 0 bo‘lsa ham), taklif o‘chadi', c.ok && c.amount === 50000 && g.__data['users/601'].walletBalance === 50000 && g.__data['users/601'].walletOffer === undefined, g.__data['users/601'])
c = await walletClaim('601')
check('taklifni ikkinchi marta olmaydi', c.ok && c.already && g.__data['users/601'].walletBalance === 50000)
c = await walletClaim('505')
check('taklifsiz mijoz — o‘chiq', !c.ok && c.off === true)
delete g.__tgCall

console.log(failures.length ? `\nXATOLAR: ${failures.length}` : '\nNATIJA: hammasi joyida')
process.exit(failures.length ? 1 : 0)
