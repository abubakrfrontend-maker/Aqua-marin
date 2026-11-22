import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CalendarClock, ShoppingBag, Undo2 } from 'lucide-react'
import mark from '../../images/aqua-mark.png'
import { formatPrice } from '../../data'
import { useT } from '../../i18n'
import { getWalletSettings, WALLET_FALLBACK, type WalletSettings } from '../../lib/firebase'
import { hapticFeedback } from '../../utils/telegram'
import { launchParams } from '../../utils/launch'
import { ClaimSheet } from './ClaimSheet'
import { fullDate, shortDate, walletExpired } from './terms'
import './wallet.css'

type Props = {
  userId: number
  holder: string
  balance: number
  /** «Tasdiqlab olish» bajarilganmi (bo'lmasa — qulf, shartlar oynasi). */
  claimed: boolean
  /** Shaxsiy taklif summasi (umumiy summa 0 bo'lsa ishlatiladi). */
  offer?: number
  /** Bonus qachongacha amal qiladi (ISO). */
  expiresAt?: string
  onShop: () => void
}

/** ID karta raqamidek: 2141 0646 40. */
const cardNumber = (id: number) => String(id).replace(/(\d{4})(?=\d)/g, '$1 ')


/** Balans ochilganda 0 dan sanab chiqadi (bir marta). */
function useCountUp(value: number) {
  const [shown, setShown] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    const start = performance.now()
    const begin = from.current
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 1100)
      const v = Math.round(begin + (value - begin) * (1 - Math.pow(1 - t, 3)))
      setShown(v)
      if (t < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return shown
}

/**
 * Bonus karta — profil tepasida. Balans `users/{id}.walletBalance` dan
 * (jonli). Bosilsa «Qanday ishlatiladi» oynasi chiqadi.
 */
export function WalletCard({ userId, holder, balance, claimed, offer, expiresAt, onShop }: Props) {
  const t = useT()
  // Darhol standart bilan chiziladi (karta «sakrab» chiqmasin); admin o'chirgan bo'lsa yashirinadi
  const [settings, setSettings] = useState<WalletSettings>(WALLET_FALLBACK)
  const [open, setOpen] = useState(false)
  // Xabardagi «Tasdiqlab olish» tugmasi (?wallet=claim) — oyna darhol ochiladi
  const [claimOpen, setClaimOpen] = useState(() => !claimed && launchParams().get('wallet') === 'claim')
  const claimAmount = settings.claimAmount > 0 ? settings.claimAmount : Math.max(0, Math.round(Number(offer) || 0))
  const locked = !claimed && claimAmount > 0
  const expired = walletExpired(expiresAt)
  const shown = useCountUp(locked ? claimAmount : expired ? 0 : balance)
  const tap = () => { hapticFeedback('light'); if (locked) setClaimOpen(true); else setOpen(true) }

  useEffect(() => {
    let alive = true
    getWalletSettings().then((s) => alive && setSettings(s))
    return () => { alive = false }
  }, [])

  // Taklif hali yoqilmagan (summa 0) va pul yo'q — karta ko'rinmaydi (e'londan oldin sir qolsin)
  if (!settings.enabled || (!claimed && !locked && balance <= 0)) return null

  return (
    <>
      <button
        type="button"
        className={'wcard' + (locked ? ' wcard--locked' : '')}
        onClick={tap}
        aria-label={`${t('wallet.cardTitle')}: ${formatPrice(balance)}`}
      >
        <span className="wcard__shine" aria-hidden="true" />
        <span className="wcard__rings" aria-hidden="true" />
        <span className="wcard__top">
          <span className="wcard__brand">
            <img src={mark} alt="" />
            <b>Aqua Marin</b>
          </span>
          {locked
            ? <span className="wcard__lock">🔒 {t('wallet.lockedTag')}</span>
            : <span className="wcard__title">{t('wallet.cardTitle')}</span>}
        </span>

        <span className="wcard__mid">
          <span className="wcard__chip" aria-hidden="true">
            <svg viewBox="0 0 44 34"><rect x="1" y="1" width="42" height="32" rx="7" /><path d="M1 12h13M1 22h13M30 12h13M30 22h13M14 1v32M30 1v32M14 17h16" /></svg>
          </span>
          <svg className="wcard__wave" viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 7.5a6.5 6.5 0 0 1 0 9M12 5a10 10 0 0 1 0 14M15.5 2.5a13.5 13.5 0 0 1 0 19" /></svg>
        </span>

        <span className="wcard__balance">
          <small>{locked ? t('wallet.waiting') : t('wallet.balance')}</small>
          <b>{formatPrice(shown)}</b>
        </span>

        <span className="wcard__number">{cardNumber(userId)}</span>

        <span className="wcard__bottom">
          <span className="wcard__holder">{holder.toUpperCase()}</span>
          {locked ? null : expired ? (
            <span className="wcard__expired">{t('wallet.expired')}</span>
          ) : expiresAt ? (
            <span className="wcard__valid"><small>{t('wallet.validThru')}</small>{shortDate(expiresAt)}</span>
          ) : null}
        </span>
      </button>
      {locked ? (
        <button type="button" className="wl-claim-btn" onClick={tap}>
          🎁 {t('wallet.claimCta', { amount: formatPrice(claimAmount) })}
        </button>
      ) : (
        <p className="wcard-hint">💳 {t('wallet.tapHint')}</p>
      )}

      {claimOpen && (
        <ClaimSheet
          settings={{ ...settings, claimAmount }}
          onClose={() => setClaimOpen(false)}
          onShop={() => { setClaimOpen(false); onShop() }}
        />
      )}

      {open && (
        <HowToSheet
          balance={expired ? 0 : balance}
          settings={settings}
          until={expiresAt && !expired ? fullDate(expiresAt) : null}
          onClose={() => setOpen(false)}
          onShop={() => { setOpen(false); onShop() }}
        />
      )}
    </>
  )
}

const LEAVE_MS = 220

function HowToSheet({ balance, settings, until, onClose, onShop }: {
  balance: number; settings: WalletSettings; until: string | null; onClose: () => void; onShop: () => void
}) {
  const t = useT()
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [])

  const close = (then?: () => void) => {
    setLeaving(true)
    window.setTimeout(() => (then ?? onClose)(), LEAVE_MS)
  }

  return createPortal(
    <div className={'acf-overlay ' + (leaving ? 'leaving' : '')} onClick={() => close()} role="dialog" aria-modal="true" aria-labelledby="wl-title">
      <div className={'acf-sheet wl-sheet ' + (leaving ? 'leaving' : '')} onClick={(e) => e.stopPropagation()}>
        <span className="acf-grip" aria-hidden="true" />
        <div className="wl-sheet__coin" aria-hidden="true">💳</div>
        <h2 id="wl-title" className="wl-sheet__title">{t('wallet.howTitle')}</h2>
        <p className="wl-sheet__balance">{formatPrice(balance)}</p>
        <p className="wl-sheet__sub">{t('wallet.howSub')}</p>

        <ol className="wl-steps">
          <li><span>1</span>{t('wallet.step1', { min: formatPrice(settings.minOrder) })}</li>
          <li><span>2</span>{t('wallet.step2')}</li>
          <li><span>3</span>{t('wallet.step3', { amount: formatPrice(settings.perOrderMax) })}</li>
        </ol>

        {until && <p className="wl-until"><CalendarClock size={15} /> {t('wallet.until', { date: until })}</p>}
        <p className="wl-note"><Undo2 size={15} /> {t('wallet.note')}</p>

        <button type="button" className="btn-primary mt-4 h-12 w-full" onClick={() => close(onShop)}>
          <ShoppingBag size={18} /> {t('wallet.shop')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
