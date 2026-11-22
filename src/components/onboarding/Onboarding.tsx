import { useState } from 'react'
import mark from '../../images/aqua-mark.png'
import { LANGUAGES, useI18n, type Language } from '../../i18n'
import { updateUserProfile } from '../../lib/firebase'
import { auth } from '../../lib/auth'
import { hapticSelection, hapticSuccess } from '../../utils/telegram'
import { BasketArt } from './BasketArt'
import { markOnboarded } from './onboarding-state'
import './onboarding.css'

type Props = {
  /** `catalog` — «Katalogni ko'rish» bosilgan bo'lsa. */
  onDone: (target: 'home' | 'catalog') => void
}

/**
 * Yangi foydalanuvchi uchun 2 ekran:
 *   1) Til tanlash — ko'k gradient fon, pastdan chiqadigan oq oyna.
 *   2) Xush kelibsiz — logo, illyustratsiya, sarlavha, ikki tugma.
 */
export function Onboarding({ onDone }: Props) {
  const { lang, setLang, t } = useI18n()
  const [step, setStep] = useState<'lang' | 'welcome'>('lang')
  const [leaving, setLeaving] = useState(false)

  const choose = (code: Language) => {
    hapticSelection()
    setLang(code)
    const uid = auth.currentUser?.uid
    if (uid) updateUserProfile(Number(uid), { language: code }).catch(() => {})
    // Oyna yopilib, keyingi ekran ochilishi uchun qisqa pauza
    window.setTimeout(() => setStep('welcome'), 260)
  }

  const finish = (target: 'home' | 'catalog') => {
    hapticSuccess()
    markOnboarded()
    setLeaving(true)
    window.setTimeout(() => onDone(target), 320)
  }

  return (
    <div className={'ob' + (leaving ? ' ob--leaving' : '')} role="dialog" aria-modal="true">
      {step === 'lang' ? (
        <div className="ob-screen ob-lang" key="lang">
          <div className="ob-lang__brand" aria-hidden="true">
            <img src={mark} alt="" />
            <span>Aqua Marin</span>
          </div>
          <div className="ob-sheet">
            <p className="ob-sheet__title">{t('onboarding.chooseLang')}</p>
            <ul className="ob-sheet__list">
              {LANGUAGES.map((option) => (
                <li key={option.code}>
                  <button
                    className={'ob-sheet__item' + (option.code === lang ? ' is-current' : '')}
                    onClick={() => choose(option.code)}
                  >
                    {option.native}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        <div className="ob-screen ob-welcome" key="welcome">
          <div className="ob-welcome__brand">
            <img src={mark} alt="" />
            <span>Aqua Marin</span>
          </div>
          <div className="ob-welcome__art">
            <BasketArt />
          </div>
          <div className="ob-welcome__bottom">
            <h1 className="ob-title">
              {t('onboarding.title1')}
              <br />
              {t('onboarding.title2')}
            </h1>
            <button className="ob-btn ob-btn--primary" onClick={() => finish('home')}>
              {t('onboarding.start')}
            </button>
            <button className="ob-btn ob-btn--secondary" onClick={() => finish('catalog')}>
              {t('onboarding.catalog')}
            </button>
            <p className="ob-note">{t('onboarding.note')}</p>
          </div>
        </div>
      )}
    </div>
  )
}
