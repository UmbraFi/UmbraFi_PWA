import { useEffect, useState, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, X, Package, Truck, Sparkles, Plus, Bot, Check, Globe, Home, Zap, DollarSign, ChevronDown, Search, Archive, Clock, Gavel, Ticket } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { uploadImages } from '../services/ipfs'
import { createProduct, ProductSubmissionError } from '../services/products'
import { REGIONS } from '../data/regions'
import { useStore, type SellType } from '../store/useStore'
import { useWalletStore } from '../store/useWalletStore'
import { addDraft, readDrafts } from './Drafts'
import { getWalletItem, setWalletItem, removeWalletItem } from '../services/storage'
import { toProductPath } from '../navigation/paths'


type ShippingMethod = 'standard' | 'express' | 'pickup'
type ShippingRange = 'domestic' | 'regions'

interface ShippingRegionConfig {
  type: ShippingRange
  selectedRegions: string[]
  excludedCountries: string[]
}

type AuctionDuration = '1h' | '6h' | '12h' | '1d' | '3d' | '7d'

interface SellForm {
  description: string
  price: string
  shippingMethod: ShippingMethod
  shippingRegionConfig: ShippingRegionConfig
  // Auction fields
  startingBid: string
  reservePrice: string
  auctionDuration: AuctionDuration
  // Raffle fields
  raffleMinEntry: string
  raffleMaxEntry: string
}

const SELL_DRAFT_KEY = 'sell.draft'

const DEFAULT_REGION_CONFIG: ShippingRegionConfig = {
  type: 'domestic',
  selectedRegions: [],
  excludedCountries: [],
}

const DEFAULT_FORM: SellForm = {
  description: '',
  price: '',
  shippingMethod: 'standard',
  shippingRegionConfig: DEFAULT_REGION_CONFIG,
  startingBid: '',
  reservePrice: '',
  auctionDuration: '1d',
  raffleMinEntry: '',
  raffleMaxEntry: '',
}

const AUCTION_DURATIONS: { value: AuctionDuration; label: string }[] = [
  { value: '1h', label: '1h' },
  { value: '6h', label: '6h' },
  { value: '12h', label: '12h' },
  { value: '1d', label: '1d' },
  { value: '3d', label: '3d' },
  { value: '7d', label: '7d' },
]

const readSellDraft = (): SellForm => {
  try {
    const parsed = getWalletItem<Record<string, unknown> | null>(SELL_DRAFT_KEY, null)
    if (!parsed) return DEFAULT_FORM
    const regionConfig = parsed.shippingRegionConfig as Partial<ShippingRegionConfig> | undefined
    return {
      description: typeof parsed.description === 'string' ? parsed.description : '',
      price: typeof parsed.price === 'string' ? parsed.price : '',
      shippingMethod: (['standard', 'express', 'pickup'] as const).includes(parsed.shippingMethod as ShippingMethod)
        ? (parsed.shippingMethod as ShippingMethod)
        : 'standard',
      shippingRegionConfig: {
        type: regionConfig?.type === 'regions' ? 'regions' : 'domestic',
        selectedRegions: Array.isArray(regionConfig?.selectedRegions) ? regionConfig.selectedRegions : [],
        excludedCountries: Array.isArray(regionConfig?.excludedCountries) ? regionConfig.excludedCountries : [],
      },
      startingBid: typeof parsed.startingBid === 'string' ? parsed.startingBid : '',
      reservePrice: typeof parsed.reservePrice === 'string' ? parsed.reservePrice : '',
      auctionDuration: (['1h', '6h', '12h', '1d', '3d', '7d'] as const).includes(parsed.auctionDuration as AuctionDuration)
        ? (parsed.auctionDuration as AuctionDuration)
        : '1d',
      raffleMinEntry: typeof parsed.raffleMinEntry === 'string' ? parsed.raffleMinEntry : '',
      raffleMaxEntry: typeof parsed.raffleMaxEntry === 'string' ? parsed.raffleMaxEntry : '',
    }
  } catch {
    return DEFAULT_FORM
  }
}

const SHIPPING_METHODS: { value: ShippingMethod; label: string; icon: typeof Truck; desc: string }[] = [
  { value: 'standard', label: 'Standard', icon: Package, desc: 'Economy' },
  { value: 'express', label: 'Express', icon: Zap, desc: 'Fast' },
  { value: 'pickup', label: 'Pickup', icon: Home, desc: 'Local' },
]

export default function Sell() {
  const navigate = useNavigate()
  const [form, setForm] = useState<SellForm>(() => readSellDraft())
  const [photos, setPhotos] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [draftSaved, setDraftSaved] = useState(false)
  const [excludePanelOpen, setExcludePanelOpen] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sellType = useStore((s) => s.sellType)
  const setSellType = useStore((s) => s.setSellType)
  const setSellStep = useStore((s) => s.setSellStep)
  const addProduct = useStore((s) => s.addProduct)
  const publicKey = useWalletStore((s) => s.publicKey)

  const regionConfig = form.shippingRegionConfig

  // Compute and sync sell step: Photos(0) → Describe(1) → Price(2) → Shipping(3) → Submit(4)
  useEffect(() => {
    let step = 0
    if (photos.length >= 1) step = 1
    if (step >= 1 && form.description.trim().length > 0) step = 2
    if (step >= 2) {
      if (sellType === 'auction' && form.startingBid.trim().length > 0 && form.reservePrice.trim().length > 0) step = 3
      else if (sellType === 'raffle' && form.price.trim().length > 0 && form.raffleMinEntry.trim().length > 0 && form.raffleMaxEntry.trim().length > 0) step = 3
      else if (sellType === 'regular' && form.price.trim().length > 0) step = 3
    }
    if (step >= 3) step = 4
    setSellStep(step)
  }, [photos, form, sellType, setSellStep])

  const updateRegionConfig = (updates: Partial<ShippingRegionConfig>) => {
    setForm((prev) => ({
      ...prev,
      shippingRegionConfig: { ...prev.shippingRegionConfig, ...updates },
    }))
  }

  const toggleRegion = (regionId: string) => {
    const current = regionConfig.selectedRegions
    const next = current.includes(regionId)
      ? current.filter((r) => r !== regionId)
      : [...current, regionId]
    // Remove excluded countries that no longer belong to any selected region
    const nextRegionCountryCodes = new Set(
      REGIONS.filter((r) => next.includes(r.id)).flatMap((r) => r.countries.map((c) => c.code))
    )
    const nextExcluded = regionConfig.excludedCountries.filter((code) => nextRegionCountryCodes.has(code))
    updateRegionConfig({ selectedRegions: next, excludedCountries: nextExcluded })
  }

  const toggleExcludedCountry = (code: string) => {
    const current = regionConfig.excludedCountries
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code]
    updateRegionConfig({ excludedCountries: next })
  }

  const availableCountries = useMemo(() => {
    return REGIONS
      .filter((r) => regionConfig.selectedRegions.includes(r.id))
      .flatMap((r) => r.countries)
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [regionConfig.selectedRegions])

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return availableCountries
    const q = countrySearch.toLowerCase()
    return availableCountries.filter((c) => c.name.toLowerCase().includes(q))
  }, [availableCountries, countrySearch])

  const excludedCountryNames = useMemo(() => {
    const map = new Map(availableCountries.map((c) => [c.code, c.name]))
    return regionConfig.excludedCountries.map((code) => ({ code, name: map.get(code) || code }))
  }, [regionConfig.excludedCountries, availableCountries])

  // Load draft from Drafts page if requested
  useEffect(() => {
    const draftId = window.sessionStorage.getItem('umbrafi.sell.loadDraft')
    if (!draftId) return
    window.sessionStorage.removeItem('umbrafi.sell.loadDraft')
    const drafts = readDrafts()
    const draft = drafts.find((d) => d.id === draftId)
    if (draft) {
      // Switch to the correct sell type tab first
      if (draft.sellType) setSellType(draft.sellType)
      setForm(draft.form as SellForm)
      setPhotos(draft.photos)
    }
  }, [])

  useEffect(() => {
    try { setWalletItem(SELL_DRAFT_KEY, form) } catch { /* no wallet */ }
  }, [form])

  const handlePhotoAdd = () => {
    if (photos.length >= 3) return
    fileInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    const remaining = 3 - photos.length
    const toAdd = Array.from(files).slice(0, remaining)
    toAdd.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (ev) => {
        if (ev.target?.result) {
          setPhotos((prev) => (prev.length < 3 ? [...prev, ev.target!.result as string] : prev))
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index))
  }

  // Raffle entry validation: min 0.5% of price, max 10% of price
  const raffleEntryError = useMemo(() => {
    if (sellType !== 'raffle') return null
    const price = parseFloat(form.price)
    if (!price || price <= 0) return null
    const min = parseFloat(form.raffleMinEntry)
    const max = parseFloat(form.raffleMaxEntry)
    const floor = price * 0.005
    const ceiling = price * 0.1
    if (min && min < floor) return `Min entry must be at least ${floor.toFixed(2)} (0.5% of price)`
    if (min && min > ceiling) return `Min entry must not exceed ${ceiling.toFixed(2)} (10% of price)`
    if (max && max < floor) return `Max entry must be at least ${floor.toFixed(2)} (0.5% of price)`
    if (max && max > ceiling) return `Max entry must not exceed ${ceiling.toFixed(2)} (10% of price)`
    if (min && max && min > max) return 'Min entry cannot exceed max entry'
    return null
  }, [sellType, form.price, form.raffleMinEntry, form.raffleMaxEntry])

  const canSubmit = (() => {
    const hasPhotos = photos.length >= 1
    const hasDesc = form.description.trim().length > 0
    if (!hasPhotos || !hasDesc) return false
    if (sellType === 'auction') return form.startingBid.trim().length > 0 && form.reservePrice.trim().length > 0
    if (sellType === 'raffle') return form.price.trim().length > 0 && form.raffleMinEntry.trim().length > 0 && form.raffleMaxEntry.trim().length > 0 && !raffleEntryError
    return form.price.trim().length > 0
  })()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const productId = crypto.randomUUID()
      const cids = await uploadImages(productId, photos)
      const product = await createProduct({
        description: form.description,
        price: getSubmissionPrice(form, sellType),
        sellType,
        shippingMethod: form.shippingMethod,
        shippingRegionConfig: form.shippingRegionConfig,
        imageCids: cids,
        sellerPubkey: publicKey || '',
      })
      addProduct(product)
      try { removeWalletItem(SELL_DRAFT_KEY) } catch { /* ignore */ }
      setSubmitted(true)
      navigate(toProductPath(product.id), { state: { from: '/sell' }, replace: true })
    } catch (err) {
      console.error('Upload failed:', err)
      setSubmitError(
        err instanceof ProductSubmissionError
          ? err.message
          : (err as Error).message || 'Unable to publish listing',
      )
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm(DEFAULT_FORM)
    setPhotos([])
    setSubmitted(false)
  }

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto py-16 px-5 flex flex-col items-center text-center gap-5 pb-nav">
        {/* Pulsing agent icon */}
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl bg-[var(--color-accent)] flex items-center justify-center">
            <Bot size={36} className="text-[var(--color-accent-active)]" />
          </div>
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[var(--color-text)] flex items-center justify-center">
            <Check size={13} className="text-white" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Submitted to Agent</h2>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-[280px] leading-relaxed">
            Our AI agent is analyzing your photos and description. It will generate the title, category and tags automatically.
          </p>
        </div>

        {/* Status steps */}
        <div className="w-full max-w-[260px] mt-2 space-y-3">
          {['Analyzing photos', 'Generating listing', 'Publishing'].map((step, i) => (
            <div key={step} className="flex items-center gap-3">
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  backgroundColor: 'var(--color-accent)',
                  animation: `fadeIn 0.3s ease ${i * 0.4}s both`,
                }}
              >
                <Check size={11} className="text-[var(--color-accent-active)]" />
              </div>
              <span
                className="text-xs text-[var(--color-text-secondary)]"
                style={{ animation: `fadeIn 0.3s ease ${i * 0.4}s both` }}
              >
                {step}
              </span>
            </div>
          ))}
        </div>

        <button onClick={handleReset} className="btn-primary px-8 py-3 rounded-xl mt-4">
          List Another Item
        </button>
      </div>
    )
  }

  return (
    <div className="-mx-2 min-h-full bg-gray-100 rounded-t-2xl px-6 pt-[25px] pb-nav">
      {/* Photo Section */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <label className="text-xs font-medium text-[var(--color-text)]">
            Photos
          </label>
          <span className="text-[10px] text-[var(--color-text-secondary)]">{photos.length}/3</span>
        </div>

        {photos.length === 0 ? (
          /* Empty state - large capture area */
          <button
            type="button"
            onClick={handlePhotoAdd}
            className="w-full aspect-[2/1] rounded-2xl border-2 border-dashed border-gray-300 bg-white flex flex-col items-center justify-center gap-2 hover:border-gray-400 active:scale-[0.98] transition-all"
          >
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Camera size={22} className="text-[var(--color-text-secondary)]" />
            </div>
            <span className="text-xs text-[var(--color-text-secondary)] font-medium">
              Tap to take or choose photos
            </span>
            <span className="text-[10px] text-[var(--color-text-secondary)]">
              1-3 photos required
            </span>
          </button>
        ) : (
          /* Photos grid */
          <div className="flex gap-2">
            {photos.map((src, i) => (
              <div key={i} className="relative flex-1 aspect-square rounded-xl overflow-hidden bg-gray-100">
                <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removePhoto(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            ))}
            {photos.length < 3 && (
              <button
                type="button"
                onClick={handlePhotoAdd}
                className="flex-1 aspect-square rounded-xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-0.5 hover:border-gray-400 active:scale-95 transition-all"
              >
                <Plus size={18} className="text-[var(--color-text-secondary)]" />
                <span className="text-[9px] text-[var(--color-text-secondary)]">Add</span>
              </button>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
            Description
          </label>
          <textarea
            required
            rows={3}
            value={form.description}
            onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
            className="w-full px-3.5 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] resize-none leading-relaxed transition-colors"
            placeholder="e.g. iPhone 15 Pro, 256GB, Natural Titanium, mint condition, includes original box..."
          />
          <p className="text-[10px] text-[var(--color-text-secondary)] mt-1 flex items-center gap-1">
            <Sparkles size={9} />
            Agent will extract title, category & tags from your description
          </p>
        </div>

        {/* Price / Auction / Raffle fields */}
        {sellType === 'auction' ? (
          <>
            {/* Starting Bid */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                Starting Bid
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                  <Gavel size={14} />
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.startingBid}
                  onChange={(e) => setForm((prev) => ({ ...prev, startingBid: e.target.value }))}
                  className="w-full pl-9 pr-3.5 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Starting bid amount"
                />
              </div>
            </div>

            {/* Reserve Price */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                Reserve Price
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                  <DollarSign size={14} />
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.reservePrice}
                  onChange={(e) => setForm((prev) => ({ ...prev, reservePrice: e.target.value }))}
                  className="w-full pl-9 pr-3.5 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Minimum price to sell"
                />
              </div>
              <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                Item won't sell below this price
              </p>
            </div>

            {/* Auction Duration */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-2">
                Auction Duration
              </label>
              <div className="flex gap-2">
                {AUCTION_DURATIONS.map((d) => {
                  const active = form.auctionDuration === d.value
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, auctionDuration: d.value }))}
                      className={`flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-medium transition-all border ${
                        active
                          ? 'bg-[var(--color-text)] text-white border-[var(--color-text)]'
                          : 'bg-white text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {active && <Clock size={12} />}
                      <span>{d.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </>
        ) : sellType === 'raffle' ? (
          <>
            {/* Item Price */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                Item Price
              </label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                  <DollarSign size={14} />
                </div>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                  className="w-full pl-9 pr-3.5 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Raffle Entry Range */}
            <div>
              <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
                Entry Price Range
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                    <Ticket size={13} />
                  </div>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.raffleMinEntry}
                    onChange={(e) => setForm((prev) => ({ ...prev, raffleMinEntry: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Min"
                  />
                </div>
                <span className="flex items-center text-[var(--color-text-secondary)] text-xs">–</span>
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                    <Ticket size={13} />
                  </div>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={form.raffleMaxEntry}
                    onChange={(e) => setForm((prev) => ({ ...prev, raffleMaxEntry: e.target.value }))}
                    className="w-full pl-8 pr-3 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="Max"
                  />
                </div>
              </div>
              {form.price && parseFloat(form.price) > 0 && (
                <p className="text-[10px] text-[var(--color-text-secondary)] mt-1">
                  Range: ${(parseFloat(form.price) * 0.005).toFixed(2)} – ${(parseFloat(form.price) * 0.1).toFixed(2)} (0.5%–10% of price)
                </p>
              )}
              {raffleEntryError && (
                <p className="text-[10px] text-red-500 mt-1">{raffleEntryError}</p>
              )}
            </div>
          </>
        ) : (
          /* Regular Price */
          <div>
            <label className="block text-xs font-medium text-[var(--color-text)] mb-1.5">
              Price
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                <DollarSign size={14} />
              </div>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full pl-9 pr-3.5 py-3 text-sm bg-white rounded-xl border border-gray-200 focus:outline-none focus:border-[var(--color-text)] transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        {/* Shipping Method */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text)] mb-2">
            Shipping method
          </label>
          <div className="grid grid-cols-3 gap-2">
            {SHIPPING_METHODS.map((m) => {
              const Icon = m.icon
              const active = form.shippingMethod === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, shippingMethod: m.value }))}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all border ${
                    active
                      ? 'bg-[var(--color-text)] text-white border-[var(--color-text)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Shipping Range */}
        <div>
          <label className="block text-xs font-medium text-[var(--color-text)] mb-2">
            Shipping range
          </label>

          {/* Top level: Domestic | Select Regions */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { value: 'domestic' as const, label: 'Domestic', icon: Home },
              { value: 'regions' as const, label: 'Select Regions', icon: Globe },
            ]).map((opt) => {
              const Icon = opt.icon
              const active = regionConfig.type === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateRegionConfig({ type: opt.value })}
                  className={`flex flex-col items-center gap-1.5 py-3 rounded-xl text-xs font-medium transition-all border ${
                    active
                      ? 'bg-[var(--color-text)] text-white border-[var(--color-text)]'
                      : 'bg-white text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <Icon size={16} />
                  <span>{opt.label}</span>
                </button>
              )
            })}
          </div>

          {/* Region chips */}
          <AnimatePresence>
            {regionConfig.type === 'regions' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap gap-2 mt-3">
                  {REGIONS.map((region) => {
                    const active = regionConfig.selectedRegions.includes(region.id)
                    return (
                      <button
                        key={region.id}
                        type="button"
                        onClick={() => toggleRegion(region.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                          active
                            ? 'bg-[var(--color-text)] text-white border-[var(--color-text)]'
                            : 'bg-white text-[var(--color-text-secondary)] border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {region.label}
                      </button>
                    )
                  })}
                </div>

                {/* Excluded country tags */}
                {excludedCountryNames.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {excludedCountryNames.map((c) => (
                      <span
                        key={c.code}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-50 text-red-600 text-[10px] font-medium border border-red-200"
                      >
                        {c.name}
                        <button type="button" onClick={() => toggleExcludedCountry(c.code)} className="hover:text-red-800">
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Exclude countries toggle */}
                {regionConfig.selectedRegions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => { setExcludePanelOpen((v) => !v); setCountrySearch('') }}
                    className="flex items-center gap-1 mt-2 text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-text)] transition-colors"
                  >
                    <ChevronDown size={12} className={`transition-transform ${excludePanelOpen ? 'rotate-180' : ''}`} />
                    Exclude countries
                  </button>
                )}

                {/* Country exclusion panel */}
                <AnimatePresence>
                  {excludePanelOpen && regionConfig.selectedRegions.length > 0 && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 border border-gray-200 rounded-xl bg-gray-50 overflow-hidden">
                        {/* Search */}
                        <div className="relative border-b border-gray-200">
                          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
                          <input
                            type="text"
                            value={countrySearch}
                            onChange={(e) => setCountrySearch(e.target.value)}
                            placeholder="Search countries..."
                            className="w-full pl-8 pr-3 py-2.5 text-xs bg-transparent focus:outline-none"
                          />
                        </div>
                        {/* Country list */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredCountries.map((country) => {
                            const excluded = regionConfig.excludedCountries.includes(country.code)
                            return (
                              <button
                                key={country.code}
                                type="button"
                                onClick={() => toggleExcludedCountry(country.code)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-gray-100 transition-colors text-left"
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                                  excluded ? 'bg-red-500 border-red-500' : 'border-gray-300'
                                }`}>
                                  {excluded && <Check size={10} className="text-white" />}
                                </div>
                                <span className={excluded ? 'text-red-600 line-through' : 'text-[var(--color-text)]'}>
                                  {country.name}
                                </span>
                                <span className="text-[var(--color-text-secondary)] ml-auto text-[10px]">{country.code}</span>
                              </button>
                            )
                          })}
                          {filteredCountries.length === 0 && (
                            <p className="text-xs text-[var(--color-text-secondary)] text-center py-4">No countries found</p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className={`w-full py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            canSubmit
              ? 'bg-[var(--color-accent)] text-[var(--color-accent-active)] active:scale-[0.98]'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Bot size={16} />
              Submit to Agent
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            addDraft(form, photos, sellType)
            setDraftSaved(true)
            setTimeout(() => setDraftSaved(false), 2000)
          }}
          className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 border active:scale-[0.98] transition-all ${
            draftSaved
              ? 'border-green-400 text-green-600 bg-green-50'
              : 'border-gray-300 text-[var(--color-text-secondary)]'
          }`}
        >
          {draftSaved ? (
            <>
              <Check size={16} />
              Saved!
            </>
          ) : (
            <>
              <Archive size={16} />
              Save to Drafts
            </>
          )}
        </button>

        {!canSubmit && (
          <p className="text-[10px] text-center text-[var(--color-text-secondary)]">
            {photos.length === 0 && form.description.trim().length === 0
              ? 'Add at least 1 photo and a description to continue'
              : photos.length === 0
              ? 'Add at least 1 photo to continue'
              : form.description.trim().length === 0
              ? 'Add a description to continue'
              : 'Set a price to continue'}
          </p>
        )}

        {submitError && (
          <p className="text-[11px] text-center text-red-500 leading-relaxed">
            {submitError}
          </p>
        )}
      </form>
    </div>
  )
}

function getSubmissionPrice(form: SellForm, sellType: SellType): string {
  if (sellType === 'auction') return form.startingBid
  return form.price
}
