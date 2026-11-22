import mark from '../../images/aqua-mark.png'
import { BRAND } from '../../config/brand'

type Props = {
  /** Belgi o'lchami (px). Yozuv shunga nisbatan masshtablanadi. */
  size?: number
  /** Yozuvsiz — faqat belgi (kichik joylar uchun). */
  markOnly?: boolean
  className?: string
}

/**
 * Aqua Marin logotipi.
 *
 * Belgi — logotipning o'zi: to'q ko'k doira, ichida «AQUA» (oq) va
 * «MARIN» (havorang). Favicon bilan aynan bir xil rasm.
 */
export function BrandLogo({ size = 44, markOnly = false, className = '' }: Props) {
  return (
    <span className={'flex items-center gap-2.5 ' + className}>
      <img
        src={mark}
        alt={BRAND.name}
        width={size}
        height={size}
        className="shrink-0 object-cover"
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          boxShadow: 'var(--shadow-brand)',
        }}
        decoding="async"
      />

      {!markOnly && (
        <span className="min-w-0 leading-none">
          <b
            className="wordmark block"
            style={{ fontSize: size * 0.6, color: 'var(--ink)' }}
          >
            {BRAND.name}
          </b>
          <small
            className="mt-1 block truncate font-bold uppercase"
            style={{
              fontSize: Math.max(7, size * 0.17),
              letterSpacing: '0.1em',
              color: 'var(--brand)',
            }}
          >
            {BRAND.tagline}
          </small>
        </span>
      )}
    </span>
  )
}
