import {
  feedTypes,
  type FeedType,
  type Product,
} from '../data/mockProducts'
import { ipfsUrl } from './ipfs'

const MINER_URL = import.meta.env.VITE_MINER_URL || 'http://localhost:8080'

export interface ProductReview {
  approved: boolean
  reason: string
  minerPubkey?: string
  timestamp?: number
}

export interface CreateProductInput {
  description: string
  price: string
  sellType: string
  shippingMethod: string
  shippingRegionConfig: {
    type: string
    selectedRegions: string[]
    excludedCountries: string[]
  }
  imageCids: string[]
  sellerPubkey: string
}

export class ProductSubmissionError extends Error {
  review?: ProductReview

  constructor(message: string, review?: ProductReview) {
    super(message)
    this.name = 'ProductSubmissionError'
    this.review = review
  }
}

export async function listProducts(): Promise<Product[]> {
  const res = await fetch(`${MINER_URL}/v1/products`)
  if (!res.ok) throw new Error(`listProducts failed: ${res.status}`)
  const data = await res.json()
  const rawProducts = Array.isArray(data) ? data : data.products
  if (!Array.isArray(rawProducts)) return []
  return rawProducts.map(normalizeProduct)
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const res = await fetch(`${MINER_URL}/v1/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    const review = (data as { review?: ProductReview }).review
    const message =
      review?.reason ||
      (data as { error?: string }).error ||
      `createProduct failed: ${res.status}`
    throw new ProductSubmissionError(message, review)
  }

  const product = (data as { product?: unknown }).product ?? data
  return normalizeProduct(product)
}

export function normalizeProduct(raw: unknown): Product {
  const data = raw as Record<string, unknown>
  const imageCids = Array.isArray(data.imageCids)
    ? data.imageCids.filter((cid): cid is string => typeof cid === 'string')
    : []
  const image =
    typeof data.image === 'string' && data.image
      ? normalizeImage(data.image)
      : imageCids[0]
      ? ipfsUrl(imageCids[0])
      : ''

  const feedType = typeof data.feedType === 'string' && isFeedType(data.feedType)
    ? data.feedType
    : 'collectibles'

  const seller = stringField(data.seller) || stringField(data.sellerPubkey) || 'local-dev-seller'

  return {
    id: stringField(data.id) || crypto.randomUUID(),
    name: stringField(data.name) || 'Local Listing',
    brand: stringField(data.brand) || 'UMBRA LOCAL',
    price: numberField(data.price),
    image,
    category: stringField(data.category) || 'Collectibles',
    feedType,
    description: stringField(data.description),
    seller,
    sellerPubkey: stringField(data.sellerPubkey) || seller,
    listedAt: stringField(data.listedAt) || new Date().toISOString(),
    size: optionalString(data.size),
    condition: normalizeCondition(data.condition),
    sellerReputation: boundedScore(data.sellerReputation, 80),
    qualityScore: boundedScore(data.qualityScore, 82),
    shipFromCountry: stringField(data.shipFromCountry) || 'Local',
    deliverableCountries: stringArray(data.deliverableCountries, ['Local']),
    imageCids,
    sellType: stringField(data.sellType) || 'regular',
    review: isReview(data.review) ? data.review : undefined,
  }
}

function normalizeImage(value: string): string {
  if (value.startsWith('http')) return value
  if (value.startsWith('/')) return `${MINER_URL}${value}`
  return ipfsUrl(value)
}

function stringField(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value ? value : undefined
}

function numberField(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function boundedScore(value: unknown, fallback: number): number {
  const score = numberField(value)
  return score > 0 ? Math.max(0, Math.min(100, Math.round(score))) : fallback
}

function stringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : fallback
}

function normalizeCondition(value: unknown): Product['condition'] {
  return value === 'Like New' || value === 'Used' || value === 'New' ? value : 'New'
}

function isFeedType(value: string): value is FeedType {
  return (feedTypes as readonly string[]).includes(value)
}

function isReview(value: unknown): value is ProductReview {
  return typeof value === 'object' && value !== null && 'approved' in value
}
