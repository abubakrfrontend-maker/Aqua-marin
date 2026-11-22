/**
 * Bosh sahifa slaydlari uchun vaqtinchalik illyustratsiya — maishiy kimyo
 * idishlari (fonsiz). Haqiqiy mahsulot fotosi (fonsiz PNG) kelganda
 * HomePage'dagi `art` ga <img> qo'yiladi va bu komponent kerak bo'lmaydi.
 *
 * Ranglar logodan: dengiz ko'ki, havorang, krem.
 */
type Variant = 'bottles' | 'jug' | 'box'

const NAVY = '#082052'
const CYAN = '#22c7e0'
const CREAM = '#f8f0e5'

export function HeroArt({ variant = 'bottles' }: { variant?: Variant }) {
  if (variant === 'box') {
    return (
      <svg viewBox="0 0 200 180" className="hs__svg" aria-hidden="true">
        <ellipse cx="104" cy="172" rx="78" ry="7" fill={NAVY} opacity="0.12" />
        {/* Quti */}
        <path d="M34 76 L104 50 L174 76 L174 150 L104 174 L34 150 Z" fill="#c9a878" />
        <path d="M104 100 L174 76 L174 150 L104 174 Z" fill="#b4915f" />
        <path d="M34 76 L104 100 L104 174 L34 150 Z" fill="#d8bb8f" />
        <path d="M34 76 L104 50 L174 76 L104 100 Z" fill="#e6cfa8" />
        <path d="M64 65 L134 89 L134 112 L120 107 L120 92 L52 70 Z" fill={CREAM} opacity="0.9" />
        {/* Qutidagi idishlar */}
        <rect x="70" y="16" width="30" height="62" rx="9" fill={CYAN} />
        <rect x="76" y="6" width="18" height="14" rx="4" fill={NAVY} />
        <rect x="106" y="28" width="34" height="52" rx="10" fill={NAVY} />
        <rect x="114" y="18" width="18" height="13" rx="4" fill={CYAN} />
        <rect x="112" y="44" width="22" height="18" rx="5" fill={CREAM} />
        {/* Logo yorlig'i */}
        <circle cx="70" cy="128" r="17" fill={NAVY} />
        <path d="M60 128 q5 -6 10 0 t10 0" stroke={CYAN} strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>
    )
  }

  const big = variant === 'jug' ? CYAN : NAVY
  const small = variant === 'jug' ? NAVY : CYAN

  return (
    <svg viewBox="0 0 200 180" className="hs__svg" aria-hidden="true">
      <ellipse cx="100" cy="174" rx="84" ry="6" fill={NAVY} opacity="0.12" />
      {/* Pufakchalar */}
      <circle cx="30" cy="40" r="9" fill="#ffffff" opacity="0.7" />
      <circle cx="46" cy="22" r="5" fill="#ffffff" opacity="0.6" />
      <circle cx="176" cy="30" r="7" fill="#ffffff" opacity="0.65" />

      {/* Katta idish (kir yuvish geli) — dastali */}
      <path d="M48 52 Q48 40 60 40 L104 40 Q116 40 116 52 L120 62 Q124 70 124 82 L124 158 Q124 172 110 172 L52 172 Q38 172 38 158 L38 82 Q38 70 44 62 Z" fill={big} />
      <path d="M92 50 L108 50 Q114 50 114 58 L114 74 Q114 80 108 80 L100 80 Z" fill={variant === 'jug' ? '#1aa9c0' : '#16306e'} />
      <rect x="56" y="22" width="30" height="22" rx="6" fill={small} />
      <rect x="52" y="94" width="58" height="56" rx="12" fill={CREAM} />
      <circle cx="81" cy="114" r="11" fill={NAVY} />
      <path d="M72 114 q4.5 -5 9 0 t9 0" stroke={CYAN} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <rect x="62" y="132" width="38" height="5" rx="2.5" fill={NAVY} opacity="0.35" />
      <rect x="68" y="141" width="26" height="4" rx="2" fill={NAVY} opacity="0.25" />

      {/* Purkagich (spray) */}
      <path d="M140 92 Q140 84 148 84 L170 84 Q178 84 178 92 L180 160 Q180 172 168 172 L150 172 Q138 172 138 160 Z" fill={small} />
      <rect x="148" y="70" width="22" height="16" rx="4" fill={big} />
      <path d="M144 58 L178 58 Q184 58 184 64 L184 70 L144 72 Q138 72 138 66 Q138 58 144 58 Z" fill={big} />
      <path d="M176 70 L182 88 Q183 92 179 92 L174 92 Z" fill={big} />
      <rect x="146" y="112" width="26" height="34" rx="8" fill={CREAM} />
      <path d="M152 129 q3.5 -4 7 0 t7 0" stroke={NAVY} strokeWidth="2.2" fill="none" strokeLinecap="round" />
    </svg>
  )
}
