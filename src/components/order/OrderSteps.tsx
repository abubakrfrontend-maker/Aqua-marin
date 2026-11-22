import { Check, Phone } from 'lucide-react'
import { useT, type TranslationKey } from '../../i18n'
import type { Order } from '../../types/domain'
import { AWAITING_PAYMENT } from '../../utils/payment'

/** Buyurtma bosqichlari — tartib bo'yicha. */
const STEPS = ['Yangi', 'Qabul qilindi', 'Yetkazilmoqda', 'Yetkazildi'] as const

/** Buyurtma qaysi bosqichda (−1 — bekor qilingan/rad etilgan, chiziq ko'rsatilmaydi). */
function stepIndex(status: string): number {
  if (status === AWAITING_PAYMENT) return 0
  return STEPS.indexOf(status as (typeof STEPS)[number])
}

/**
 * Buyurtma kartasidagi bosqichlar chizig'i:
 * Yangi → Qabul qilindi → Yetkazilmoqda → Yetkazildi.
 * O'tilgan bosqichlar — to'q nuqta va chiziq, joriysi — halqa bilan.
 */
export function OrderSteps({ status }: { status: string }) {
  const t = useT()
  const current = stepIndex(status)
  if (current < 0) return null

  return (
    <ol className="order-steps" aria-label={t(`status.${status}` as TranslationKey)}>
      {STEPS.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={step} className={`order-steps__item is-${state}`}>
            <span className="order-steps__dot" aria-hidden="true">
              {state === 'done' && <Check size={11} strokeWidth={3.2} />}
            </span>
            <span className="order-steps__label">{t(`status.${step}` as TranslationKey)}</span>
          </li>
        )
      })}
    </ol>
  )
}

/** Yo'ldagi buyurtma: kuryer ismi va qo'ng'iroq tugmasi. */
export function CourierStrip({ order }: { order: Order }) {
  const t = useT()
  if (order.status !== 'Yetkazilmoqda' || !order.courierName) return null
  const initial = order.courierName.trim().charAt(0).toUpperCase()
  const tel = order.courierPhone ? `tel:${order.courierPhone.replace(/[^\d+]/g, '')}` : null

  return (
    <div className="courier-strip">
      <span className="courier-strip__avatar" aria-hidden="true">{initial}</span>
      <span className="min-w-0 flex-1">
        <b className="block truncate">{order.courierName}</b>
        <small>{t('rating.courier')}</small>
      </span>
      {tel && (
        <a href={tel} className="courier-strip__call" aria-label={order.courierPhone ?? ''} onClick={(e) => e.stopPropagation()}>
          <Phone size={17} />
        </a>
      )}
    </div>
  )
}
