/**
 * Firebase mijoz (web) konfiguratsiyasi — Aqua Marin.
 *
 * Bu qiymatlar MAXFIY EMAS — Firebase ularni brauzerga ataylab ochiq
 * beradi, himoya Firestore Rules va App Check tomonida.
 *
 * Firebase Console → ⚙️ Project Settings → General → "Your apps" →
 * Web app → SDK setup and configuration → Config.
 *
 * DIQQAT: bu yerdagi projectId bot ishlatadigan service account
 * (bot/config.py → FIREBASE_KEY_FILE) bilan BIR XIL loyihaga tegishli
 * bo'lishi shart.
 *
 * Loyiha: `ecommercy-restoran` (eski restoran loyihasi — Aqua Marin uchun
 * tozalanib qayta ishlatilyapti).
 */
export const firebaseConfig = {
  apiKey: 'AIzaSyCzvCSShxNSDPTGhSctnOuwtqpbOlOs3OQ',
  authDomain: 'ecommercy-restoran.firebaseapp.com',
  projectId: 'ecommercy-restoran',
  storageBucket: 'ecommercy-restoran.firebasestorage.app',
  messagingSenderId: '346006739182',
  appId: '1:346006739182:web:d1cd0b98f9d024519e7bff',
  measurementId: 'G-RJ6Q8MCELF',
}
