import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react'
import { formatPrice } from '../../data'
import { productThumb } from '../../utils/product-image'
import { useT } from '../../i18n'
import { FreeDeliveryChip } from '../promo/FreeDeliveryTimer'
import { useFreeDelivery } from '../../hooks/use-free-delivery'
import { useDeliveryTimer } from '../../hooks/use-delivery-timer'
import { pastel } from '../../utils/pastel'
import { FreeDeliveryBar } from './FreeDeliveryBar'
import type { Product } from '../../types/domain'

type Props = {
  /** Yopilish animatsiyasi o'ynayapti — usePresence beradi. */
  leaving?: boolean
  cartProducts: { product: Product; quantity: number; size?: string; color?: string; cartKey: string }[]
  cartTotal: number
  onClose: () => void
  onUpdateQuantity: (cartKey: string, quantity: number) => void
  onCheckout: () => void
  onGoToCatalog: () => void
}

export function CartDrawer({
  leaving = false,
  cartProducts,
  cartTotal,
  onClose,
  onUpdateQuantity,
  onCheckout,
  onGoToCatalog,
}: Props) {
  const t = useT()
  const delivery = useFreeDelivery()
  // Rasmiylashtirish sahifasidagi qoida bilan bir xil (promokod/bonusdan oldin)
  const freeTimer = useDeliveryTimer().active
  const settings = delivery.settings
  const deliveryFee =
    settings === null || freeTimer || (settings.freeFrom > 0 && cartTotal >= settings.freeFrom) ? 0 : settings.fee

  return (
    <div
      className={'cart-overlay ' + (leaving ? 'leaving' : '')}
      role="dialog"
      aria-modal="true"
      aria-label={t('cart.title')}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <aside className="cart-drawer">
        {/* Mobil uchun sudrash tutqichi */}
        <div className="cart-handle" />

        <header
          className="flex items-center justify-between border-b p-5"
          style={{ borderColor: 'var(--line)' }}
        >
          <div>
            <h2 className="text-2xl font-extrabold" style={{ color: 'var(--ink)' }}>
              {t('cart.title')}
            </h2>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--muted)' }}>
              {t('cart.kinds', { count: cartProducts.length })}
            </p>
          </div>
          <button onClick={onClose} className="icon-button" aria-label={t('common.close')}>
            <X />
          </button>
        </header>

        {cartProducts.length ? (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {cartProducts.map(({ product, quantity, size, color, cartKey }, i) => (
                <article
                  key={cartKey}
                  className="cart-item"
                  style={{ animation: `fadeInUp 0.32s ease ${i * 0.05}s both` }}
                >
                  {/* Rasm — pastel fonda (har qatorda boshqa rang) */}
                  <span className="cart-item__media" style={{ ['--tile' as string]: pastel(i) }}>
                    {productThumb(product) ? (
                      <img src={productThumb(product)} alt={product.name} loading="lazy" />
                    ) : (
                      <ShoppingBag size={24} />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold" style={{ color: 'var(--ink)' }}>
                      {product.name}
                    </h3>
                    {(size || color) && (
                      <p className="mt-0.5 text-xs font-medium" style={{ color: 'var(--muted)' }}>
                        {size && `${t('cart.size')}: ${size}`}
                        {size && color && ' · '}
                        {color && `${t('cart.color')}: ${color}`}
                      </p>
                    )}
                    <p className="mt-1 text-sm font-extrabold" style={{ color: 'var(--ink)' }}>
                      {formatPrice(product.price)}
                      {product.pack ? <span className="font-bold" style={{ color: 'var(--muted)' }}> · {t('product.pack', { count: product.pack })}</span> : null}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="cart-stepper">
                        <button onClick={() => onUpdateQuantity(cartKey, quantity - 1)} aria-label="-">
                          <Minus size={15} />
                        </button>
                        <b>{quantity}</b>
                        <button className="is-plus" onClick={() => onUpdateQuantity(cartKey, quantity + 1)} aria-label="+">
                          <Plus size={15} strokeWidth={2.6} />
                        </button>
                      </div>
                      <button
                        onClick={() => onUpdateQuantity(cartKey, 0)}
                        className="grid size-8 place-items-center transition hover:scale-110 active:scale-90"
                        style={{ color: 'var(--muted)' }}
                        aria-label={t('common.cancel')}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <footer className="border-t p-5" style={{ borderColor: 'var(--line)' }}>
              <FreeDeliveryChip line />
              {delivery.settings && (
                <FreeDeliveryBar
                  subtotal={cartTotal}
                  fee={delivery.settings.fee}
                  freeFrom={delivery.settings.freeFrom}
                  text={delivery.text}
                />
              )}
              {/* Jamlanma: mahsulotlar, yetkazish, jami */}
              <div className="cart-summary">
                <p><span>{t('cart.items')}</span><b>{formatPrice(cartTotal)}</b></p>
                {settings !== null && (
                  <p>
                    <span>{t('checkout.delivery')}</span>
                    <b>{deliveryFee === 0 ? t('checkout.deliveryFree') : formatPrice(deliveryFee)}</b>
                  </p>
                )}
                <p className="cart-summary__total"><span>{t('cart.total')}</span><b>{formatPrice(cartTotal + deliveryFee)}</b></p>
              </div>
              <button onClick={onCheckout} className="btn-primary w-full py-4">
                <ShoppingBag size={20} /> {t('cart.checkout')}
              </button>
            </footer>
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-8 text-center">
            <div style={{ animation: 'fadeInUp 0.4s ease' }}>
              <span
                className="mx-auto grid size-20 place-items-center rounded-full"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
              >
                <ShoppingBag size={36} />
              </span>
              <h3 className="mt-5 text-xl font-extrabold" style={{ color: 'var(--ink)' }}>
                {t('cart.empty')}
              </h3>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                {t('cart.emptyText')}
              </p>
              <button onClick={onGoToCatalog} className="btn-ghost mt-6 w-full py-3">
                {t('cart.goToCatalog')}
              </button>
            </div>
          </div>
        )}
      </aside>
    </div>
  )
}
