# Aqua Marin — sozlash ro'yxati

Loyiha MUSA (`D:\BIG PROJECTS\ecommercyfor-musa`) dan nusxa olingan (2026-11-21).
MUSA'ning kalitlari, bot tokeni, Firebase ulanishi, admin ID, karta raqami,
mahsulot rasmlari va ovozlari **olinmagan**. Kodda qolgan barcha bo'sh joylar
`TODO(AQUA)` belgisi bilan — qidirish:

```
grep -rn "TODO(AQUA)" --exclude-dir=node_modules .
```

## Mijozdan kutilayotgan ma'lumotlar

| Nima | Qayerga yoziladi |
|---|---|
| ✅ Bot tokeni (@aqua_marin_bot) | `bot/.env`; Vercel env → `vercel.env` faylidan |
| ✅ Bot username `aqua_marin_bot` | `src/config/brand.ts`, `bot/config.py`, `api/_lib/site.ts` |
| ✅ Firebase web config (`ecommercy-restoran`, tozalangan) | `src/config/firebase.ts` |
| ✅ Firebase service account JSON | loyiha ildizi, `bot/config.py`; Vercel env `FIREBASE_SERVICE_ACCOUNT` |
| ✅ Storage bucket | `bot/config.py` → `FIREBASE_STORAGE_BUCKET` |
| ✅ Domen: https://aqua-marin.vercel.app | `api/_lib/site.ts`, `bot/config.py`; qoldi: BotFather `/setdomain` |
| Egalar Telegram ID | `bot/config.py` → `ADMIN_IDS` |
| Telefon, email, Telegram, manzil, ish vaqti | `src/config/brand.ts`, `bot/config.py` |
| Karta raqami va egasi | `bot/config.py` (keyin admin paneldan) |
| Telegram kanal va guruh | `src/config/brand.ts`, `api/_lib/site.ts`, `bot/config.py`, `bot/ai_assistant.py` |
| Asosiy yo'nalishlar + rasmlari | `src/config/categories.ts`, `bot/firebase_db.py` → `MAIN_CATEGORIES` |
| Hero rasm (mahsulotlar fotosi) | `src/pages/HomePage.tsx` (hozir logo turibdi) |
| Logo asl fayli (PNG/SVG) | `src/images/aqua-mark.svg` → `aqua-mark.png`, `public/favicon-*.png`, `index.html` splash |
| Ovozli xabarlar (welcome, ism/telefon/manzil) | `public/sounds/*.mp3` (hozir yo'q — jim) |
| Yetkazish/to'lov/ulgurji shartlari | `src/pages/SupportPage.tsx` (FAQ), `bot/ai_assistant.py` (FAQ) |
| Linko (SFA) kerakmi? | `LINKO_TOKEN`, `.github/workflows/linko-sync.yml` |
| WLCM (Click/Payme/Uzum) kerakmi? | `WLCM_*` env |
| Gemini AI assistent kerakmi? | `bot/.env` → `GEMINI_API_KEY` |

## Hozirgi holat

- Brend nomi, matnlar (uz/ru), bot xabarlari → Aqua Marin, maishiy kimyo.
- Logo vaqtincha qayta chizilgan (`src/images/aqua-mark.svg`).
- Ranglar Aqua Marin logosidan: to'q ko'k #1B4F82 (asosiy), havorang #22E3F2 (aksent). Tokenlar — `src/styles.css`. Status yashillari (onlayn, muvaffaqiyatli) ataylab qoldirilgan.
- `npm` bu kompyuterda buzilgan: `node_modules` MUSA'dan nusxalangan.
  Ishga tushirish: `node ./node_modules/vite/bin/vite.js`.
