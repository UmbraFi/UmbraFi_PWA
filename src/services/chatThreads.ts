import type { Product } from '../data/mockProducts'
import { getWalletItem, setWalletItem } from './storage'

const THREADS_KEY = 'chat.threads'

export interface ChatThread {
  id: string
  orderID: string
  peerPubKey: string
  counterparty: string
  productId: string
  productName: string
  productImage: string
  productPrice: number
  role: 'buyer' | 'seller'
  lastMessage: string
  updatedAt: number
}

export function listChatThreads(): ChatThread[] {
  return getWalletItem<ChatThread[]>(THREADS_KEY, [])
    .filter((thread) => thread.id && thread.peerPubKey)
    .sort((a, b) => b.updatedAt - a.updatedAt)
}

export function getChatThread(id: string): ChatThread | null {
  return listChatThreads().find((thread) => thread.id === id || thread.orderID === id) ?? null
}

export function upsertProductThread(product: Product, buyerPubkey: string): ChatThread {
  const peerPubKey = product.sellerPubkey || product.seller
  const id = buildThreadID(product.id, buyerPubkey, peerPubKey)
  const existing = getChatThread(id)
  const now = Date.now()
  const thread: ChatThread = {
    id,
    orderID: id,
    peerPubKey,
    counterparty: peerPubKey,
    productId: product.id,
    productName: product.name,
    productImage: product.image,
    productPrice: product.price,
    role: 'buyer',
    lastMessage: existing?.lastMessage || 'Encrypted order chat opened',
    updatedAt: now,
  }
  saveThread(thread)
  return thread
}

export function saveThread(thread: ChatThread): void {
  const existing = listChatThreads().filter((item) => item.id !== thread.id)
  setWalletItem(THREADS_KEY, [thread, ...existing].slice(0, 50))
}

export function updateThreadLastMessage(id: string, message: string): void {
  const thread = getChatThread(id)
  if (!thread) return
  saveThread({ ...thread, lastMessage: message, updatedAt: Date.now() })
}

export function deleteChatThreads(ids: Set<string>): void {
  const remaining = listChatThreads().filter((thread) => !ids.has(thread.id))
  setWalletItem(THREADS_KEY, remaining)
}

function buildThreadID(productId: string, buyerPubkey: string, sellerPubkey: string): string {
  return [
    'order',
    safePart(productId),
    safePart(buyerPubkey).slice(0, 10),
    safePart(sellerPubkey).slice(0, 10),
  ].join('-')
}

function safePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '')
}
