/** Onboarding o'tilganini belgilaydi — yangi foydalanuvchiga faqat bir marta. */
export const ONBOARDED_KEY = 'aquaOnboarded'

export function shouldShowOnboarding(): boolean {
  try {
    // Faqat dev: ?onboarding — har safar ko'rsatish
    if (import.meta.env.DEV && new URLSearchParams(location.search).has('onboarding')) return true
    return localStorage.getItem(ONBOARDED_KEY) === null
  } catch {
    return false
  }
}

export function markOnboarded() {
  try {
    localStorage.setItem(ONBOARDED_KEY, '1')
  } catch {
    // saqlab bo'lmasa — keyingi safar yana ko'rinadi, xolos
  }
}
