import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Loader2, Send, ShoppingBag, Users } from 'lucide-react'
import { formatPrice } from '../../data'
import { useT } from '../../i18n'
import { apiPost } from '../../lib/api'
import type { WalletSettings } from '../../lib/firebase'
import { hapticError, hapticFeedback, hapticSuccess, openExternalLink } from '../../utils/telegram'
import { fullDate } from './terms'
import { BRAND } from '../../config/brand'

type TaskKey = 'channel' | 'group' | 'instagram'
type ClaimResult =
  | { ok: true; already?: boolean; amount: number; balance: number; expiresAt: string }
  | { ok: false; missing: TaskKey[]; off?: boolean }

const TELEGRAM: { key: TaskKey; url: string; handle: string }[] = [
  { key: 'channel', url: `https://t.me/${BRAND.channel}`, handle: `@${BRAND.channel}` },
  { key: 'group', url: `https://t.me/${BRAND.group}`, handle: `@${BRAND.group}` },
]

/** Konfetti bo'laklari — modul yuklanganda bir marta (render toza qolsin). */
const CONFETTI = Array.from({ length: 46 }, (_, i) => {
  const r = (n: number) => Math.abs(Math.sin(i * 12.9898 + n * 78.233) * 43758.5453) % 1
  return {
    left: `${Math.round(r(1) * 100)}%`,
    delay: `${(r(2) * 0.6).toFixed(2)}s`,
    duration: `${(1.6 + r(3) * 1.4).toFixed(2)}s`,
    color: ['#ffd43b', '#438bce', '#ff6b6b', '#4dabf7', '#fff1b8', '#e9a800'][i % 6],
    rotate: `${Math.round(r(4) * 360)}deg`,
    drift: `${Math.round((r(5) - 0.5) * 160)}px`,
  }
})

function useCount(target: number, run: boolean) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1400)
      setN(Math.round(target * (1 - Math.pow(1 - t, 3))))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, run])
  return n
}

/** Instagram belgisi (lucide'da yo'q). */
function Instagram({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  )
}

const LEAVE_MS = 220

/**
 * «Tasdiqlab olish»: Telegram kanal va guruhga (va Instagram'ga) obuna →
 * «Tekshirish» → server (api/promo.ts, kind 'wallet-claim') bot orqali
 * tekshiradi va summani tushiradi → konfetti va sanoq.
 */
export function ClaimSheet({ settings, onClose, onShop }: { settings: WalletSettings; onClose: () => void; onShop: () => void }) {
  const t = useT()
  const [leaving, setLeaving] = useState(false)
  const [visited, setVisited] = useState<Set<TaskKey>>(new Set())
  const [missing, setMissing] = useState<TaskKey[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ amount: number; expiresAt: string } | null>(null)
  const shown = useCount(done?.amount ?? 0, !!done)
  const alive = useRef(true)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      alive.current = false
      document.body.style.overflow = previous
    }
  }, [])

  const close = (then?: () => void) => {
    setLeaving(true)
    window.setTimeout(() => (then ?? onClose)(), LEAVE_MS)
  }

  const tasks = [
    ...TELEGRAM.map((x) => ({ ...x, title: t(x.key === 'channel' ? 'wallet.taskChannel' : 'wallet.taskGroup'), icon: x.key === 'channel' ? Send : Users })),
    ...(settings.instagramUrl ? [{ key: 'instagram' as const, url: settings.instagramUrl, handle: 'Instagram', title: t('wallet.taskInsta'), icon: Instagram }] : []),
  ]

  const open = (key: TaskKey, url: string) => {
    hapticFeedback('light')
    openExternalLink(url)
    setVisited((v) => new Set(v).add(key))
    setMissing((m) => m.filter((k) => k !== key))
  }

  const check = async () => {
    setBusy(true)
    setError('')
    try {
      const r = await apiPost<ClaimResult>('/api/promo', { kind: 'wallet-claim' })
      if (!alive.current) return
      if (r.ok && r.already) {
        close()
      } else if (r.ok) {
        hapticSuccess()
        setDone({ amount: r.already ? 0 : r.amount, expiresAt: r.expiresAt })
      } else if (r.off) {
        setError(t('wallet.claimOff'))
      } else {
        hapticError()
        setMissing(r.missing)
      }
    } catch {
      if (alive.current) setError(t('wallet.claimError'))
    } finally {
      if (alive.current) setBusy(false)
    }
  }

  return createPortal(
    <div className={'acf-overlay ' + (leaving ? 'leaving' : '')} onClick={() => close()} role="dialog" aria-modal="true" aria-labelledby="wl-claim-title">
      <div className={'acf-sheet wl-sheet wl-claim ' + (leaving ? 'leaving' : '')} onClick={(e) => e.stopPropagation()}>
        <span className="acf-grip" aria-hidden="true" />

        {done ? (
          <div className="wl-won">
            <div className="wl-confetti" aria-hidden="true">
              {CONFETTI.map((c, i) => (
                <i key={i} style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.duration, ['--r' as string]: c.rotate, ['--dx' as string]: c.drift }} />
              ))}
            </div>
            <div className="wl-won__coin" aria-hidden="true">💳</div>
            <h2 id="wl-claim-title" className="wl-won__title">{t('wallet.congrats')}</h2>
            <p className="wl-won__sum">+{formatPrice(shown)}</p>
            <p className="wl-sheet__sub">{t('wallet.credited')}</p>
            <ol className="wl-steps">
              <li><span>1</span>{t('wallet.step1', { min: formatPrice(settings.minOrder) })}</li>
              <li><span>2</span>{t('wallet.step2')}</li>
              <li><span>3</span>{t('wallet.step3', { amount: formatPrice(settings.perOrderMax) })}</li>
            </ol>
            {done.expiresAt && <p className="wl-until">{t('wallet.until', { date: fullDate(done.expiresAt) })}</p>}
            <button type="button" className="btn-primary mt-4 h-12 w-full" onClick={() => close(onShop)}>
              <ShoppingBag size={18} /> {t('wallet.shop')}
            </button>
          </div>
        ) : (
          <>
            <div className="wl-claim__gift" aria-hidden="true">🎁</div>
            <h2 id="wl-claim-title" className="wl-sheet__title">{t('wallet.claimTitle', { amount: formatPrice(settings.claimAmount) })}</h2>
            <p className="wl-sheet__sub">{t('wallet.claimSub')}</p>

            <ul className="wl-tasks">
              {tasks.map(({ key, url, handle, title, icon: Icon }) => {
                const bad = missing.includes(key)
                return (
                  <li key={key} className={'wl-task wl-task--' + key + (bad ? ' is-bad' : '') + (visited.has(key) && !bad ? ' is-done' : '')}>
                    <span className="wl-task__icon"><Icon size={20} /></span>
                    <span className="wl-task__text">
                      <b>{title}</b>
                      <small>{bad ? t('wallet.notJoined') : handle}</small>
                    </span>
                    <button type="button" className="wl-task__btn" onClick={() => open(key, url)}>
                      {visited.has(key) && !bad ? <Check size={16} /> : null}
                      {t('wallet.subscribe')}
                    </button>
                  </li>
                )
              })}
            </ul>

            {error && <p className="wl-claim__error">{error}</p>}
            <button type="button" className="btn-primary mt-4 h-12 w-full" disabled={busy} onClick={check}>
              {busy ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} {t('wallet.check')}
            </button>
            <p className="wl-claim__hint">{t('wallet.checkHint')}</p>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
