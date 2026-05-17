import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { getMockProducts, type FeedType, type Product } from '../data/mockProducts'
import { listProducts } from '../services/products'
import { getWalletItem, setWalletItem } from '../services/storage'

export type SortMode = 'Default Ranking' | 'Seller Reputation' | 'Product Quality'
export type SellType = 'regular' | 'auction' | 'raffle'

interface CartItem {
  product: Product
  quantity: number
}

interface Store {
  products: Product[]
  cart: CartItem[]
  searchQuery: string
  sortMode: SortMode
  minPrice: number | null
  maxPrice: number | null
  shipFromCountries: string[]
  deliverToCountries: string[]
  selectedFeedTypes: FeedType[]
  followedSellers: string[]
  selectedFollowedSellers: string[]
  isRefreshing: boolean
  isDiscoverPanelOpen: boolean
  bottomNavHidden: boolean
  sellType: SellType
  favorites: string[]
  browsingHistory: string[]
  sellStep: number
  productsLoaded: boolean
  productLoadError: string | null
  loadProducts: () => Promise<void>
  addProduct: (product: Product) => void
  toggleFavorite: (productId: string) => void
  addToHistory: (productId: string) => void
  setSearchQuery: (query: string) => void
  setDiscoverPanelOpen: (isOpen: boolean) => void
  setBottomNavHidden: (hidden: boolean) => void
  setSellType: (type: SellType) => void
  setSellStep: (step: number) => void
  setSortMode: (mode: SortMode) => void
  setPriceRange: (min: number | null, max: number | null) => void
  toggleShipFromCountry: (country: string) => void
  toggleDeliverToCountry: (country: string) => void
  setSelectedFeedTypes: (feedTypes: FeedType[]) => void
  toggleSelectedFollowedSeller: (seller: string) => void
  clearSelectedFollowedSellers: () => void
  toggleFollowSeller: (seller: string) => void
  clearDiscoverFilters: () => void
  addToCart: (product: Product) => void
  removeFromCart: (productId: string) => void
  updateCartQuantity: (productId: string, quantity: number) => void
  getFilteredProducts: () => Product[]
  refreshProducts: () => Promise<void>
}

const toggleInList = (list: string[], item: string) =>
  list.includes(item)
    ? list.filter((existing) => existing !== item)
    : [...list, item]

const getComprehensiveScore = (product: Product) => {
  const valueScore = Math.max(0, 100 - product.price * 20)
  return product.sellerReputation * 0.45 + product.qualityScore * 0.45 + valueScore * 0.1
}

const defaultFollowedSellers = ['7xKz...9fRm', '4pQw...2nXk', '6jNr...1aDe', '8hFg...7mWx', '5wAe...0pLj']

export const useStore = create<Store>()(subscribeWithSelector((set, get) => ({
  products: getMockProducts(),
  cart: [],
  searchQuery: '',
  sortMode: 'Default Ranking',
  minPrice: null,
  maxPrice: null,
  shipFromCountries: [],
  deliverToCountries: [],
  selectedFeedTypes: [],
  followedSellers: defaultFollowedSellers,
  selectedFollowedSellers: [],
  isRefreshing: false,
  isDiscoverPanelOpen: false,
  bottomNavHidden: false,
  favorites: [] as string[],
  browsingHistory: [] as string[],
  sellType: 'regular' as SellType,
  sellStep: 0,
  productsLoaded: false,
  productLoadError: null,

  loadProducts: async () => {
    try {
      const remoteProducts = await listProducts()
      set({
        products: remoteProducts,
        productsLoaded: true,
        productLoadError: null,
      })
    } catch (e) {
      set({
        products: getMockProducts(),
        productsLoaded: true,
        productLoadError: (e as Error).message,
      })
    }
  },
  addProduct: (product) =>
    set((state) => ({
      products: [
        product,
        ...state.products.filter((existing) => existing.id !== product.id),
      ],
    })),

  toggleFavorite: (productId) =>
    set((state) => ({
      favorites: toggleInList(state.favorites, productId),
    })),
  addToHistory: (productId) =>
    set((state) => ({
      browsingHistory: [
        productId,
        ...state.browsingHistory.filter((id) => id !== productId),
      ].slice(0, 50),
    })),

  setSearchQuery: (query) => set({ searchQuery: query }),
  setDiscoverPanelOpen: (isOpen) => set({ isDiscoverPanelOpen: isOpen, bottomNavHidden: isOpen }),
  setSellType: (type) => set({ sellType: type }),
  setSellStep: (step) => set({ sellStep: step }),
  setBottomNavHidden: (hidden) => set({ bottomNavHidden: hidden }),
  setSortMode: (mode) => set({ sortMode: mode }),
  setPriceRange: (min, max) => {
    const normalizedMin = min !== null && min >= 0 ? min : null
    const normalizedMax = max !== null && max >= 0 ? max : null

    if (
      normalizedMin !== null &&
      normalizedMax !== null &&
      normalizedMin > normalizedMax
    ) {
      set({ minPrice: normalizedMax, maxPrice: normalizedMin })
      return
    }

    set({ minPrice: normalizedMin, maxPrice: normalizedMax })
  },
  toggleShipFromCountry: (country) =>
    set((state) => ({
      shipFromCountries: toggleInList(state.shipFromCountries, country),
    })),
  toggleDeliverToCountry: (country) =>
    set((state) => ({
      deliverToCountries: toggleInList(state.deliverToCountries, country),
    })),
  setSelectedFeedTypes: (feedTypes) =>
    set({
      selectedFeedTypes: [...new Set(feedTypes)],
    }),
  toggleSelectedFollowedSeller: (seller) =>
    set((state) => ({
      selectedFollowedSellers: state.selectedFollowedSellers.includes(seller)
        ? state.selectedFollowedSellers.filter((s) => s !== seller)
        : [...state.selectedFollowedSellers, seller],
    })),
  clearSelectedFollowedSellers: () => set({ selectedFollowedSellers: [] }),
  toggleFollowSeller: (seller) =>
    set((state) => ({
      followedSellers: toggleInList(state.followedSellers, seller),
      selectedFollowedSellers: state.selectedFollowedSellers.filter((s) => s !== seller),
    })),
  clearDiscoverFilters: () =>
    set({
      sortMode: 'Default Ranking',
      minPrice: null,
      maxPrice: null,
      shipFromCountries: [],
      deliverToCountries: [],
    }),

  addToCart: (product) =>
    set((state) => {
      const existing = state.cart.find((item) => item.product.id === product.id)
      if (existing) {
        return {
          cart: state.cart.map((item) =>
            item.product.id === product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        }
      }
      return { cart: [...state.cart, { product, quantity: 1 }] }
    }),

  removeFromCart: (productId) =>
    set((state) => ({
      cart: state.cart.filter((item) => item.product.id !== productId),
    })),

  updateCartQuantity: (productId, quantity) =>
    set((state) => ({
      cart: quantity <= 0
        ? state.cart.filter((item) => item.product.id !== productId)
        : state.cart.map((item) =>
            item.product.id === productId ? { ...item, quantity } : item,
          ),
    })),

  refreshProducts: async () => {
    set({ isRefreshing: true })
    try {
      const remoteProducts = await listProducts()
      set({
        products: remoteProducts,
        productLoadError: null,
        isRefreshing: false,
      })
    } catch (e) {
      set((state) => {
        const shuffled = [...state.products].sort(() => Math.random() - 0.5)
        return {
          products: shuffled,
          productLoadError: (e as Error).message,
          isRefreshing: false,
        }
      })
    }
  },

  getFilteredProducts: () => {
    const {
      products,
      searchQuery,
      sortMode,
      minPrice,
      maxPrice,
      shipFromCountries,
      deliverToCountries,
    } = get()
    const normalizedQuery = searchQuery.trim().toLowerCase()

    const filtered = products.filter((product) => {
      const matchesSearch =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery)

      const matchesPrice =
        (minPrice === null || product.price >= minPrice) &&
        (maxPrice === null || product.price <= maxPrice)

      const matchesShipFrom =
        shipFromCountries.length === 0 ||
        shipFromCountries.includes(product.shipFromCountry)

      const matchesDeliverTo =
        deliverToCountries.length === 0 ||
        deliverToCountries.some((country) =>
          product.deliverableCountries.includes(country),
        )

      return (
        matchesSearch &&
        matchesPrice &&
        matchesShipFrom &&
        matchesDeliverTo
      )
    })

    return filtered.sort((a, b) => {
      if (sortMode === 'Seller Reputation') {
        return (
          b.sellerReputation - a.sellerReputation ||
          b.qualityScore - a.qualityScore ||
          a.price - b.price
        )
      }

      if (sortMode === 'Product Quality') {
        return (
          b.qualityScore - a.qualityScore ||
          b.sellerReputation - a.sellerReputation ||
          a.price - b.price
        )
      }

      return (
        getComprehensiveScore(b) - getComprehensiveScore(a) ||
        b.qualityScore - a.qualityScore ||
        a.price - b.price
      )
    })
  },
})))

// Persisted keys scoped per wallet
const PERSISTED_KEYS = ['favorites', 'browsingHistory', 'cart', 'followedSellers'] as const

/** Hydrate persisted store fields from wallet-scoped storage */
export function hydrateStoreFromWallet(): void {
  try {
    useStore.setState({
      favorites: getWalletItem<string[]>('store.favorites', []),
      browsingHistory: getWalletItem<string[]>('store.browsingHistory', []),
      cart: getWalletItem<CartItem[]>('store.cart', []),
      followedSellers: getWalletItem<string[]>('store.followedSellers', defaultFollowedSellers),
    })
  } catch { /* no wallet */ }
}

// Auto-save persisted fields on change
for (const key of PERSISTED_KEYS) {
  useStore.subscribe(
    (state) => state[key],
    (value) => {
      try { setWalletItem(`store.${key}`, value) } catch { /* no wallet */ }
    },
  )
}
