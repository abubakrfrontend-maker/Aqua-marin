import { CreditCard, Loader2, Search, Send, Settings2, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { formatPrice } from '../../data'
import { apiPost } from '../lib/api'
import { useToast } from '../components/Toast'
import { BRAND } from '../../config/brand'

/**
 * Bonus karta: mijozlar hisobiga summa tashlash va sozlamalar.
 * Hisob-kitob serverda (api/_lib/actions/wallet.ts); balans — users/{id}.walletBalance.
 */

type Settings = { enabled: boolean; perOrderMax: number; welcomeAmount: number; minOrder: number; validDays: number; claimAmount: number; instagramUrl: string }
type Grant = { id: string; amount: number; note?: string; count: number; by: string; at: string; expiresAt?: string }
type Tx = { userId: string; amount: number; type: 'order' | 'refund' | 'grant' | 'welcome' | 'claim'; orderId?: string; note?: string; by?: string; at: string; balanceAfter?: number }
type State = { settings: Settings; grants: Grant[]; recent: Tx[] }
type Found = { id: string; name: string; username: string | null; balance: number; expiresAt: string | null; expired: boolean; offer: number; claimedAt: string | null; history: Tx[] }

const TYPE: Record<Tx['type'], string> = {
  order: 'Buyurtmada ishlatildi',
  refund: 'Bekor — qaytdi',
  grant: 'Admin',
  welcome: 'Yangi mijoz bonusi',
  claim: 'Tasdiqlab oldi (obuna)',
}
const dayOf = (iso: string) => new Date(iso).toLocaleDateString('ru-RU')
const when = (iso: string) => new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
const sum = (v: string) => Math.round(Number(String(v).replace(/[^\d-]/g, '')) || 0)
const signed = (n: number) => `${n > 0 ? '+' : '−'} ${formatPrice(Math.abs(n))}`

export function WalletPage({ owner }: { owner: boolean }) {
  const { show, node: toast } = useToast()
  const [state, setState] = useState<State | null>(null)
  const [form, setForm] = useState<Settings | null>(null)
  const [busy, setBusy] = useState('')
  const [allAmount, setAllAmount] = useState('50000')
  const [allNote, setAllNote] = useState('')
  const [who, setWho] = useState('')
  const [found, setFound] = useState<Found | null>(null)
  const [oneAmount, setOneAmount] = useState('')
  const [oneNote, setOneNote] = useState('')
  const [notify, setNotify] = useState(true)

  const load = useCallback(() => {
    apiPost<State>('action', { action: 'wallet.get' })
      .then((s) => { setState(s); setForm((f) => f ?? s.settings) })
      .catch((e: unknown) => show(e instanceof Error ? e.message : 'Yuklanmadi', 'error'))
  }, [show])
  useEffect(() => { load() }, [load])

  const run = async <T,>(key: string, body: Record<string, unknown>): Promise<T | null> => {
    setBusy(key)
    try {
      return await apiPost<T>('action', body)
    } catch (e) {
      show(e instanceof Error ? e.message : 'Bajarilmadi', 'error')
      return null
    } finally {
      setBusy('')
    }
  }

  const lookup = async () => {
    const r = await run<Found>('lookup', { action: 'wallet.lookup', user: who })
    setFound(r)
  }

  if (!state || !form) {
    return <div className="adm-card flex items-center gap-2 p-6"><Loader2 size={18} className="animate-spin" /> Yuklanmoqda…</div>
  }

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        {/* Hammaga */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><Users size={17} /> Hammaning hisobiga tashlash</h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
            Botdagi barcha mijozlarning bonus kartasiga qo‘shiladi (kuryerlardan tashqari). Bonus {form.validDays} kun amal qiladi; muddati o‘tgan eski qoldiq qo‘shilmaydi. Mijozlarga xabar avtomatik ketmaydi — e’lonni alohida yuboring.
          </p>
          <fieldset disabled={!owner} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="adm-label">Summa (so‘m)<input className="adm-input mt-1" inputMode="numeric" value={allAmount} onChange={(e) => setAllAmount(e.target.value)} /></label>
            <label className="adm-label">Izoh (ixtiyoriy)<input className="adm-input mt-1" placeholder="Masalan: Noyabr aksiyasi" value={allNote} onChange={(e) => setAllNote(e.target.value)} /></label>
          </fieldset>
          <button
            className="adm-btn adm-btn--primary mt-3 w-full"
            disabled={!owner || !!busy || sum(allAmount) < 1000}
            onClick={async () => {
              const amount = sum(allAmount)
              if (!window.confirm(`Barcha mijozlarning bonus kartasiga ${formatPrice(amount)} tashlansinmi?\n${form.validDays} kun amal qiladi.\n\nBu amalni qaytarib bo‘lmaydi.`)) return
              const r = await run<{ count: number }>('all', { action: 'wallet.grantAll', amount, note: allNote })
              if (r) { show(`${r.count} ta mijozga ${formatPrice(amount)} tashlandi`); load() }
            }}
          >
            {busy === 'all' ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />} {formatPrice(sum(allAmount))} — hammaga tashlash
          </button>
          {state.grants.length > 0 && (
            <ul className="mt-4 grid gap-1.5 text-xs">
              {state.grants.map((g) => (
                <li key={g.id} className="flex justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                  <span><b>{formatPrice(g.amount)}</b> × {g.count} kishi{g.note ? ` · ${g.note}` : ''}{g.expiresAt ? ` · ${dayOf(g.expiresAt)} gacha` : ''}</span>
                  <span style={{ color: 'var(--muted)' }}>{when(g.at)} · {g.by}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Bitta mijozga */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><Search size={17} /> Bitta mijoz</h2>
          <div className="mt-3 flex gap-2">
            <input className="adm-input flex-1" placeholder="Telegram ID yoki @username" value={who} onChange={(e) => { setWho(e.target.value); setFound(null) }} onKeyDown={(e) => e.key === 'Enter' && void lookup()} />
            <button className="adm-btn adm-btn--ghost" disabled={!who.trim() || !!busy} onClick={() => void lookup()}>
              {busy === 'lookup' ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Topish
            </button>
          </div>
          {found && (
            <div className="mt-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
              <div className="flex items-center justify-between gap-2">
                <span><b>{found.name}</b> <span className="text-xs" style={{ color: 'var(--muted)' }}>{found.username ? `@${found.username}` : `ID ${found.id}`}</span></span>
                <span className="text-right"><b style={{ color: found.expired ? 'var(--danger)' : 'var(--brand)' }}>{formatPrice(found.balance)}</b>{found.expiresAt && <span className="block text-[11px]" style={{ color: found.expired ? 'var(--danger)' : 'var(--muted)' }}>{found.expired ? 'muddati tugagan' : `${dayOf(found.expiresAt)} gacha`}</span>}</span>
              </div>
              <fieldset disabled={!owner} className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="adm-label">Summa (ayirish uchun − bilan)<input className="adm-input mt-1" inputMode="numeric" placeholder="10000 yoki -5000" value={oneAmount} onChange={(e) => setOneAmount(e.target.value)} /></label>
                <label className="adm-label">Izoh<input className="adm-input mt-1" value={oneNote} onChange={(e) => setOneNote(e.target.value)} /></label>
              </fieldset>
              <label className="mt-2 flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} disabled={!owner} /> Mijozga botda xabar yuborish (qo‘shilganda)</label>
              <button
                className="adm-btn adm-btn--primary mt-3 w-full"
                disabled={!owner || !!busy || sum(oneAmount) === 0}
                onClick={async () => {
                  const amount = sum(oneAmount)
                  if (!window.confirm(`${found.name}: ${signed(amount)}?`)) return
                  const r = await run<{ balance: number; notified: boolean }>('one', { action: 'wallet.grant', user: found.id, amount, note: oneNote, notify })
                  if (r) {
                    show(`Yangi balans: ${formatPrice(r.balance)}${r.notified ? ' · xabar yuborildi' : ''}`)
                    setOneAmount(''); setOneNote('')
                    setFound(await run<Found>('lookup', { action: 'wallet.lookup', user: found.id }))
                    load()
                  }
                }}
              >
                {busy === 'one' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} {sum(oneAmount) ? signed(sum(oneAmount)) : 'Summa kiriting'}
              </button>
              {/* Shartli: pul darhol tushmaydi — mijoz kanal/guruhga obuna bo'lib o'zi oladi (sinov uchun ham) */}
              <button
                className="adm-btn adm-btn--ghost mt-2 w-full"
                disabled={!owner || !!busy || sum(oneAmount) < 1000}
                onClick={async () => {
                  const amount = sum(oneAmount)
                  if (!window.confirm(`${found.name}: ${formatPrice(amount)} «Tasdiqlab olish» orqali (obuna sharti bilan) yuborilsinmi?`)) return
                  const r = await run<{ notified: boolean }>('offer', { action: 'wallet.offer', user: found.id, amount, notify })
                  if (r) {
                    show(`Taklif qo‘yildi${r.notified ? ' · xabar yuborildi' : ''}`)
                    setOneAmount('')
                    setFound(await run<Found>('lookup', { action: 'wallet.lookup', user: found.id }))
                  }
                }}
              >
                {busy === 'offer' ? <Loader2 size={16} className="animate-spin" /> : <span aria-hidden="true">🎁</span>} Tasdiqlab olish orqali yuborish (obuna sharti bilan)
              </button>
              {(found.offer > 0 || found.claimedAt) && (
                <p className="mt-2 text-xs font-bold" style={{ color: 'var(--muted)' }}>
                  {found.offer > 0 ? `Kutilmoqda: ${formatPrice(found.offer)} — mijoz hali tasdiqlab olmagan` : `Tasdiqlab olgan: ${when(found.claimedAt!)}`}
                </p>
              )}
              {found.history.length > 0 && (
                <ul className="mt-3 grid gap-1 text-xs">
                  {found.history.map((t, i) => (
                    <li key={i} className="flex justify-between gap-2">
                      <span>{TYPE[t.type] ?? t.type}{t.note ? ` · ${t.note}` : ''}</span>
                      <span><b style={{ color: t.amount > 0 ? 'var(--brand)' : 'var(--danger)' }}>{signed(t.amount)}</b> <span style={{ color: 'var(--muted)' }}>{when(t.at)}</span></span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* Sozlamalar */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-extrabold"><Settings2 size={17} /> Sozlamalar</h2>
          <fieldset disabled={!owner} className="mt-3 grid gap-3">
            <label className="flex items-center gap-2 text-sm font-bold">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Bonus karta yoqilgan (ilovada ko‘rinadi va ishlatiladi)
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="adm-label">Bitta buyurtmaga ko‘pi bilan (so‘m)<input className="adm-input mt-1" inputMode="numeric" value={form.perOrderMax} onChange={(e) => setForm({ ...form, perOrderMax: sum(e.target.value) })} /></label>
              <label className="adm-label">Yangi mijozga avtomatik (so‘m, 0 — yo‘q)<input className="adm-input mt-1" inputMode="numeric" value={form.welcomeAmount} onChange={(e) => setForm({ ...form, welcomeAmount: sum(e.target.value) })} /></label>
              <label className="adm-label">Bonus bilan minimal buyurtma (so‘m)<input className="adm-input mt-1" inputMode="numeric" value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: sum(e.target.value) })} /></label>
              <label className="adm-label">Amal qilish muddati (kun)<input className="adm-input mt-1" inputMode="numeric" value={form.validDays} onChange={(e) => setForm({ ...form, validDays: sum(e.target.value) })} /></label>
              <label className="adm-label">«Tasdiqlab olish» summasi (so‘m, 0 — o‘chiq)<input className="adm-input mt-1" inputMode="numeric" value={form.claimAmount} onChange={(e) => setForm({ ...form, claimAmount: sum(e.target.value) })} /></label>
              <label className="adm-label">Instagram sahifa (shartlarda)<input className="adm-input mt-1" inputMode="url" placeholder="https://instagram.com/…" value={form.instagramUrl} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value.trim() })} /></label>
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              «Tasdiqlab olish»: har mijoz summani bir marta o‘zi oladi — Telegram kanal (@{BRAND.channel}) va guruhga (@{BRAND.group}) obuna bo‘lgach, bot tekshiradi. Instagram tekshirilmaydi, faqat havola ko‘rsatiladi (bo‘sh bo‘lsa — qadam ko‘rinmaydi).
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Yangi mijoz bonusi — ilovani BIRINCHI ochganda bir marta tushadi. «Hammaga tashlash» olganlarga qayta tushmaydi. Muddat har yangi tushumda hozirdan boshlab hisoblanadi. Bonussiz buyurtmaning minimal summasi — Sozlamalar → Yetkazib berish.
            </p>
            <button
              className="adm-btn adm-btn--primary"
              disabled={!!busy}
              onClick={async () => {
                const r = await run('save', { action: 'wallet.save', ...form })
                if (r) { show('Saqlandi'); load() }
              }}
            >
              {busy === 'save' ? <Loader2 size={16} className="animate-spin" /> : null} Saqlash
            </button>
          </fieldset>
        </section>

        {/* So'nggi harakatlar */}
        <section className="adm-card p-4 sm:p-5">
          <h2 className="text-sm font-extrabold">So‘nggi harakatlar</h2>
          {state.recent.length === 0 ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>Hali harakat yo‘q.</p>
          ) : (
            <ul className="mt-3 grid gap-1.5 text-xs">
              {state.recent.map((t, i) => (
                <li key={i} className="flex justify-between gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--surface-2)' }}>
                  <span>ID {t.userId} · {TYPE[t.type] ?? t.type}{t.note ? ` · ${t.note}` : ''}</span>
                  <span><b style={{ color: t.amount > 0 ? 'var(--brand)' : 'var(--danger)' }}>{signed(t.amount)}</b> <span style={{ color: 'var(--muted)' }}>{when(t.at)}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      {toast}
    </>
  )
}
