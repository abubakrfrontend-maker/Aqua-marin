import { useState } from 'react'
import { BrandLogo } from '../brand/BrandLogo'
import { useT } from '../../i18n'
import { getTelegramUser } from '../../utils/telegram'

/**
 * Bosh sahifa tepasi: «Xush kelibsiz, Ali» va Telegram rasmi.
 * Telegram foydalanuvchisi aniqlanmasa (brauzerda ochilgan) — logo.
 */
export function HomeGreeting({ className = '' }: { className?: string }) {
  const t = useT()
  const user = getTelegramUser()
  const [photoFailed, setPhotoFailed] = useState(false)

  if (!user?.first_name) return <BrandLogo size={44} className={className} />

  const initial = user.first_name.trim().charAt(0).toUpperCase()
  return (
    <div className={'home-hello ' + className}>
      {user.photo_url && !photoFailed ? (
        <img
          className="home-hello__avatar"
          src={user.photo_url}
          alt=""
          referrerPolicy="no-referrer"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <span className="home-hello__avatar home-hello__avatar--initial" aria-hidden="true">{initial}</span>
      )}
      <span className="min-w-0">
        <small className="home-hello__hi">{t('home.welcomeBack')}</small>
        <b className="home-hello__name">{user.first_name}</b>
      </span>
    </div>
  )
}
