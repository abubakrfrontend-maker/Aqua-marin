"""
Bot matnlari ikki tilda: o'zbekcha va ruscha.

Til foydalanuvchi bilan birga saqlanadi (`users/{id}.language`), shuning
uchun MINI APP ham xuddi shu tilda ochiladi — mijoz bir marta tanlaydi,
ikkala joyda ham o'sha til ishlaydi.

Faqat MIJOZ ko'radigan matnlar tarjima qilinadi. Admin va kuryerlarga
boradigan xabarlar o'zbekcha qoladi: ular bitta jamoa va matnlarni
ikkilantirish faqat chalkashlik keltiradi.
"""

DEFAULT = "uz"
LANGS = ("uz", "ru")


def normalize(lang) -> str:
    """Noma'lum yoki bo'sh qiymat — o'zbekcha."""
    return lang if lang in LANGS else DEFAULT


# ── Klaviatura yorliqlari ─────────────────────────────────────
# Handler ikkala tildagi yorliqni ham tanishi kerak: mijoz tilni
# almashtirgandan keyin ham eski klaviatura tugmasi ishlayversin.
BUTTONS = {
    "catalog": {"uz": "🧴 Katalogni ochish", "ru": "🧴 Открыть каталог"},
    "orders": {"uz": "📦 Buyurtmalarim", "ru": "📦 Мои заказы"},
    "contact": {"uz": "📞 Biz bilan aloqa", "ru": "📞 Связаться с нами"},
    "help": {"uz": "ℹ️ Yordam", "ru": "ℹ️ Помощь"},
    "phone": {"uz": "📱 Raqamni yuborish", "ru": "📱 Отправить номер"},
    "giveaway": {"uz": "🎁 Konkurs", "ru": "🎁 Конкурс"},
    # Summa settings/wallet dan qo'yiladi; handler «💰» bilan boshlanishini tanidi
    "bonus": {"uz": "💰 {amount} bonus", "ru": "💰 Бонус {amount}"},
}
BONUS_PREFIX = "💰"


def money(amount: int, lang: str = DEFAULT) -> str:
    """50000 → «50 000 so'm» / «50 000 сум»."""
    unit = "сум" if normalize(lang) == "ru" else "so'm"
    return f"{int(amount):,}".replace(",", " ") + f" {unit}"


def button(key: str, lang: str = DEFAULT) -> str:
    return BUTTONS[key][normalize(lang)]


def labels(key: str) -> set:
    """Shu tugmaning hamma tildagi yorliqlari — `F.text.in_(...)` uchun."""
    return set(BUTTONS[key].values())


SEP = "━" * 22

TEXTS = {
    # ── Til tanlash ──
    "lang_ask": {
        "uz": "🇺🇿 <b>Tilni tanlang</b>\n🇷🇺 <b>Выберите язык</b>",
        "ru": "🇺🇿 <b>Tilni tanlang</b>\n🇷🇺 <b>Выберите язык</b>",
    },
    "lang_uz": {"uz": "🇺🇿 O'zbekcha", "ru": "🇺🇿 O'zbekcha"},
    "lang_ru": {"uz": "🇷🇺 Русский", "ru": "🇷🇺 Русский"},
    "lang_saved": {
        "uz": "✅ Til o'zbekchaga o'zgartirildi. Ilova ham shu tilda ochiladi.",
        "ru": "✅ Язык изменён на русский. Приложение откроется на нём же.",
    },

    # ── Konkurs (🎁 Konkurs tugmasi) ──
    "gw_info": {
        "uz": (
            "✅ <b>Siz konkursga qo'shildingiz!</b>\n\n"
            "🎁 {winners} kishiga «{prize}» sovg'a!\n"
            "🗓 G'oliblar <b>{until}</b> da baraban orqali aniqlanadi.\n\n"
            "{referral}"
        ),
        "ru": (
            "✅ <b>Вы участвуете в конкурсе!</b>\n\n"
            "🎁 {winners} победителям — «{prize}» в подарок!\n"
            "🗓 Победители будут определены <b>{until}</b> на барабане.\n\n"
            "{referral}"
        ),
    },
    "gw_referral": {
        "uz": "👥 <b>Imkoniyatingizni oshiring:</b> do'stlaringizni taklif qiling — har bir yangi do'st <b>+1 ochko</b>. Ochko qancha ko'p — yutish imkoni shuncha katta! 🍀\n<i>(Do'stingiz havolangiz orqali botga kirib, START bosishi kifoya)</i>",
        "ru": "👥 <b>Увеличьте шансы:</b> приглашайте друзей — каждый новый друг даёт <b>+1 очко</b>. Чем больше очков — тем выше шанс на победу! 🍀\n<i>(Другу достаточно зайти в бота по вашей ссылке и нажать START)</i>",
    },
    "gw_me": {
        "uz": (
            "\n\n━━━━━━━━━━━━━━\n"
            "⭐ Ochkolaringiz: <b>{points}</b>\n"
            "👥 Taklif qilgan do'stlar: <b>{refs}</b>\n"
            "🏆 Reytingda: <b>{rank}-o'rin</b> ({total} ishtirokchi)"
        ),
        "ru": (
            "\n\n━━━━━━━━━━━━━━\n"
            "⭐ Ваши очки: <b>{points}</b>\n"
            "👥 Приглашено друзей: <b>{refs}</b>\n"
            "🏆 В рейтинге: <b>{rank}-е место</b> (участников: {total})"
        ),
    },
    "gw_link": {
        "uz": "\n\n🔗 Shaxsiy havolangiz:\n{link}",
        "ru": "\n\n🔗 Ваша личная ссылка:\n{link}",
    },
    "gw_ref_joined": {
        "uz": (
            "🎉 <b>{name}</b> sizning havolangiz orqali botga qo'shildi!\n"
            "Sizga <b>+1 ochko</b> yozildi! "
            "Yana do'stlaringizni taklif qiling 👇"
        ),
        "ru": (
            "🎉 <b>{name}</b> присоединился по вашей ссылке!\n"
            "Вам начислено <b>+1 очко</b>! "
            "Приглашайте ещё друзей 👇"
        ),
    },
    "gw_share_btn": {"uz": "📤 Do'stlarga yuborish", "ru": "📤 Отправить друзьям"},
    "gw_top_btn": {"uz": "🏆 Reyting", "ru": "🏆 Рейтинг"},
    "gw_share_text": {
        "uz": "Aqua Marin botida konkurs: «{prize}» yutib olish mumkin! 🎁 Kirib START bosing 👇",
        "ru": "Конкурс в боте Aqua Marin: можно выиграть «{prize}»! 🎁 Заходите и нажмите START 👇",
    },
    "gw_top": {
        "uz": "🏆 <b>Reyting — TOP {count}</b>\n\n{rows}{me}\n\n👥 Ko'proq do'st taklif qiling va yuqoriga chiqing!",
        "ru": "🏆 <b>Рейтинг — TOP {count}</b>\n\n{rows}{me}\n\n👥 Приглашайте больше друзей и поднимайтесь выше!",
    },
    "gw_top_me": {
        "uz": "\n\n👤 Siz: <b>{rank}-o'rin</b>, {points} ochko",
        "ru": "\n\n👤 Вы: <b>{rank}-е место</b>, {points} очк.",
    },
    "gw_points": {"uz": "ochko", "ru": "очк."},
    "gw_empty_top": {"uz": "Hali ishtirokchilar yo'q — birinchi bo'ling!", "ru": "Пока нет участников — будьте первым!"},
    "gw_stale": {
        "uz": "\n\n⏳ <i>Reyting hozir yangilanmoqda. Ochkolaringiz va do'st takliflari saqlanadi — birozdan keyin qarang.</i>",
        "ru": "\n\n⏳ <i>Рейтинг сейчас обновляется. Ваши очки и приглашения сохраняются — загляните чуть позже.</i>",
    },
    "gw_stale_top": {
        "uz": "⏳ Reyting hozir yangilanmoqda. Ochkolaringiz va do'st takliflari saqlanadi — birozdan keyin qayta bosing.\n\n👥 Shu orada do'stlaringizni taklif qilishda davom eting!",
        "ru": "⏳ Рейтинг сейчас обновляется. Ваши очки и приглашения сохраняются — нажмите чуть позже.\n\n👥 А пока продолжайте приглашать друзей!",
    },
    "gw_none": {
        "uz": "Hozircha konkurs yo'q. Yangiliklarni kuzatib boring! 🙂",
        "ru": "Сейчас конкурса нет. Следите за новостями! 🙂",
    },
    "gw_soon": {
        "uz": "🎁 Konkurs <b>{date}</b> kuni boshlanadi. Kuting! 🙂",
        "ru": "🎁 Конкурс начнётся <b>{date}</b>. Ждите! 🙂",
    },
    "gw_finished": {
        "uz": "🎉 <b>Konkurs yakunlandi!</b>\n\nG'oliblar:\n{list}\n\nQatnashganingiz uchun rahmat! 💚",
        "ru": "🎉 <b>Конкурс завершён!</b>\n\nПобедители:\n{list}\n\nСпасибо за участие! 💚",
    },
    "gw_error": {
        "uz": "Hozir ma'lumotni olib bo'lmadi. Birozdan keyin qayta urinib ko'ring.",
        "ru": "Сейчас не удалось получить данные. Попробуйте чуть позже.",
    },

    # ── 💰 Bonus karta (tugma va /start eslatmasi) ──
    "bonus_card": {
        "uz": (
            "🎁 <b>Sizga {amount} sovg'a!</b>\n\n"
            "Bonus kartangizga <b>{amount}</b> tushishi uchun 3 qadam:\n"
            "1️⃣ Pastdagi «🎁 {amount}ni olish» tugmasini bosing\n"
            "2️⃣ Telegram kanal va guruhimizga obuna bo'ling\n"
            "3️⃣ «Tekshirish va olish» ni bosing — pul darhol kartangizda ✅\n\n"
            "<i>Shartlar: bonus {days} kun amal qiladi. Buyurtma kamida {min_order} bo'lsa, "
            "har safar {per_order} gacha ishlatiladi.</i>"
        ),
        "ru": (
            "🎁 <b>Вам в подарок {amount}!</b>\n\n"
            "Чтобы <b>{amount}</b> поступили на бонусную карту — 3 шага:\n"
            "1️⃣ Нажмите кнопку «🎁 Получить {amount}» ниже\n"
            "2️⃣ Подпишитесь на наш Telegram-канал и группу\n"
            "3️⃣ Нажмите «Проверить и получить» — деньги сразу на карте ✅\n\n"
            "<i>Условия: бонус действует {days} дней, списывается до {per_order} "
            "с каждого заказа от {min_order}.</i>"
        ),
    },
    "bonus_btn": {"uz": "🎁 {amount}ni olish", "ru": "🎁 Получить {amount}"},
    "bonus_claimed": {
        "uz": (
            "✅ <b>Siz bonusni olgansiz!</b>\n\n"
            "💳 Bonus kartangizda: <b>{balance}</b>{until}\n\n"
            "Buyurtma kamida {min_order} bo'lsa, har safar {per_order} gacha ishlating 🛒"
        ),
        "ru": (
            "✅ <b>Вы уже получили бонус!</b>\n\n"
            "💳 На бонусной карте: <b>{balance}</b>{until}\n\n"
            "Используйте до {per_order} в каждом заказе от {min_order} 🛒"
        ),
    },
    "bonus_until": {"uz": "\n⏳ Amal qiladi: <b>{date}</b> gacha", "ru": "\n⏳ Действует до <b>{date}</b>"},
    "bonus_card_btn": {"uz": "💳 Bonus kartani ochish", "ru": "💳 Открыть бонусную карту"},
    "bonus_off": {
        "uz": "Hozircha bonus taklifi yo'q. Yangiliklarni kuzatib boring! 🙂",
        "ru": "Сейчас бонусного предложения нет. Следите за новостями! 🙂",
    },

    # ── /start ──
    "welcome": {
        "uz": (
            "Assalomu alaykum, <b>{name}</b>! 👋\n\n"
            "🧴 <b>Aqua Marin rasmiy do'koniga xush kelibsiz!</b>\n"
            "<i>Maishiy kimyo va uy tozalash vositalari.</i>\n\n"
            "🧺 <b>Kir yuvish, idish yuvish va uy tozalash uchun hammasi.</b>\n\n"
            "👇 <i>Buyurtmani boshlash uchun quyidagi tugmani bosing:</i>"
        ),
        "ru": (
            "Здравствуйте, <b>{name}</b>! 👋\n\n"
            "🧴 <b>Добро пожаловать в официальный магазин Aqua Marin!</b>\n"
            "<i>Бытовая химия и средства для уборки дома.</i>\n\n"
            "🧺 <b>Всё для стирки, мытья посуды и уборки.</b>\n\n"
            "👇 <i>Нажмите кнопку ниже, чтобы сделать заказ:</i>"
        ),
    },
    "ask_phone": {
        "uz": (
            "📱 <b>Telefon raqamingizni qoldiring</b>\n\n"
            "Buyurtma berganingizda uni qayta yozib o'tirmaysiz, "
            "kuryer esa siz bilan tez bog'lana oladi.\n\n"
            "<i>Ixtiyoriy — keyinroq ilovaning «Shaxsiy ma'lumotlar» "
            "bo'limidan ham kiritish mumkin.</i>"
        ),
        "ru": (
            "📱 <b>Оставьте свой номер телефона</b>\n\n"
            "Его не придётся вводить при каждом заказе, "
            "а курьер сможет быстро с вами связаться.\n\n"
            "<i>Необязательно — номер можно добавить позже в разделе "
            "«Личные данные» в приложении.</i>"
        ),
    },
    "phone_foreign": {
        "uz": "❌ Iltimos, <b>o'zingizning</b> raqamingizni yuboring.",
        "ru": "❌ Пожалуйста, отправьте <b>свой</b> номер.",
    },
    "phone_saved": {
        "uz": (
            "✅ Raqamingiz saqlandi: <code>{phone}</code>\n\n"
            "Endi buyurtma berishda u avtomatik to'ldiriladi."
        ),
        "ru": (
            "✅ Номер сохранён: <code>{phone}</code>\n\n"
            "Теперь он будет подставляться в заказ автоматически."
        ),
    },
    "phone_failed": {
        "uz": "❌ Raqamni saqlab bo'lmadi. Keyinroq qayta urinib ko'ring.",
        "ru": "❌ Не удалось сохранить номер. Попробуйте позже.",
    },

    # ── Katalog ──
    "catalog_title": {
        "uz": (
            "🧴 <b>AQUA MARIN KATALOGI</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Kir yuvish, idish yuvish va uy tozalash vositalari — hammasi bir joyda.\n\n"
            "👇 <b>Katalogni ochish</b> tugmasini bosing — do'kon shu yerning o'zida ochiladi."
        ),
        "ru": (
            "🧴 <b>КАТАЛОГ AQUA MARIN</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Средства для стирки, мытья посуды и уборки — всё в одном месте.\n\n"
            "👇 Нажмите <b>«Открыть каталог»</b> — магазин откроется прямо здесь."
        ),
    },
    "catalog_button": {"uz": "🧴 Katalogni ochish", "ru": "🧴 Открыть каталог"},

    # ── Buyurtmalar ──
    "orders_button": {"uz": "📦 Buyurtmalarimni ko'rish", "ru": "📦 Посмотреть мои заказы"},
    "orders_empty": {
        "uz": (
            "📦 <b>Buyurtmalarim</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Sizda hozircha buyurtma yo'q.\n\n"
            "🧺 Kir yuvish, 🍽 idish yuvish va 🧽 uy tozalash vositalari.\n"
            "Katalogdan tanlab, birinchi buyurtmangizni bering!"
        ),
        "ru": (
            "📦 <b>Мои заказы</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "Пока у вас нет заказов.\n\n"
            "🧺 Стирка, 🍽 мытьё посуды и 🧽 уборка дома.\n"
            "Выберите в каталоге и сделайте первый заказ!"
        ),
    },
    "orders_list": {
        "uz": (
            "📦 <b>Buyurtmalarim</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🧾 Jami buyurtma: <b>{total} ta</b>\n"
            "🔄 Jarayonda: <b>{active} ta</b>\n\n"
            "Har bir buyurtmaning holati, tarkibi va yetkazish manzili —\n"
            "hammasi ilovada. Holat <b>real vaqtda</b> yangilanadi:\n\n"
            "✅ Qabul qilindi → 🚚 Yetkazilmoqda → 🎉 Yetkazildi\n\n"
            "👇 <i>Ko'rish uchun tugmani bosing:</i>"
        ),
        "ru": (
            "📦 <b>Мои заказы</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🧾 Всего заказов: <b>{total}</b>\n"
            "🔄 В процессе: <b>{active}</b>\n\n"
            "Статус, состав и адрес доставки каждого заказа —\n"
            "всё в приложении. Статус обновляется <b>в реальном времени</b>:\n\n"
            "✅ Принят → 🚚 Доставляется → 🎉 Доставлен\n\n"
            "👇 <i>Нажмите кнопку, чтобы посмотреть:</i>"
        ),
    },
    "receipt_again": {"uz": "qayta chek", "ru": "чек повторно"},
    "receipt_send": {"uz": "chek yuborish", "ru": "отправить чек"},

    # ── Aloqa va yordam ──
    "contact": {
        "uz": (
            "📞 <b>Aqua Marin bilan bog'lanish:</b>\n\n"
            "💬 <b>Mijozlar xizmati:</b> {telegram}\n"
            "📞 <b>Telefon raqam:</b> {phone}\n"
            "✉️ <b>Email:</b> {email}\n"
            "📍 <b>Manzil:</b> {city}\n"
            "⏰ <b>Ish vaqti:</b> {hours}\n\n"
            "<i>Ulgurji xarid va hamkorlik bo'yicha ham shu raqamga murojaat qiling.</i>"
        ),
        "ru": (
            "📞 <b>Связаться с Aqua Marin:</b>\n\n"
            "💬 <b>Служба поддержки:</b> {telegram}\n"
            "📞 <b>Телефон:</b> {phone}\n"
            "✉️ <b>Email:</b> {email}\n"
            "📍 <b>Адрес:</b> {city}\n"
            "⏰ <b>Время работы:</b> {hours}\n\n"
            "<i>По оптовым закупкам и сотрудничеству — по этому же номеру.</i>"
        ),
    },
    "help": {
        "uz": (
            "ℹ️ <b>Botdan qanday foydalanish mumkin?</b>\n\n"
            "1️⃣ Yozuv maydoni yonidagi <b>«🧴 Katalog»</b> tugmasini bosib, "
            "Aqua Marin mahsulotlari bilan tanishing.\n"
            "2️⃣ O'zingizga yoqqan mahsulotlarni <b>Savatga</b> qo'shing.\n"
            "3️⃣ Buyurtmani rasmiylashtirishda <b>Naqd</b> yoki <b>Karta</b> orqali to'lov usulini tanlang.\n"
            "4️⃣ Agar karta orqali to'lov qilsangiz, to'lov chekini botga yuboring.\n"
            "5️⃣ Buyurtmangiz holatini <b>Buyurtmalarim</b> bo'limidan kuzatib boring.\n\n"
            "<i>Tilni almashtirish uchun /til buyrug'ini yuboring.</i>"
        ),
        "ru": (
            "ℹ️ <b>Как пользоваться ботом?</b>\n\n"
            "1️⃣ Нажмите кнопку <b>«🧴 Katalog»</b> рядом с полем ввода "
            "и посмотрите продукцию Aqua Marin.\n"
            "2️⃣ Добавьте понравившиеся товары в <b>Корзину</b>.\n"
            "3️⃣ При оформлении выберите оплату: <b>Наличные</b> или <b>Карта</b>.\n"
            "4️⃣ При оплате картой отправьте чек боту.\n"
            "5️⃣ Следите за статусом в разделе <b>Мои заказы</b>.\n\n"
            "<i>Чтобы сменить язык, отправьте команду /til.</i>"
        ),
    },

    # ── To'lov cheki ──
    "pay_info": {
        "uz": (
            "💳 <b>To'lov ma'lumotlari</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🆔 Buyurtma ID: <b>{order}</b>\n"
            "📦 <b>Mahsulotlar:</b>\n{items}\n"
            "💰 Jami: <b>{total}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "💳 <b>Karta raqami:</b>\n<code>{card}</code>\n"
            "👤 Egasi: <b>{owner}</b>\n\n"
            "📸 Pul o'tkazgandan so'ng <b>to'lov chekini (screenshot)</b> yuboring:"
        ),
        "ru": (
            "💳 <b>Данные для оплаты</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "🆔 ID заказа: <b>{order}</b>\n"
            "📦 <b>Товары:</b>\n{items}\n"
            "💰 Итого: <b>{total}</b>\n"
            "━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "💳 <b>Номер карты:</b>\n<code>{card}</code>\n"
            "👤 Владелец: <b>{owner}</b>\n\n"
            "📸 После перевода отправьте <b>чек (скриншот)</b>:"
        ),
    },
    "order_not_found": {
        "uz": (
            "❌ Buyurtma topilmadi.\n"
            "Iltimos, mini appdagi «To'lov chekini yuborish» tugmasini qayta bosing."
        ),
        "ru": (
            "❌ Заказ не найден.\n"
            "Пожалуйста, нажмите кнопку «Отправить чек» в приложении ещё раз."
        ),
    },
    "order_cash_ok": {
        "uz": (
            "🎉 <b>Buyurtmangiz qabul qilindi!</b>\n"
            "🆔 Buyurtma: <b>{order}</b>\n"
            "💵 To'lov: Naqd (yetkazganda)\n\n"
            "Operatorimiz tez orada bog'lanadi 📞"
        ),
        "ru": (
            "🎉 <b>Ваш заказ принят!</b>\n"
            "🆔 Заказ: <b>{order}</b>\n"
            "💵 Оплата: наличными при получении\n\n"
            "Наш оператор скоро свяжется с вами 📞"
        ),
    },
    "error_retry": {
        "uz": "❌ Xatolik. Qayta urinib ko'ring.",
        "ru": "❌ Ошибка. Попробуйте ещё раз.",
    },

    # ── Chek yuborish ──
    "receipt_ask": {
        "uz": (
            "📸 <b>To'lov chekini yuboring</b>\n\n"
            "Pul o'tkazilganini tasdiqlovchi <b>screenshot yoki rasmni</b> yuboring:"
        ),
        "ru": (
            "📸 <b>Отправьте чек об оплате</b>\n\n"
            "Пришлите <b>скриншот или фото</b>, подтверждающее перевод:"
        ),
    },
    "receipt_sent": {
        "uz": "✅ <b>Chekingiz yuborildi!</b>\n\nAdmin tekshirib, tez orada xabar beramiz 📬",
        "ru": "✅ <b>Чек отправлен!</b>\n\nАдмин проверит и мы скоро сообщим 📬",
    },
    "receipt_photo_only": {
        "uz": "❌ Iltimos, to'lov chekini <b>rasm (foto)</b> sifatida yuboring.",
        "ru": "❌ Пожалуйста, отправьте чек об оплате <b>фотографией</b>.",
    },
    "receipt_retry_button": {"uz": "💳 Qayta chek yuborish", "ru": "💳 Отправить чек заново"},
    "orders_webapp_button": {"uz": "🛍 Buyurtmalarimni ko'rish", "ru": "🛍 Посмотреть мои заказы"},
    "pay_approved": {
        "uz": (
            "✅ <b>To'lovingiz tasdiqlandi!</b>\n" + SEP + "\n\n"
            "🧾 Buyurtma: <b>{order}</b>\n"
            "💰 To'lov qabul qilindi! Tez orada yetkaziladi 🚀"
        ),
        "ru": (
            "✅ <b>Оплата подтверждена!</b>\n" + SEP + "\n\n"
            "🧾 Заказ: <b>{order}</b>\n"
            "💰 Платёж принят! Скоро доставим 🚀"
        ),
    },
    "pay_rejected": {
        "uz": (
            "❌ <b>To'lov cheki rad etildi</b>\n" + SEP + "\n\n"
            "🧾 Buyurtma: <b>{order}</b>\n"
            "Iltimos, to'g'ri chekni qayta yuboring."
        ),
        "ru": (
            "❌ <b>Чек отклонён</b>\n" + SEP + "\n\n"
            "🧾 Заказ: <b>{order}</b>\n"
            "Пожалуйста, отправьте правильный чек ещё раз."
        ),
    },

    # ── Baholash ──
    "rate_ask": {
        "uz": "⭐ <b>{order} buyurtmangiz qanday bo'ldi?</b>\n\n{scope}<i>Bahoingiz ilovada boshqa xaridorlarga yordam beradi.</i>",
        "ru": "⭐ <b>Как вам заказ {order}?</b>\n\n{scope}<i>Ваша оценка поможет другим покупателям в приложении.</i>",
    },
    "rate_scope": {
        "uz": "Bitta baho — buyurtmadagi {count} ta mahsulotning hammasiga qo'yiladi.\n\n",
        "ru": "Одна оценка — сразу для всех {count} товаров заказа.\n\n",
    },
    "rate_skip": {"uz": "O'tkazib yuborish", "ru": "Пропустить"},
    "rate_skipped": {"uz": "O'tkazib yuborildi", "ru": "Пропущено"},
    "rate_thanks": {"uz": "Rahmat!", "ru": "Спасибо!"},
    "rate_not_yours": {
        "uz": "Bu buyurtma sizniki emas",
        "ru": "Это не ваш заказ",
    },
    "rate_failed": {
        "uz": "Baho saqlanmadi — ilovada qoldirishingiz mumkin",
        "ru": "Оценка не сохранилась — можно оставить её в приложении",
    },
    "rate_done_some": {
        "uz": "{count} ta mahsulotga <b>{stars}</b> qo'yildi.\nBaholaringiz mahsulot sahifasida ko'rinadi va boshqa xaridorlarga yordam beradi.",
        "ru": "Оценка <b>{stars}</b> поставлена {count} товарам.\nОна появится на странице товара и поможет другим покупателям.",
    },
    "rate_done_one": {
        "uz": "Mahsulotga <b>{stars}</b> qo'yildi.\nBaholaringiz mahsulot sahifasida ko'rinadi va boshqa xaridorlarga yordam beradi.",
        "ru": "Товару поставлена оценка <b>{stars}</b>.\nОна появится на странице товара и поможет другим покупателям.",
    },
    "rate_none": {
        "uz": "Baho qoldirmadingiz — zarari yo'q.\nXohlasangiz, keyinroq ilovadagi mahsulot sahifasidan baholashingiz mumkin.",
        "ru": "Вы не оставили оценку — ничего страшного.\nПри желании оцените позже на странице товара в приложении.",
    },
    "thanks_title": {"uz": "💚 <b>Rahmat!</b>", "ru": "💚 <b>Спасибо!</b>"},

    # ── Holat o'zgarishi (kuryer tugmalari) ──
    "status_delivering": {
        "uz": "🚚 <b>{order}</b> buyurtmangiz yo'lga chiqdi. Kuryer tez orada bog'lanadi.",
        "ru": "🚚 Ваш заказ <b>{order}</b> в пути. Курьер скоро свяжется с вами.",
    },
    "status_delivered": {
        "uz": "🎉 <b>{order}</b> buyurtmangiz yetkazildi. Xaridingiz uchun rahmat!",
        "ru": "🎉 Ваш заказ <b>{order}</b> доставлен. Спасибо за покупку!",
    },
    "notif_status_title": {"uz": "Buyurtma holati", "ru": "Статус заказа"},

    # ── Tashlab ketilgan savat ──
    "cart_left": {
        "uz": (
            "🛒 <b>Savatingiz kutib turibdi</b>\n\n"
            "{count} ta mahsulot hali buyurtma qilinmadi.\n"
            "Mahsulotlar tez tugaydi — hozir rasmiylashtirsangiz, "
            "bugunoq yetkazib beramiz.\n\n"
            "👇 Savatni ochib, buyurtmani yakunlang:"
        ),
        "ru": (
            "🛒 <b>Ваша корзина ждёт</b>\n\n"
            "{count} товаров ещё не заказаны.\n"
            "Товары быстро разбирают — оформите сейчас, "
            "и доставим сегодня же.\n\n"
            "👇 Откройте корзину и завершите заказ:"
        ),
    },
    "cart_button": {"uz": "🛒 Savatni ochish", "ru": "🛒 Открыть корзину"},
}


# ── Holat nomlari ─────────────────────────────────────────────
# Bazada holat har doim o'zbekcha saqlanadi; bu yerda faqat mijozga
# ko'rsatish uchun tarjima qilinadi. Ruscha variantlar ilovadagi
# `src/i18n/ru.ts` dagi «status.*» bilan bir xil.
STATUS_NAMES = {
    "Yangi": {"uz": "Yangi", "ru": "Новый"},
    "Qabul qilindi": {"uz": "Qabul qilindi", "ru": "Принят"},
    "Yetkazilmoqda": {"uz": "Yetkazilmoqda", "ru": "Доставляется"},
    "Yetkazildi": {"uz": "Yetkazildi", "ru": "Доставлен"},
    "Bekor qilingan": {"uz": "Bekor qilingan", "ru": "Отменён"},
    "Rad etildi": {"uz": "Rad etildi", "ru": "Отклонён"},
}


def status_name(status: str, lang: str = DEFAULT) -> str:
    """Noma'lum holat bo'lsa — bazadagi qiymatning o'zi."""
    return STATUS_NAMES.get(status, {}).get(normalize(lang), status)


def t(key: str, lang: str = DEFAULT, **kwargs) -> str:
    """Kalit bo'yicha matn. Noma'lum til — o'zbekcha."""
    text = TEXTS[key][normalize(lang)]
    return text.format(**kwargs) if kwargs else text


# ─── Otziv: rasm va fikr guruhga (api/_lib/actions/reviews.ts so'rovi) ───
TEXTS.update({
    "fb_ask": {
        "uz": (
            "📸 Mahsulot rasmini yuboring — xohlasangiz rasm tagiga fikringizni ham yozing.\n\n"
            "<i>Rasm guruhimizga ismingiz bilan joylanadi.</i>"
        ),
        "ru": (
            "📸 Отправьте фото товара — при желании добавьте к нему свой отзыв.\n\n"
            "<i>Фото будет опубликовано в нашей группе с вашим именем.</i>"
        ),
    },
    "fb_cancel_btn": {"uz": "❌ Bekor qilish", "ru": "❌ Отмена"},
    "fb_cancelled": {"uz": "Mayli, boshqa safar 😊", "ru": "Хорошо, в другой раз 😊"},
    "fb_done": {
        "uz": "💚 Rahmat! Fikringiz guruhimizga joylandi.",
        "ru": "💚 Спасибо! Ваш отзыв опубликован в нашей группе.",
    },
    "fb_done_admin": {
        "uz": "💚 Rahmat! Fikringiz bizga yetib keldi.",
        "ru": "💚 Спасибо! Ваш отзыв получен.",
    },
    "fb_view_btn": {"uz": "👀 Guruhda ko'rish", "ru": "👀 Посмотреть в группе"},
    "fb_media_only": {
        "uz": "Iltimos, rasm yoki fikringizni matn qilib yuboring 🙏",
        "ru": "Пожалуйста, отправьте фото или текст отзыва 🙏",
    },
    "fb_too_soon": {
        "uz": "Fikringiz allaqachon joylandi, rahmat! 💚 Birozdan keyin yana yuborishingiz mumkin.",
        "ru": "Ваш отзыв уже опубликован, спасибо! 💚 Можно отправить ещё чуть позже.",
    },
})
