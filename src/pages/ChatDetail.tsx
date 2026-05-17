import { useState, useRef, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { Send, Package, Wifi, WifiOff } from 'lucide-react'
import { mockTransactions, statusLabel, statusColor } from '../data/mockTransactions'
import { getChatThread, updateThreadLastMessage } from '../services/chatThreads'
import { useChatStore, type DisplayMessage } from '../store/useChatStore'
import { useWalletStore } from '../store/useWalletStore'
import { useSafeBack } from '../hooks/useSafeBack'
import { APP_ROUTE_PATHS } from '../navigation/paths'
import StackHeader from '../components/StackHeader'

export default function ChatDetail() {
  const { chatId } = useParams<{ chatId: string }>()
  const location = useLocation()
  const goBack = useSafeBack(APP_ROUTE_PATHS.messages)
  const tx = mockTransactions.find((t) => t.id === chatId)
  const thread = chatId ? getChatThread(chatId) : null
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // Get peerPubKey from route state (passed by Messages page)
  const state = location.state as Record<string, unknown> | null
  const peerPubKey = (typeof state?.peerPubKey === 'string' ? state.peerPubKey : '') || thread?.peerPubKey || ''
  const orderID = (typeof state?.orderID === 'string' ? state.orderID : '') || thread?.orderID || tx?.orderId || chatId || ''

  const { isUnlocked } = useWalletStore()
  const { conversations, wsConnected, loading, loadMessages, sendMessage, setActiveOrder } = useChatStore()

  const messages: DisplayMessage[] = conversations[orderID] || []
  const canChat = isUnlocked && !!peerPubKey

  useEffect(() => {
    if (canChat && orderID) {
      loadMessages(orderID, peerPubKey)
      setActiveOrder(orderID)
    }
    return () => setActiveOrder(null)
  }, [orderID, peerPubKey, canChat])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (!tx && !thread) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-sm text-[var(--color-text-secondary)]">Conversation not found</p>
      </div>
    )
  }

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || !canChat) return
    setInput('')
    try {
      await sendMessage(orderID, peerPubKey, trimmed)
      if (thread) updateThreadLastMessage(thread.id, trimmed)
    } catch (e) {
      console.error('[chat] send error:', e)
    }
  }

  const context = tx
    ? {
        image: tx.product.image,
        name: tx.product.name,
        price: tx.product.price,
        status: tx.status,
        orderId: tx.orderId,
        role: tx.role,
        counterparty: tx.counterparty,
      }
    : {
        image: thread!.productImage,
        name: thread!.productName,
        price: thread!.productPrice,
        status: 'pending' as const,
        orderId: thread!.orderID,
        role: thread!.role,
        counterparty: thread!.counterparty,
      }

  return (
    <div className="flex flex-col h-full max-w-2xl mx-auto" data-allow-horizontal-swipe="true">
      <StackHeader title="Chat" onBack={goBack} bleed />

      {/* Transaction context banner */}
      <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0">
            <img
              src={context.image}
              alt={context.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <Package size={12} className="text-[var(--color-text-secondary)] shrink-0" />
              <span className="text-[11px] font-mono-accent text-[var(--color-text-secondary)]">
                {context.orderId}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[context.status]}`}>
                {statusLabel[context.status]}
              </span>
            </div>
            <p className="text-sm font-medium truncate mt-0.5">
              {context.name} | {context.price}
            </p>
            <p className="text-[11px] text-[var(--color-text-secondary)]">
              {context.role === 'buyer' ? 'Seller' : 'Buyer'}: {context.counterparty}
            </p>
          </div>
          {/* Connection indicator */}
          <div className="shrink-0">
            {wsConnected
              ? <Wifi size={14} className="text-green-500" />
              : <WifiOff size={14} className="text-[var(--color-text-secondary)]" />
            }
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
        {loading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <span className="text-xs text-[var(--color-text-secondary)]">Loading messages...</span>
          </div>
        )}
        {!canChat && !loading && (
          <div className="flex justify-center py-8">
            <span className="text-xs text-[var(--color-text-secondary)]">
              {!isUnlocked ? 'Unlock wallet to view messages' : 'Missing peer key'}
            </span>
          </div>
        )}
        {messages.map((msg) => {
          if (msg.from === 'system') {
            return (
              <div key={msg.id} className="flex justify-center">
                <span className="text-[10px] text-[var(--color-text-secondary)] bg-gray-100 px-3 py-1 rounded-full">
                  {msg.text} · {msg.time}
                </span>
              </div>
            )
          }

          return (
            <div
              key={msg.id}
              className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.from === 'me'
                    ? 'bg-[var(--color-text)] text-white rounded-2xl rounded-br-md'
                    : 'bg-[#F2F2F2] text-[var(--color-text)] rounded-2xl rounded-bl-md'
                }`}
              >
                <p>{msg.text}</p>
                <p
                  className={`text-[10px] mt-1 ${
                    msg.from === 'me' ? 'text-white/50' : 'text-[var(--color-text-secondary)]'
                  }`}
                >
                  {msg.time}
                </p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={canChat ? 'Type a message...' : 'Unlock wallet to chat'}
            disabled={!canChat}
            className="flex-1 bg-[#F2F2F2] rounded-full px-4 py-2.5 text-sm outline-none placeholder:text-[var(--color-text-secondary)] focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || !canChat}
            className="tap-feedback w-10 h-10 rounded-full bg-[var(--color-text)] flex items-center justify-center shrink-0 disabled:opacity-30 transition-opacity"
          >
            <Send size={16} className="text-white ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
