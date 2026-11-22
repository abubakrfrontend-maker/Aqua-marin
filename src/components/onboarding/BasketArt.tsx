/**
 * Xush kelibsiz ekrani illyustratsiyasi (referensdagi 3D «clay» uslubida):
 * qalin yumaloq chetli oq kir savati, ichida ustma-ust taxlangan havorang
 * sochiqlar, old o'ng tomonda bitta sochiq osilib turadi, tepada krem
 * rangli yaltiroq yulduzcha. Faqat SVG gradientlar — rasm fayli yo'q.
 */
export function BasketArt() {
  return (
    <svg className="ob-art" viewBox="0 0 300 300" aria-hidden="true">
      <defs>
        <linearGradient id="obBody" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#cfc8c1" />
          <stop offset="0.3" stopColor="#f2eeea" />
          <stop offset="0.62" stopColor="#ebe6e1" />
          <stop offset="1" stopColor="#c4bcb4" />
        </linearGradient>
        <linearGradient id="obBodyShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#6d6259" stopOpacity="0.22" />
        </linearGradient>
        <linearGradient id="obRim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#ddd6cf" />
        </linearGradient>
        <linearGradient id="obSlot" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a79e95" />
          <stop offset="1" stopColor="#d4cdc6" />
        </linearGradient>
        <radialGradient id="obTowel" cx="0.38" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#9fcdfd" />
          <stop offset="0.45" stopColor="#5ea6f3" />
          <stop offset="1" stopColor="#2f78d6" />
        </radialGradient>
        <radialGradient id="obTowelTop" cx="0.4" cy="0.2" r="0.9">
          <stop offset="0" stopColor="#b2d8ff" />
          <stop offset="0.5" stopColor="#68adf5" />
          <stop offset="1" stopColor="#3580dc" />
        </radialGradient>
        <linearGradient id="obDrape" x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor="#7db9f8" />
          <stop offset="0.55" stopColor="#5a9ff0" />
          <stop offset="1" stopColor="#3a82dd" />
        </linearGradient>
        <linearGradient id="obStar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf1" />
          <stop offset="1" stopColor="#f2dcb9" />
        </linearGradient>
        <radialGradient id="obShadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#5f6b80" stopOpacity="0.32" />
          <stop offset="1" stopColor="#5f6b80" stopOpacity="0" />
        </radialGradient>
        <filter id="obSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#1b3f86" floodOpacity="0.22" />
        </filter>
      </defs>

      {/* Soya */}
      <ellipse cx="150" cy="276" rx="104" ry="13" fill="url(#obShadow)" />

      {/* Savat tanasi */}
      <path d="M60 150 C61 196 66 236 78 252 C88 266 112 270 150 270 C188 270 212 266 222 252 C234 236 239 196 240 150 Z" fill="url(#obBody)" />
      <path d="M60 150 C61 196 66 236 78 252 C88 266 112 270 150 270 C188 270 212 266 222 252 C234 236 239 196 240 150 Z" fill="url(#obBodyShade)" />

      {/* Teshiklar (chap va o'rta qismda) */}
      {[176, 194, 212, 230].map((y, i) => (
        <rect key={y} x={82 + i * 2} y={y} width={78 - i * 3} height="9" rx="4.5" fill="url(#obSlot)" />
      ))}
      <rect x="92" y="248" width="56" height="8" rx="4" fill="url(#obSlot)" opacity="0.85" />

      {/* Savatning orqa cheti va ichi */}
      <ellipse cx="150" cy="150" rx="92" ry="21" fill="#d8d1ca" />
      <ellipse cx="150" cy="151" rx="80" ry="15" fill="#b9b1a9" />

      {/* Sochiqlar: pastki keng qavat, o'rta, tepa (taxlangan) */}
      <path d="M68 152 C64 124 100 108 150 108 C200 108 236 124 232 152 C206 164 94 164 68 152 Z" fill="url(#obTowel)" filter="url(#obSoft)" />
      <path d="M86 124 C84 98 114 84 150 84 C186 84 216 98 214 124 C190 136 110 136 86 124 Z" fill="url(#obTowel)" filter="url(#obSoft)" />
      <path d="M108 98 C108 74 128 62 152 62 C178 62 194 74 192 98 C172 106 128 106 108 98 Z" fill="url(#obTowelTop)" filter="url(#obSoft)" />
      {/* Tax chiziqlari va yaltirash */}
      <path d="M124 86 C140 92 166 92 180 84" stroke="#2c6fcc" strokeOpacity="0.45" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M150 74 L176 70" stroke="#2c6fcc" strokeOpacity="0.4" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M100 112 C126 118 176 118 200 110" stroke="#2c6fcc" strokeOpacity="0.35" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M122 70 C130 64 142 62 150 63" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M96 100 C108 92 124 89 136 89" stroke="#ffffff" strokeOpacity="0.4" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Savatning old cheti (qalin, yumaloq) */}
      <path d="M58 151 A92 21 0 0 0 242 151" stroke="url(#obRim)" strokeWidth="15" fill="none" strokeLinecap="round" />
      <path d="M62 147 A88 18 0 0 0 238 147" stroke="#ffffff" strokeOpacity="0.7" strokeWidth="3" fill="none" strokeLinecap="round" />

      {/* Old tomonda osilib turgan sochiq */}
      <path d="M156 152 C170 142 212 140 238 145 C243 147 245 152 244 158 L237 228 C236 236 231 240 223 240 L176 242 C168 242 163 237 163 229 Z" fill="url(#obDrape)" filter="url(#obSoft)" />
      <path d="M156 152 C171 143 212 141 238 145 L240 157 C214 152 178 154 160 162 Z" fill="#9fcdfd" opacity="0.75" />
      <path d="M176 172 L180 228" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="4" strokeLinecap="round" />

      {/* Krem rangli yulduzcha */}
      <path
        d="M246 34 C249 56 256 63 278 66 C256 69 249 76 246 98 C243 76 236 69 214 66 C236 63 243 56 246 34 Z"
        fill="url(#obStar)"
        filter="url(#obSoft)"
      />
    </svg>
  )
}
