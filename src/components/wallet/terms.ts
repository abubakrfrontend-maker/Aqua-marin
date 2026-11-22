/** Bonus karta muddati: kartada qisqa (07.12.26), matnda to'liq (07.12.2026). */
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' })
export const fullDate = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')
/** Muddati o'tganmi (yozilmagan bo'lsa — yo'q). */
export const walletExpired = (iso?: string) => Boolean(iso) && Date.parse(iso!) <= Date.now()
