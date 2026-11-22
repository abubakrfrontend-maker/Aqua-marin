import {
  ChevronDown,
  ChevronUp,
  Mail,
  MessageCircle,
  Phone,
  MapPin,
  ArrowLeft,
  Headphones,
  Clock,
  CheckCircle2,
  Package,
  Smartphone,
  Truck,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { BRAND } from '../config/brand'
import { DEFAULT_CONTACT, phoneHref, telegramHref, type ContactInfo } from '../config/contact'
import { subscribeToContact } from '../lib/firebase'
import { useI18n } from '../i18n'
import { toCyrillic } from '../i18n/cyrillic'
import { PageTitle } from '../components/layout/PageTitle'

type Props = {
  onBack: () => void
}

const faqs_uz = [
  {
    q: "Aqua Marin mahsulotlari nimasi bilan ajralib turadi?",
    a: "Aqua Marin — O‘zbekistonda mashhur maishiy kimyo va uy tozalash vositalari brendi. Kir yuvish, idish yuvish va uy tozalash uchun samarali va qulay narxdagi vositalar.",
  },
  {
    q: "Qanday mahsulotlar bor?",
    a: "Kir yuvish kukunlari va gellari, idish yuvish vositalari, pol, oyna va santexnika tozalagichlari. To‘liq ro‘yxat va hajmlar katalogda ko‘rsatilgan.",
  },
  {
    q: "Mahsulot qanday yetkaziladi?",
    a: "Toshkent bo‘ylab 24 soat ichida. Buyurtma holati o‘zgarganda sizga avtomatik bildirishnoma keladi.",
  },
  {
    q: "Vositalarni qanday saqlash kerak?",
    a: "Quruq, salqin va bolalar qo‘li yetmaydigan joyda, og‘zi yopiq holda saqlang. Qo‘llash usuli va ehtiyot choralari qadoqda yozilgan.",
  },
  {
    q: "Eng kam buyurtma miqdori bormi?",
    a: "Yo‘q, hatto bitta mahsulotdan ham buyurtma berishingiz mumkin. Katta summadagi buyurtmalar bepul yetkaziladi — summa rasmiylashtirish sahifasida ko‘rsatiladi.",
  },
  {
    q: "To‘lov qanday amalga oshiriladi?",
    a: "Naqd pul (yetkazishda) yoki karta orqali o‘tkazma. Karta orqali to‘lasangiz, chekni botga yuboring — operator tekshirib tasdiqlaydi.",
  },
  {
    q: "Ulgurji xarid yoki hamkorlik mumkinmi?",
    a: "Ha. Do‘kon, mehmonxona, ofis va distribyutorlar uchun alohida shartlar bor — quyidagi raqam yoki Telegram orqali bog‘laning.",
  },
  {
    q: "Promo kod qanday ishlatiladi?",
    a: "Buyurtma berish sahifasida «Promokod» maydoniga kodingizni kiriting va «Qo‘llash» tugmasini bosing. Chegirma avtomatik qo‘shiladi.",
  },
]

const faqs_ru = [
  {
    q: "Чем отличается продукция Aqua Marin?",
    a: "Aqua Marin — популярный в Узбекистане бренд бытовой химии и средств для уборки. Эффективные средства для стирки, мытья посуды и уборки дома по доступной цене.",
  },
  {
    q: "Какие есть продукты?",
    a: "Стиральные порошки и гели, средства для мытья посуды, очистители для пола, стёкол и сантехники. Полный список и объёмы указаны в каталоге.",
  },
  {
    q: "Как доставляется заказ?",
    a: "По Ташкенту — в течение 24 часов. При изменении статуса заказа вы получите уведомление.",
  },
  {
    q: "Как хранить средства?",
    a: "В сухом прохладном месте, недоступном для детей, в закрытой упаковке. Способ применения и меры предосторожности указаны на упаковке.",
  },
  {
    q: "Есть ли минимальный заказ?",
    a: "Нет, заказать можно даже один товар. Крупные заказы доставляются бесплатно — сумма указана на странице оформления.",
  },
  {
    q: "Как осуществляется оплата?",
    a: "Наличными при доставке или переводом на карту. При оплате картой отправьте чек боту — оператор проверит и подтвердит.",
  },
  {
    q: "Возможна ли оптовая закупка или сотрудничество?",
    a: "Да. Для магазинов, гостиниц, офисов и дистрибьюторов действуют отдельные условия — свяжитесь по телефону или в Telegram ниже.",
  },
  {
    q: "Как использовать промокод?",
    a: "На странице оформления заказа введите код в поле «Промокод» и нажмите «Применить». Скидка добавится автоматически.",
  },
]

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition active:opacity-70"
      >
        <span className="font-semibold text-sm leading-snug" style={{ color: 'var(--ink)' }}>
          {q}
        </span>
        <span className="shrink-0" style={{ color: 'var(--brand)' }}>
          {open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </span>
      </button>
      {open && (
        <div
          className="px-5 pb-4 text-sm leading-relaxed"
          style={{ color: 'var(--muted)' }}
        >
          {a}
        </div>
      )}
    </div>
  )
}

export function SupportPage({ onBack }: Props) {
  const { t, lang } = useI18n()
  // Ўзбекча (kirill) — o'zbekcha matnlar avtomatik o'giriladi
  const L = (text: string) => (lang === 'uzc' ? toCyrillic(text) : text)
  const faqs = lang === 'ru' ? faqs_ru : faqs_uz.map((f) => ({ q: L(f.q), a: L(f.a) }))
  // Aloqa ma'lumotlari admin paneldan (Sozlamalar → «Biz bilan aloqa»)
  const [contact, setContact] = useState<ContactInfo>(DEFAULT_CONTACT)
  useEffect(() => subscribeToContact(setContact), [])

  const contacts = [
    {
      id: 'phone',
      icon: Phone,
      label: lang === 'ru' ? 'Телефон' : L('Telefon'),
      value: contact.phone,
      href: phoneHref(contact.phone),
      color: 'var(--brand)',
      bg: 'var(--brand-soft)',
    },
    {
      id: 'telegram',
      icon: MessageCircle,
      label: 'Telegram',
      value: `@${contact.telegram}`,
      href: telegramHref(contact.telegram),
      color: '#0ea5e9',
      bg: 'rgba(14,165,233,0.12)',
    },
    {
      id: 'email',
      icon: Mail,
      label: 'Email',
      value: contact.email,
      href: `mailto:${contact.email}`,
      color: 'var(--gold)',
      bg: 'var(--gold-soft)',
    },
  ].filter((c) => c.value && c.value !== '@')

  const about = lang === 'ru'
    ? [
        { icon: Package, title: 'Широкий ассортимент', text: 'Средства для стирки, мытья посуды и уборки дома.' },
        { icon: Truck, title: 'Доставка до двери', text: 'Привезём заказ по Ташкенту прямо к вам домой.' },
        { icon: Smartphone, title: 'Заказ в Telegram', text: 'Без регистрации — всего в несколько нажатий.' },
      ]
    : [
        { icon: Package, title: 'Keng assortiment', text: 'Kir yuvish, idish yuvish va uy tozalash vositalari.' },
        { icon: Truck, title: 'Eshikkacha yetkazish', text: 'Toshkent bo‘ylab buyurtmangizni uyingizgacha olib boramiz.' },
        { icon: Smartphone, title: 'Telegram orqali buyurtma', text: 'Ro‘yxatdan o‘tishsiz — bir necha bosishda.' },
      ].map((a) => ({ ...a, title: L(a.title), text: L(a.text) }))

  const features = lang === 'ru'
    ? [
        { icon: Clock, text: `Приём заказов ${contact.workHours}` },
        { icon: CheckCircle2, text: 'Быстрый ответ' },
        { icon: MapPin, text: contact.address },
      ]
    : [
        { icon: Clock, text: `Buyurtmalar ${contact.workHours}` },
        { icon: CheckCircle2, text: 'Tez javob' },
        { icon: MapPin, text: contact.address },
      ].map((f) => ({ ...f, text: L(f.text) }))

  return (
    <>
      {/* Header */}
      <header
        className="page-head page-head--solo flex items-center gap-3 px-5 pt-8 pb-5 sm:px-10"
        style={{ animation: 'fadeInUp 0.3s ease' }}
      >
        <button
          onClick={onBack}
          className="back-button"
          aria-label={t('common.back')}
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <PageTitle className="text-2xl font-extrabold leading-tight" short={lang === 'ru' ? 'Поддержка' : L('Yordam')}>
            {lang === 'ru' ? 'Помощь и поддержка' : L("Yordam va qo'llab-quvvatlash")}
          </PageTitle>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            {lang === 'ru' ? 'Мы всегда рядом' : L("Biz doim siz bilan")}
          </p>
        </div>
      </header>

      {/* Hero Card */}
      <section className="px-5 sm:px-10" style={{ animation: 'fadeInUp 0.35s ease 0.05s both' }}>
        <div
          className="relative overflow-hidden rounded-3xl p-6"
          style={{
            background: 'linear-gradient(135deg, #0a447a 0%, #041c33 100%)',
          }}
        >
          {/* Decorative circles */}
          <div
            className="absolute -right-8 -top-8 size-32 rounded-full opacity-20"
            style={{ background: 'white' }}
          />
          <div
            className="absolute -bottom-6 right-10 size-20 rounded-full opacity-10"
            style={{ background: 'white' }}
          />

          <div className="relative z-10">
            <div
              className="inline-grid size-14 place-items-center rounded-2xl mb-4"
              style={{ background: 'rgba(255,255,255,0.2)' }}
            >
              <Headphones size={28} color="white" />
            </div>
            <h2 className="wordmark text-xl text-white leading-tight">
              {lang === 'ru' ? `Служба заботы ${BRAND.name}` : L(`${BRAND.name} mijozlar xizmati`)}
            </h2>
            <p className="mt-1.5 text-sm text-white opacity-80">
              {lang === 'ru'
                ? 'Свяжитесь с нами любым удобным способом'
                : L("Qulay usul orqali biz bilan bog'laning")}
            </p>

            {/* Feature badges */}
            <div className="mt-4 flex flex-wrap gap-2">
              {features.map(({ icon: Icon, text }) => (
                <span
                  key={text}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: 'rgba(255,255,255,0.18)', color: 'white' }}
                >
                  <Icon size={12} />
                  {text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Aloqa kartalari — admin hech narsa kiritmagan bo'lsa bo'lim ko'rinmaydi */}
      {contacts.length > 0 && (
      <section
        className="px-5 pt-6 sm:px-10"
        style={{ animation: 'fadeInUp 0.4s ease 0.1s both' }}
      >
        <h2 className="section-title mb-4">
          {lang === 'ru' ? 'Контакты' : L("Bog'lanish")}
        </h2>
        <div className="flex flex-col gap-3">
          {contacts.map(({ id, icon: Icon, label, value, href, color, bg }) => (
            <a
              key={id}
              id={`support-contact-${id}`}
              href={href}
              target={id !== 'phone' ? '_blank' : undefined}
              rel="noreferrer"
              className="flex items-center gap-4 rounded-2xl border p-4 transition active:scale-[0.98] hover:opacity-90"
              style={{ borderColor: 'var(--line)', background: 'var(--surface)', textDecoration: 'none' }}
            >
              <span
                className="grid size-12 shrink-0 place-items-center rounded-2xl"
                style={{ background: bg, color }}
              >
                <Icon size={22} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {label}
                </p>
                <p className="mt-0.5 truncate font-bold text-sm" style={{ color: 'var(--ink)' }}>
                  {value}
                </p>
              </div>
              <span
                className="shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold"
                style={{ background: bg, color }}
              >
                {lang === 'ru' ? 'Написать' : L('Yozish')}
              </span>
            </a>
          ))}
        </div>
      </section>
      )}

      {/* Aqua Marin haqida */}
      <section
        className="px-5 pt-7 sm:px-10"
        style={{ animation: 'fadeInUp 0.4s ease 0.12s both' }}
      >
        <h2 className="section-title mb-4">
          {lang === 'ru' ? `О ${BRAND.name}` : L(`${BRAND.name} haqida`)}
        </h2>
        <div
          className="rounded-2xl border p-2"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          {about.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 p-3">
              <span
                className="grid size-10 shrink-0 place-items-center rounded-xl"
                style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
              >
                <Icon size={19} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold" style={{ color: 'var(--ink)' }}>{title}</p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section
        className="px-5 pt-7 pb-32 sm:px-10"
        style={{ animation: 'fadeInUp 0.4s ease 0.15s both' }}
      >
        <h2 className="section-title mb-4">
          {lang === 'ru' ? 'Часто задаваемые вопросы' : L("Ko'p so'raladigan savollar")}
        </h2>
        <div className="flex flex-col gap-3">
          {faqs.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>

        {/* Footer note */}
        <div
          className="mt-6 rounded-2xl border p-4 text-center"
          style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
            {lang === 'ru'
              ? 'Не нашли ответ? Напишите нам — мы ответим в течение нескольких минут.'
              : L("Javob topa olmadingizmi? Bizga yozing — bir necha daqiqa ichida javob beramiz.")}
          </p>
        </div>
      </section>
    </>
  )
}
