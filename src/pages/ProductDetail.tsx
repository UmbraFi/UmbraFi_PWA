import { useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Heart,
  MessageCircle,
  Package,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Star,
  Wallet,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'

import AvatarDisplay from '../components/AvatarDisplay'
import ProductCard from '../components/ProductCard'
import StackHeader from '../components/StackHeader'
import { useOnChainProfile } from '../hooks/useOnChainProfile'
import { useSafeBack } from '../hooks/useSafeBack'
import { useSwipeNavigation } from '../hooks/useSwipeNavigation'
import { APP_ROUTE_PATHS, toSellerPath } from '../navigation/paths'
import { upsertProductThread } from '../services/chatThreads'
import { useStore } from '../store/useStore'
import { useWalletStore } from '../store/useWalletStore'
import { getSellerAgentRating, type SellerAgentMetric } from '../utils/sellerAgentRating'

function formatRelativeTime(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Recently listed'

  const diffMs = Date.now() - timestamp
  const hours = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60)))

  if (hours < 24) return `${hours}h ago`

  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

function formatDate(value: string) {
  const timestamp = new Date(value).getTime()
  if (!Number.isFinite(timestamp)) return 'Unknown date'

  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(timestamp))
}

function QuickActionButton({
  label,
  hint,
  icon,
  onClick,
  active = false,
}: {
  label: string
  hint: string
  icon: ReactNode
  onClick: () => void
  active?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tap-feedback rounded-[22px] border px-3 py-3.5 text-left transition-transform active:scale-[0.98] ${
        active
          ? 'border-[var(--color-accent)] bg-[color-mix(in_srgb,var(--color-accent)_18%,white)]'
          : 'border-black/5 bg-[var(--color-surface)] hover:bg-black/[0.02]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
            active ? 'bg-[var(--color-accent)] text-[var(--color-accent-active)]' : 'bg-black/[0.04] text-[var(--color-text)]'
          }`}
        >
          {icon}
        </span>
        <ChevronRight size={16} className="text-[var(--color-text-secondary)]" />
      </div>
      <p className="mt-3 text-sm font-medium text-[var(--color-text)]">{label}</p>
      <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">{hint}</p>
    </button>
  )
}

function AgentMetricCard({ metric }: { metric: SellerAgentMetric }) {
  return (
    <div className="rounded-[22px] border border-black/5 bg-black/[0.02] p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
          {metric.label}
        </p>
        <p className="text-right text-sm font-semibold text-[var(--color-text)]">{metric.valueLabel}</p>
      </div>
      <p className="mt-2 text-[11px] leading-5 text-[var(--color-text-secondary)]">{metric.detail}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent),#8CF6D2)]"
          style={{ width: `${metric.score}%` }}
        />
      </div>
    </div>
  )
}

export default function ProductDetail() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const navigate = useNavigate()

  const products = useStore((state) => state.products)
  const addToCart = useStore((state) => state.addToCart)
  const favorites = useStore((state) => state.favorites)
  const toggleFavorite = useStore((state) => state.toggleFavorite)
  const addToHistory = useStore((state) => state.addToHistory)
  const buyerPubkey = useWalletStore((state) => state.publicKey)
  const product = products.find((item) => item.id === id)
  const isFavorited = id ? favorites.includes(id) : false
  const [imageLoaded, setImageLoaded] = useState(false)
  const fromPath = `${location.pathname}${location.search}`

  useEffect(() => {
    if (id) addToHistory(id)
  }, [id, addToHistory])

  useEffect(() => {
    setImageLoaded(false)
  }, [product?.image])

  const sellerProducts = useMemo(
    () => (product ? products.filter((item) => item.seller === product.seller) : []),
    [product, products],
  )

  const otherSellerProducts = useMemo(
    () => sellerProducts.filter((item) => item.id !== product?.id).slice(0, 4),
    [product?.id, sellerProducts],
  )

  const sellerVolume = useMemo(
    () => sellerProducts.reduce((sum, item) => sum + item.price, 0).toFixed(1),
    [sellerProducts],
  )

  const sellerAverageReputation = useMemo(() => {
    if (sellerProducts.length === 0) return 0

    return Math.round(
      sellerProducts.reduce((sum, item) => sum + item.sellerReputation, 0) / sellerProducts.length,
    )
  }, [sellerProducts])

  const agentRating = useMemo(
    () => (product ? getSellerAgentRating(product.seller, sellerProducts) : null),
    [product, sellerProducts],
  )

  const { profile: sellerProfile } = useOnChainProfile(product?.seller ?? null)

  const deliveryPreview = useMemo(() => {
    if (!product) return ''

    const countries = product.deliverableCountries.slice(0, 3)
    const remaining = product.deliverableCountries.length - countries.length
    return remaining > 0 ? `${countries.join(' · ')} +${remaining}` : countries.join(' · ')
  }, [product])

  const goToSeller = () => {
    if (!product) return

    navigate(toSellerPath(product.seller), {
      state: { from: fromPath },
    })
  }

  const handleAddToCart = () => {
    if (!product) return
    addToCart(product)
  }

  const handleBuyNow = () => {
    if (!product) return
    addToCart(product)
    navigate(APP_ROUTE_PATHS.cart, { state: { from: fromPath } })
  }

  const handleChatSeller = () => {
    if (!product) return
    const sellerPubkey = product.sellerPubkey || product.seller

    if (buyerPubkey && isLikelySolanaPubkey(sellerPubkey)) {
      const thread = upsertProductThread(product, buyerPubkey)
      navigate(`/chat/${thread.id}`, {
        state: {
          from: fromPath,
          peerPubKey: thread.peerPubKey,
          orderID: thread.orderID,
        },
      })
      return
    }

    navigate(APP_ROUTE_PATHS.messages, {
      state: {
        from: fromPath,
        sellerId: product.seller,
        productId: product.id,
        productName: product.name,
      },
    })
  }

  const goBack = useSafeBack(APP_ROUTE_PATHS.home)

  useSwipeNavigation({
    onSwipeLeft: goToSeller,
  })

  if (!product || !agentRating) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-sm text-[var(--color-text-secondary)]">Product not found</p>
        <Link to={APP_ROUTE_PATHS.discover} className="btn-primary mt-4 rounded-lg px-6 py-2.5 text-sm">
          Browse Items
        </Link>
      </div>
    )
  }

  const sellerDisplayName = sellerProfile?.displayName || product.seller

  return (
    <div className="max-w-lg mx-auto pb-36" data-allow-horizontal-swipe="true">
      <StackHeader title="Product" onBack={goBack} bleed />

      <div className="space-y-4 px-1 pb-6">
        <div className="relative overflow-hidden rounded-[30px] bg-[#0A0A0A] shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
          <img
            src={product.image}
            alt={product.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            onLoad={() => setImageLoaded(true)}
            className={`w-full aspect-[4/5] object-cover transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {!imageLoaded && <div className="absolute inset-0 animate-pulse bg-neutral-900" />}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-black/15" />

          <div className="absolute inset-x-4 top-4 flex items-start justify-between gap-3">
            <div className="flex max-w-[75%] flex-wrap gap-2">
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                {product.category}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                Listed {formatRelativeTime(product.listedAt)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => toggleFavorite(product.id)}
              aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              className={`tap-feedback flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-sm transition-colors ${
                isFavorited
                  ? 'border-red-400/40 bg-red-500 text-white'
                  : 'border-white/15 bg-black/30 text-white'
              }`}
            >
              <Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="absolute inset-x-4 bottom-4 space-y-3 text-white">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-accent)]/25 bg-[color-mix(in_srgb,var(--color-accent)_22%,black)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
                <ShieldCheck size={13} />
                {agentRating.grade} Agent Rating
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium backdrop-blur-sm">
                Score {agentRating.overallScore}/100
              </span>
            </div>

            <div className="rounded-[28px] border border-white/12 bg-white/10 p-4 backdrop-blur-md">
              <p className="text-[11px] uppercase tracking-[0.22em] text-white/60">{product.brand}</p>
              <h1 className="mt-2 text-[28px] font-semibold leading-tight">{product.name}</h1>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2 text-[11px] text-white/75">
                  {product.size && (
                    <span className="rounded-full bg-white/10 px-3 py-1.5">Size {product.size}</span>
                  )}
                  <span className="rounded-full bg-white/10 px-3 py-1.5">{product.condition}</span>
                  <span className="rounded-full bg-white/10 px-3 py-1.5">Quality {product.qualityScore}/100</span>
                </div>
                <p className="text-2xl font-semibold font-mono-accent">{product.price} SOL</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                Listing Snapshot
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--color-text-secondary)]">{product.description}</p>
            </div>
            <div className="shrink-0 rounded-2xl bg-black/[0.03] px-3 py-2 text-right">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Created</p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">{formatDate(product.listedAt)}</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            <QuickActionButton
              label={isFavorited ? 'Saved' : 'Favorite'}
              hint="Collect this listing for later"
              icon={<Heart size={18} fill={isFavorited ? 'currentColor' : 'none'} />}
              onClick={() => toggleFavorite(product.id)}
              active={isFavorited}
            />
            <QuickActionButton
              label="Seller Page"
              hint="Open profile, listings, and stats"
              icon={<ArrowUpRight size={18} />}
              onClick={goToSeller}
            />
            <QuickActionButton
              label="Chat Seller"
              hint="Jump into transaction messages"
              icon={<MessageCircle size={18} />}
              onClick={handleChatSeller}
            />
          </div>
        </div>

        <div className="rounded-[30px] bg-[linear-gradient(135deg,rgba(127,255,206,0.24),rgba(255,255,255,0.98),rgba(17,24,39,0.03))] p-[1px] shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="rounded-[29px] bg-white/96 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                  <Sparkles size={13} className="text-[var(--color-accent)]" />
                  Seller Agent Rating
                </p>
                <h2 className="mt-2 text-lg font-semibold text-[var(--color-text)]">AI trust snapshot for this address</h2>
                <p className="mt-2 max-w-[28rem] text-sm leading-7 text-[var(--color-text-secondary)]">
                  {agentRating.summary}
                </p>
              </div>

              <div className="shrink-0 rounded-[24px] bg-[#0A0A0A] px-4 py-3 text-center text-white">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/50">{agentRating.grade}</p>
                <p className="mt-1 text-[28px] font-semibold font-mono-accent leading-none">{agentRating.overallScore}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/50">/ 100</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-black/5 bg-black/[0.03] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text)]">
                {agentRating.confidenceLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-black/[0.03] px-3 py-1.5 text-[11px] font-medium text-[var(--color-text-secondary)]">
                <CalendarDays size={12} />
                Rated on {agentRating.ratedAt}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {agentRating.metrics.map((metric) => (
                <AgentMetricCard key={metric.key} metric={metric} />
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={goToSeller}
          className="tap-feedback w-full rounded-[28px] border border-black/5 bg-white p-4 text-left shadow-[0_12px_30px_rgba(15,23,42,0.06)]"
        >
          <div className="flex items-center gap-3">
            <div className="rounded-full ring-2 ring-black/5">
              <AvatarDisplay
                avatar={sellerProfile?.avatar ?? null}
                fallbackInitials={sellerDisplayName.slice(0, 2)}
                size={56}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">Seller Profile</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="truncate text-base font-semibold font-mono-accent text-[var(--color-text)]">
                  {sellerDisplayName}
                </p>
                <ArrowUpRight size={16} className="shrink-0 text-[var(--color-text-secondary)]" />
              </div>
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                Swipe left or tap to open the seller storefront
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {[
              { label: 'Listings', value: sellerProducts.length },
              { label: 'Volume', value: `${sellerVolume} SOL` },
              { label: 'Rep', value: `${sellerAverageReputation}/100` },
            ].map((stat) => (
              <div key={stat.label} className="rounded-[18px] bg-black/[0.03] px-3 py-3 text-center">
                <p className="text-sm font-semibold font-mono-accent text-[var(--color-text)]">{stat.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <Package size={16} />
              <p className="text-sm font-medium">Fulfillment</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text)]">Ships from {product.shipFromCountry}</p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">
              Delivers to {deliveryPreview}
            </p>
          </div>

          <div className="rounded-[26px] border border-black/5 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]">
            <div className="flex items-center gap-2 text-[var(--color-text)]">
              <Star size={16} />
              <p className="text-sm font-medium">Item Signal</p>
            </div>
            <p className="mt-3 text-sm leading-6 text-[var(--color-text)]">
              {product.condition}{product.size ? ` · Size ${product.size}` : ''}
            </p>
            <p className="mt-1 text-[11px] leading-5 text-[var(--color-text-secondary)]">
              Quality score {product.qualityScore}/100 from listing metadata
            </p>
          </div>
        </div>

        {otherSellerProducts.length > 0 && (
          <section className="rounded-[28px] border border-black/5 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--color-text-secondary)]">
                  More from seller
                </p>
                <h2 className="mt-1 text-base font-semibold text-[var(--color-text)]">
                  Explore other items by {sellerDisplayName}
                </h2>
              </div>
              <button
                type="button"
                onClick={goToSeller}
                className="tap-feedback inline-flex items-center gap-1 text-sm font-medium text-[var(--color-text)]"
              >
                View all
                <ArrowUpRight size={15} />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {otherSellerProducts.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div className="max-w-lg mx-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="pointer-events-auto rounded-[28px] border border-black/5 bg-white/92 p-3 shadow-[0_-12px_40px_rgba(15,23,42,0.14)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAddToCart}
                className="tap-feedback flex-1 rounded-[20px] border border-black/8 px-4 py-3.5 text-sm font-medium text-[var(--color-text)] transition-transform active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-2">
                  <ShoppingCart size={17} />
                  Add to cart
                </span>
              </button>

              <button
                type="button"
                onClick={handleBuyNow}
                className="btn-primary tap-feedback flex-1 rounded-[20px] px-4 py-3.5 text-sm font-medium transition-transform active:scale-[0.98]"
              >
                <span className="inline-flex items-center gap-2">
                  <Wallet size={17} />
                  Buy now
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function isLikelySolanaPubkey(value: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)
}
