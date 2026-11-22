import { PromoBanner } from '../components/promo/PromoBanner'
import type { Promotion } from '../utils/promotions'
import { ArrowUpRight, Bell, Heart, Search, SlidersHorizontal, SprayCan } from 'lucide-react'
// TODO(AQUA): mahsulotlar fotosi kelganda almashtiriladi — hozircha logo
import heroProducts from '../images/aqua-mark.png'
import { BrandLogo } from '../components/brand/BrandLogo'
import { ProductCard } from '../components/product/ProductCard'
import { ProductRowSkeleton } from '../components/ui/ProductCardSkeleton'
import { IconButton } from '../components/ui/IconButton'
import { categoryIcon } from '../utils/category-icons'
import { MAIN_LINES, categoryLabel, isMainLine } from '../config/categories'
import { useMemo, useRef } from 'react'
import { useAutoScroll } from '../hooks/use-auto-scroll'
import { useReveal } from '../hooks/use-reveal'
import { useI18n, useT } from '../i18n'
import { HeroCarousel } from '../components/home/HeroCarousel'
import { HeroSlide } from '../components/home/HeroSlide'
import type { HomeBanner } from '../config/banners'
import { openExternalLink } from '../utils/telegram'
import type { AppPage, Category, Product, ProductActions } from '../types/domain'
import { FreeDeliveryBanner } from '../components/promo/FreeDeliveryTimer'
import { GiveawayCard } from '../components/promo/GiveawayCard'

/** Admin «Mashhur» belgilamagan bo'lsa — bosh sahifada shuncha yangi mahsulot. */
const NEW_ARRIVALS = 6

type Props = ProductActions & {
  products: Product[]
  categories: Category[]
  loading: boolean
  onSearch: () => void
  onNavigate: (page: AppPage) => void
  /** Hozir ishlayotgan vaqtli aksiyalar (katta chegirmasi birinchi). */
  promotions: Promotion[]
  onOpenCategory: (category: string) => void
  unreadNotificationsCount: number
  /** Admin qo'shgan bannerlar — asosiy bannerdan keyin karuselda. */
  banners: HomeBanner[]
  onOpenSection: (id: string) => void
  onOpenProduct: (id: string) => void
  /** «Yetkazib berish bepul» bannerini bosganda (savat yoki katalog). */
  onTimerShop: () => void
  /** Konkurs kartasi — taklif havolasi uchun (Telegram ID). */
  userId: number | null
}

export function HomePage({
  products, categories, loading, promotions, onSearch, onNavigate,
  onOpenCategory, unreadNotificationsCount, banners, onOpenSection, onOpenProduct, onTimerShop, userId, ...productActions
}: Props) {
  const t = useT()
  const { lang } = useI18n()

  // Ikkala lenta ham sekin o'ziga surilib turadi (karusel)
  const stripRef = useRef<HTMLDivElement>(null)
  useAutoScroll(stripRef, { speed: 16, enabled: categories.length > 3 })
  /*
   * Faqat admin «Mashhur» deb belgilaganlar, admin tartibida.
   * Hech biri belgilanmagan bo'lsa bo'lim ko'rsatilmaydi — tasodifiy
   * mahsulotlarni «mashhur» deb ko'rsatish mijozni chalg'itadi.
   */
  const popular = useMemo(
    () => products
      .filter((p) => p.popular)
      .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER)),
    [products],
  )
  /*
   * Bosh sahifa to'ri: admin belgilagan «Mashhur»lar, ular bo'lmasa —
   * eng yangi mahsulotlar (id — qo'shilgan vaqt bo'yicha o'sadi).
   */
  const featured = useMemo(
    () => (popular.length > 0
      ? popular
      : products.filter((p) => p.stock !== 0).sort((a, b) => b.id - a.id).slice(0, NEW_ARRIVALS)),
    [popular, products],
  )
  // Bo'limlar scroll qilinganda suzib chiqadi — mahsulotlar kelgach yangilari ham
  useReveal([loading, featured.length, categories.length])

  /** Banner bosilganda — admin tanlagan joy ochiladi. */
  const openBanner = (b: HomeBanner) => {
    if (b.target === 'catalog') onNavigate('catalog')
    else if (b.target === 'category') onOpenCategory(b.value)
    else if (b.target === 'section') onOpenSection(b.value)
    else if (b.target === 'product') onOpenProduct(b.value)
    else if (b.target === 'url' && /^https?:\/\//i.test(b.url)) openExternalLink(b.url)
  }

  // Asosiy banner — dengiz ko'ki fon, krem yozuv, o'ngda mahsulot fotosi
  const defaultHero = (
    <div className="hero-banner">
      <div className="hero-banner__inner">
        <span className="hero-glow" aria-hidden="true" />

        <div className="relative z-10 max-w-[60%] sm:max-w-[380px]">
          <span className="hero-badge">{t('home.heroBadge')}</span>
          <h2 className="hero-title">{t('home.heroTitle')}</h2>
          <p className="hero-sub">{t('home.heroSubtitle')}</p>
          <button onClick={() => onNavigate('catalog')} className="hero-cta">
            <span>{t('home.heroCta')}</span>
            <span className="hero-cta__arrow"><ArrowUpRight size={18} strokeWidth={2.4} /></span>
          </button>
        </div>

        <img
          className="hero-art"
          src={heroProducts}
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
        />
      </div>
    </div>
  )

  return (
    <>
      {/* Header */}
      {/* To'liq ekranda brend tepa panelga chiqadi, qidiruv esa shu qatorga
          ko'tariladi — bosh sahifada bitta qator tejaladi */}
      <header className="page-head home-head flex items-center justify-between gap-2 px-5 pt-7 sm:px-10">
        <BrandLogo size={44} className="home-head__brand" />
        <button onClick={onSearch} className="search-trigger page-head__search" style={{ color: 'var(--faint)' }}>
          <Search className="shrink-0" size={19} />
          <span className="truncate text-sm">{t('home.searchPlaceholder')}</span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <IconButton label={t('notifications.title')} onClick={() => onNavigate('notifications')}>
            <span className="relative">
              <Bell />
              {unreadNotificationsCount > 0 && (
                <span
                  className="absolute right-0 top-0 size-2.5 rounded-full border-2"
                  style={{ background: 'var(--danger)', borderColor: 'var(--surface)' }}
                />
              )}
            </span>
          </IconButton>
          {/* Savat pastdagi menyuga ko'chdi — tepada yurak qoldi.
              Ilgari savat faqat shu kichik ikonka edi va foydalanuvchilar
              uni topolmasdi. */}
          <IconButton label={t('favorites.title')} onClick={() => onNavigate('favorites')}>
            <Heart />
          </IconButton>
        </div>
      </header>

      {/* Search */}
      <section className="home-search px-5 pt-6 sm:px-10">
        <button
          onClick={onSearch}
          className="search-trigger"
          style={{ color: 'var(--faint)' }}
        >
          <Search className="shrink-0" size={20} />
          <span className="min-w-0 flex-1 truncate text-sm">{t('home.searchPlaceholder')}</span>
          <span className="search-trigger__filter" aria-hidden="true">
            <SlidersHorizontal size={19} />
          </span>
        </button>
      </section>

      {/* «Yetkazib berish bepul» — sanoq tugaguncha */}
      <FreeDeliveryBanner onShop={onTimerShop} />

      {/* Konkurs — admin → «Konkurs» */}
      <GiveawayCard userId={userId} products={products} />

      {/* Ishlayotgan aksiya — eng katta chegirmasi bilan */}
      {promotions[0] && (
        <section className="px-5 pt-4 sm:px-10" style={{ animation: 'fadeInUp 0.4s ease' }}>
          <PromoBanner
            promotion={promotions[0]}
            onOpen={() =>
              promotions[0].target === 'category' && promotions[0].targetIds[0]
                ? onOpenCategory(promotions[0].targetIds[0])
                : onNavigate('catalog')
            }
          />
        </section>
      )}

      {/* Hero: asosiy banner doim birinchi; admin qo'shgan bannerlar bo'lsa —
          karusel, har 5 soniyada o'ngga suriladi */}
      <section className="mx-5 mt-6 sm:mx-10">
        {banners.length > 0
          ? (
            <HeroCarousel
              slides={[
                defaultHero,
                ...banners.map((b) => <HeroSlide key={b.id} banner={b} lang={lang} onOpen={() => openBanner(b)} />),
              ]}
            />
          )
          : defaultHero}
      </section>

      {/* Asosiy yo'nalishlar — gorizontal kartochkalar: nomi chapda,
          rasm yoki ikonka o'ngda. Foto qo'yish uchun: MAIN_LINES dagi
          `image` maydonini to'ldiring (src/config/categories.ts). */}
      <section className="pt-7">
        <div className="section-head px-5 sm:px-10" data-reveal>
          <h2 className="section-title">{t('home.lines')}</h2>
          <button onClick={() => onNavigate('catalog')} className="see-all">{t('home.seeAll')}</button>
        </div>
        <div className="cat-row scrollbar-none">
          {MAIN_LINES.map((line, index) => {
            const Icon = categoryIcon(line.icon, line.name)
            return (
              <button
                key={line.name}
                onClick={() => onOpenCategory(line.name)}
                className="cat-chip"
                data-reveal
                style={{ ['--d' as string]: `${index * 70}ms` }}
              >
                <span className="cat-chip__name">{categoryLabel(line, lang)}</span>
                <span className="cat-chip__media" aria-hidden="true">
                  {line.image ? <img src={line.image} alt="" loading="lazy" /> : <Icon size={24} />}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* Kategoriyalar — bazadan, bosilganda katalog filtrlanadi.
          Yo'nalishlar yuqorida kartada turibdi, bu yerda takrorlanmaydi. */}
      {categories.some((c) => !isMainLine(c.name)) && (
        <section className="mt-5" data-reveal>
          <div ref={stripRef} className="category-strip category-strip--compact scrollbar-none">
            {categories.filter((c) => !isMainLine(c.name)).map((category) => {
              const Icon = categoryIcon(category.icon, category.name)
              return (
                <button
                  onClick={() => onOpenCategory(category.name)}
                  key={category.id}
                  className="category-card"
                >
                  <span className="category-icon-wrap">
                    <Icon size={22} />
                  </span>
                  <span className="category-label">{categoryLabel(category, lang)}</span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {/* Mahsulotlar to'ri: admin belgilagan «Mashhur»lar yoki eng yangilari */}
      <section className="px-5 pb-36 pt-7 sm:px-10">
        <div className="section-head" data-reveal>
          <h2 className="section-title">{popular.length > 0 ? t('home.popular') : t('home.newArrivals')}</h2>
          <button onClick={() => onNavigate('catalog')} className="see-all">{t('home.seeAll')}</button>
        </div>

        {loading ? (
          <ProductRowSkeleton />
        ) : featured.length > 0 ? (
          <div className="home-grid mt-4">
            {featured.map((product, index) => (
              <div key={product.id} className="min-w-0" data-reveal style={{ ['--d' as string]: `${Math.min(index, 5) * 70}ms` }}>
                <ProductCard product={product} {...productActions} />
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-card mt-5">
            <span className="empty-card__icon"><SprayCan size={30} /></span>
            <p className="mt-4 font-bold" style={{ color: 'var(--ink)' }}>{t('home.emptyTitle')}</p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>{t('home.emptyText')}</p>
          </div>
        )}
      </section>
    </>
  )
}
