"""
Aqua Marin assistenti — @aquamarin_group dagi savollarga Gemini orqali javob.

Qoidalar (Abubakr, 2026-11-16):
  • faqat shu guruhda; savol bo'lmasa (salom, rahmat, suhbat, stiker) — jim;
  • xodim (@for_name, guruh adminlari, panel xodimlari) javob bergan bo'lsa — jim
    (shuning uchun javob AI_REPLY_DELAY soniya kutib yuboriladi);
  • siyosat, din, raqobatchilar, so'kinish, reklama, mavzudan tashqari — javob yo'q;
  • bilmasa / shikoyat / buyurtma holati — muloyim javob + adminlarga xabar;
  • o'zidan chegirma va va'da bermaydi; savol tilida, «Siz» bilan, qisqa;
  • mahsulot so'ralsa — mini app'da ochadigan tugma.

Bilim: bazadagi mahsulotlar, settings/delivery, settings/contact, settings/wallet
(10 daqiqa kesh) + quyidagi FAQ. Gemini — REST (aiohttp), kalit GEMINI_API_KEY.
Bepul tarif: Google so'rovlarni o'z mahsulotlarini yaxshilash uchun ishlatishi mumkin.
"""
import asyncio
import base64
import html
import json
import logging
import os
import re
import time
from collections import deque

import aiohttp
from aiogram import Bot
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, Message

import firebase_db as db

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "").strip()
# Zanjir: birinchisi band (503/429) yoki sekin bo'lsa — keyingisi. 2026-11-16 sinovi: 3.8-flash
# javob bermadi (timeout), 3.6-flash ~2 s, 3.5-flash-lite ~1 s, 3-flash-preview ~1.5 s.
GEMINI_MODELS = [m.strip() for m in os.environ.get(
    "GEMINI_MODELS", "gemini-3.6-flash,gemini-3-flash-preview,gemini-3.5-flash-lite").split(",") if m.strip()]
# TODO(AQUA): guruh username
GROUP = os.environ.get("AI_GROUP", "aquamarin_group").lstrip("@").lower()
STAFF_USERNAMES = {u.strip().lstrip("@").lower() for u in os.environ.get("AI_STAFF", "").split(",") if u.strip()}
REPLY_DELAY = float(os.environ.get("AI_REPLY_DELAY", "30"))
DAILY_LIMIT = int(os.environ.get("AI_DAILY_LIMIT", "400"))   # bepul kvotadan chiqmaslik uchun
USER_COOLDOWN = 15.0                                          # bir odamning ketma-ket xabarlari
from config import BOT_USERNAME

# TODO(AQUA): yetkazish, to'lov, qaytarish shartlari Musa'dan qolgan — Aqua Marin'nikiga almashtiriladi
FAQ = """
YETKAZISH: faqat Toshkent shahri bo'ylab. Soat 16:00 gacha berilgan buyurtma shu kuni 18:00 gacha yetkaziladi.
16:00 dan keyin berilgan buyurtma ertasi kuni ertaroq yetkaziladi. Yakshanba kuni berilgan buyurtma dushanba kuni keladi.
Viloyatlarga hozircha yetkazilmaydi — bu ustida ishlayapmiz.
TO'LOV: naqd pul yoki kuryer kelganda karta orqali (xohishga ko'ra).
QAYTARISH/ALMASHTIRISH: mumkin emas.
ISHLATISH VA XAVFSIZLIK: har bir vositaning qo'llash usuli va ehtiyot choralari qadog'ida yozilgan — o'zingdan
dozirovka yoki usul o'ylab topma. Bolalar qo'li yetmaydigan joyda saqlang. Ko'zga tushsa — ko'p suv bilan yuving.
SERTIFIKAT: TODO(AQUA) — sertifikat ma'lumoti kelganda yoziladi.
ULGURJI: faqat do'konlar uchun — adminga murojaat qilishsin (aloqa ma'lumotlari pastda).
BUYURTMA: Telegram'dagi @{bot} boti → «Katalog» (mini ilova) orqali beriladi.
""".strip()

SYSTEM = """Sen — «Aqua Marin» maishiy kimyo va uy tozalash vositalari do'konining Telegram guruhidagi yordamchisisan. Isming: «Aqua Marin assistenti».
Guruhga kelgan HAR BIR xabarni tahlil qilasan va qaror qilasan: javob berish, jim turish yoki adminga uzatish.

QAROR (action):
- "ignore" — xabar Aqua Marin haqida savol emas: salom, rahmat, hazil, odamlar o'zaro suhbati, fikr bildirish, stiker/emoji,
  e'lon, reklama, havola tarqatish, so'kinish yoki haqorat, siyosat, din, raqobatchilar, Aqua Marin ga aloqasi yo'q mavzular.
  Shubha bo'lsa ham — "ignore". Hech qachon mavzudan tashqari savolga javob berma.
- "answer" — Aqua Marin mahsulotlari, narxlari, yetkazish, to'lov, buyurtma berish, bonus karta, aloqa haqida savol
  va javob quyidagi MA'LUMOTLAR da ANIQ bor.
- "escalate" — Aqua Marin haqida savol, lekin javob ma'lumotlarda yo'q yoki ishonching komil emas; shikoyat; buyurtma holati
  («buyurtmam qayerda», «hali kelmadi»); ulgurji savdo; texnik muammo. Bunda reply — muloyim qisqa javob
  (masalan: admin tez orada javob beradi; buyurtma holati uchun @{bot} botiga shaxsiy yozing; shikoyatda — uzr so'ra).

JAVOB QOIDALARI (reply):
- Savol qaysi tilda VA qaysi yozuvda bo'lsa, javob ham shunday: o'zbek lotin → o'zbek lotin; o'zbek kirill
  (masalan «неча пул», «борми») → o'zbek kirill; rus → rus. Doim «Siz» deb murojaat.
- 1–4 qisqa gap, samimiy va hurmat bilan. Markdown, HTML, yulduzcha ishlatma. 1 ta emoji mumkin.
- Faqat MA'LUMOTLAR dagi faktlar, so'zma-so'z ma'nosida. Ma'lumotda yo'q tafsilot QO'SHMA: terminal, Click, Payme,
  Uzum, muddat, mahsulot ta'mi yoki sifati haqida bezakli so'zlar va h.k. Masalan, Click so'ralsa — faqat
  «naqd yoki kuryer kelganda karta orqali» de. Narx, chegirma, sovg'a, bepul narsa o'ylab topma va va'da qilma.
- Mahsulot yo'q bo'lsa yoki «hozir yo'q» deb belgilangan bo'lsa — shuni ayt, o'xshash mavjudini taklif qil.
- Shaxsiy ma'lumot (telefon, manzil, buyurtma raqami) guruhda so'rama.
- Kim ekaning so'ralsa: «Men Aqua Marin assistentiman» (sun'iy intellekt ekanligini yashirma).
- product_ids — javobda tilga olingan mahsulotlar id'lari (ko'pi bilan 3), aks holda bo'sh ro'yxat.

MA'LUMOTLAR:
{knowledge}
"""

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "action": {"type": "STRING", "enum": ["ignore", "answer", "escalate"]},
        "reply": {"type": "STRING"},
        "product_ids": {"type": "ARRAY", "items": {"type": "STRING"}},
        "reason": {"type": "STRING"},
    },
    "required": ["action", "reply", "product_ids", "reason"],
}

# ─── Bilim bazasi ──────────────────────────────────────────────

_kb_cache = {"at": 0.0, "text": "", "products": {}}


def _money(n) -> str:
    try:
        return f"{int(n):,}".replace(",", " ") + " so'm"
    except (TypeError, ValueError):
        return "—"


def _build_knowledge() -> tuple[str, dict]:
    products = [p for p in db.get_products() if p.get("name") and p.get("active") is not False]
    products.sort(key=lambda p: (str(p.get("category") or ""), str(p.get("name"))))
    by_id = {str(p["id"]): p for p in products}
    lines, cat = [], None
    for p in products:
        if p.get("category") != cat:
            cat = p.get("category")
            lines.append(f"\n[{cat or 'Boshqa'}]")
        stock = p.get("stock")
        status = " — HOZIR YO'Q" if isinstance(stock, (int, float)) and stock <= 0 else ""
        old = p.get("oldPrice")
        was = f" (avval {_money(old)})" if isinstance(old, (int, float)) and old > (p.get("price") or 0) else ""
        ru = f" / {p['nameRu']}" if p.get("nameRu") else ""
        lines.append(f"id={p['id']} | {p['name']}{ru} | {_money(p.get('price'))}{was}{status}")

    delivery = {}
    try:
        snap = db.db.collection("settings").document("delivery").get()
        delivery = snap.to_dict() or {}
    except Exception as e:
        logger.warning(f"[AI] delivery: {e}")
    fee = int(delivery.get("fee") or 0)
    free_from = int(delivery.get("freeFrom") or 0)
    min_order = int(delivery.get("minOrder") or 0)
    if fee <= 0:
        fee_text = "Yetkazish BEPUL."
    elif free_from > 0:
        fee_text = f"Yetkazish narxi {_money(fee)}, {_money(free_from)} dan ortiq buyurtmada bepul."
    else:
        fee_text = f"Yetkazish narxi {_money(fee)}."
    min_text = f" Minimal buyurtma — {_money(min_order)}." if min_order > 0 else ""

    w = db.get_wallet_settings()
    wallet = ""
    if w["enabled"] and w["claimAmount"] > 0:
        wallet = (f"BONUS KARTA: har bir yangi mijoz {_money(w['claimAmount'])} bonus oladi — @{BOT_USERNAME} → Profil → "
                  f"«{_money(w['claimAmount'])}ni olish», Telegram kanal va guruhga obuna bo'lib «Tekshirish va olish». "
                  f"Bonus {w['validDays']} kun amal qiladi, buyurtma kamida {_money(w['minOrder'])} bo'lsa har safar "
                  f"{_money(w['perOrderMax'])} gacha ishlatiladi. Bir kishi bir marta oladi.")

    c = db.get_contact_settings()
    contact = (f"ALOQA: telefon {c['phone']}, Telegram {c['telegram']}, ish vaqti {c['workHours']}, manzil {c['address']}.")

    text = "\n".join([
        FAQ.replace("{bot}", BOT_USERNAME),
        f"NARX VA YETKAZISH: {fee_text}{min_text}",
        wallet,
        contact,
        "MAHSULOTLAR (id | nom | narx):",
        *lines,
    ])
    return text, by_id


async def knowledge() -> tuple[str, dict]:
    if _kb_cache["text"] and time.time() - _kb_cache["at"] < 600:
        return _kb_cache["text"], _kb_cache["products"]
    try:
        text, by_id = await asyncio.to_thread(_build_knowledge)
        _kb_cache.update(at=time.time(), text=text, products=by_id)
    except Exception as e:
        logger.warning(f"[AI] bilim bazasi yangilanmadi: {e}")
    return _kb_cache["text"], _kb_cache["products"]


# ─── Gemini ────────────────────────────────────────────────────

async def ask_gemini(question: str, context: str) -> dict | None:
    kb, _ = await knowledge()
    if not kb:
        return None
    user = (f"Oldingi xabarlar (kontekst uchun, ularga javob berma):\n{context or '—'}\n\n"
            f"TAHLIL QILINADIGAN XABAR:\n{question}")
    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM.replace("{bot}", BOT_USERNAME).replace("{knowledge}", kb)}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 1024,
            "responseMimeType": "application/json",
            "responseSchema": SCHEMA,
            "thinkingConfig": {"thinkingLevel": "low"},
        },
    }
    data = None
    async with aiohttp.ClientSession() as session:
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
            try:
                async with session.post(url, json=body, headers={"x-goog-api-key": GEMINI_API_KEY},
                                        timeout=aiohttp.ClientTimeout(total=25)) as resp:
                    got = await resp.json(content_type=None)
                    if resp.status == 200:
                        data = got
                        break
                    logger.warning(f"[AI] {model} {resp.status}: {str(got)[:200]}")
                    if resp.status in (400, 401, 403):
                        return None   # kalit yoki so'rov xato — boshqa model ham yordam bermaydi
            except Exception as e:
                logger.warning(f"[AI] {model}: {type(e).__name__} {e}")
    if data is None:
        return None
    try:
        parts = data["candidates"][0]["content"]["parts"]
        raw = "".join(p.get("text", "") for p in parts if not p.get("thought"))
        out = json.loads(raw)
    except Exception:
        logger.warning(f"[AI] javob o'qilmadi: {str(data)[:300]}")
        return None
    if out.get("action") not in ("ignore", "answer", "escalate"):
        return None
    return out


# ─── Guruh ─────────────────────────────────────────────────────

_history: deque = deque(maxlen=8)             # oxirgi xabarlar — kontekst uchun
_staff_replied: set[int] = set()              # xodim javob bergan xabarlar (message_id)
_staff_activity: list[float] = [0.0]          # xodimning guruhdagi oxirgi xabari vaqti
_last_user: dict[int, float] = {}
_daily = {"day": "", "count": 0}
_admins_cache = {"at": 0.0, "ids": set()}


async def _group_admin_ids(bot: Bot, chat_id: int) -> set:
    if time.time() - _admins_cache["at"] < 600:
        return _admins_cache["ids"]
    try:
        admins = await bot.get_chat_administrators(chat_id)
        _admins_cache.update(at=time.time(), ids={a.user.id for a in admins})
    except Exception as e:
        logger.info(f"[AI] adminlar ro'yxati olinmadi: {e}")
    return _admins_cache["ids"]


async def is_staff(bot: Bot, message: Message, panel_check) -> bool:
    u = message.from_user
    if not u:
        return True
    if u.is_bot or (u.username or "").lower() in STAFF_USERNAMES:
        return True
    if u.id in await _group_admin_ids(bot, message.chat.id):
        return True
    try:
        return bool(panel_check(u.id))
    except Exception:
        return False


def is_target(message: Message) -> bool:
    """Assistent guruhi, kalit bor va buyruq emas (/group va boshqalar o'z handleriga boradi)."""
    chat = message.chat
    return (bool(GEMINI_API_KEY) and chat.type in ("group", "supergroup")
            and (chat.username or "").lower() == GROUP
            and not (message.text or "").startswith("/"))


def _text_of(message: Message) -> str:
    return (message.text or message.caption or "").strip()


_SMALL_TALK = re.compile(
    r"^(assalomu? ?alaykum|salom|va ?alaykum ?(assalom)?|rahmat|raxmat|katta rahmat|ok|okey|xop|xo'p|ha|yo'q|"
    r"zo'r|super|ассалому алайкум|салом|рахмат|привет|здравствуйте|спасибо|ок|хорошо|да|нет)[\s!.)👍🙏❤️😊]*$",
    re.IGNORECASE,
)


def _looks_trivial(text: str) -> bool:
    """Arzon oldindan filtr (kvota tejash): buyruq, juda qisqa, faqat emoji/raqam, salom/rahmat."""
    if not text or text.startswith("/"):
        return True
    letters = re.sub(r"[\W\d_]+", "", text, flags=re.UNICODE)
    return len(letters) < 4 or bool(_SMALL_TALK.match(text.strip()))


def _app_link(product_id: str) -> str:
    param = "q" + base64.urlsafe_b64encode(f"product={product_id}".encode()).decode().rstrip("=")
    return f"https://t.me/{BOT_USERNAME}?startapp={param}"


def _today() -> str:
    return time.strftime("%Y-%m-%d", time.gmtime(time.time() + 5 * 3600))


async def handle_group_message(bot: Bot, message: Message, panel_check, notify_admins) -> None:
    """Guruhdagi har bir xabar. Xodim xabari — faqat belgilanadi; mijoz xabari — kechiktirib tahlil."""
    text = _text_of(message)
    staff = await is_staff(bot, message, panel_check)
    name = (message.from_user.first_name if message.from_user else "") or "?"
    _history.append(f"{'[Aqua Marin xodimi] ' if staff else ''}{name}: {text[:300]}" if text else f"{name}: [media]")

    if staff:
        if message.reply_to_message:
            _staff_replied.add(message.reply_to_message.message_id)
        elif text:
            # «reply»siz yozgan bo'lsa ham — ehtimol shu savolga javob
            _staff_activity[0] = time.time()
        return
    if message.forward_origin or message.via_bot or _looks_trivial(text):
        return
    uid = message.from_user.id
    now = time.time()
    if now - _last_user.get(uid, 0) < USER_COOLDOWN:
        return
    _last_user[uid] = now
    asyncio.create_task(_process(bot, message, text, list(_history)[:-1], notify_admins))


async def _process(bot: Bot, message: Message, text: str, context: list, notify_admins) -> None:
    asked_at = time.time()
    await asyncio.sleep(REPLY_DELAY)
    # Shu orada xodim javob bergan bo'lsa — jim
    if message.message_id in _staff_replied or _staff_activity[0] > asked_at:
        logger.info(f"[AI] {message.message_id}: xodim javob berdi — jim")
        return
    day = _today()
    if _daily["day"] != day:
        _daily.update(day=day, count=0)
    if _daily["count"] >= DAILY_LIMIT:
        logger.warning("[AI] kunlik limit tugadi")
        return
    _daily["count"] += 1

    question = text
    if message.reply_to_message:
        quoted = _text_of(message.reply_to_message)
        if quoted:
            question = f"(Javob qaytarilgan xabar: «{quoted[:300]}»)\n{text}"
    result = await ask_gemini(question, "\n".join(context[-6:]))
    if not result:
        return
    action, reply = result["action"], (result.get("reply") or "").strip()
    logger.info(f"[AI] {message.message_id}: {action} — {result.get('reason', '')[:120]}")
    if action == "ignore" or not reply:
        return

    _, products = await knowledge()
    rows = []
    for pid in (result.get("product_ids") or [])[:3]:
        p = products.get(str(pid))
        if p:
            rows.append([InlineKeyboardButton(text=f"🛒 {p['name'][:40]}", url=_app_link(str(pid)))])
    try:
        await message.reply(html.escape(reply[:1500], quote=False),
                            reply_markup=InlineKeyboardMarkup(inline_keyboard=rows) if rows else None,
                            disable_web_page_preview=True)
    except Exception as e:
        logger.warning(f"[AI] javob yuborilmadi: {e}")

    if action == "escalate":
        who = message.from_user
        handle = f"@{who.username}" if who.username else html.escape(who.first_name or str(who.id), quote=False)
        link = f"https://t.me/{message.chat.username}/{message.message_id}"
        await notify_admins(
            "🙋 <b>Guruhda savol — admin javobi kerak</b>\n\n"
            f"👤 {handle}\n💬 {html.escape(text[:800], quote=False)}\n\n"
            f"🤖 Assistent: {html.escape(reply[:400], quote=False)}\n"
            f"<i>Sabab: {html.escape((result.get('reason') or '')[:200], quote=False)}</i>\n\n"
            f"🔗 {link}"
        )
