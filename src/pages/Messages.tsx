import { useState, useMemo, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MessageCircle, Pencil, CheckCheck, Search, Trash2, X } from 'lucide-react'
import { mockTransactions, statusLabel, statusColor } from '../data/mockTransactions'
import { deleteChatThreads, listChatThreads, type ChatThread } from '../services/chatThreads'
import { useChatStore } from '../store/useChatStore'
import { useWalletStore } from '../store/useWalletStore'
import { usePullToRefresh } from '../hooks/usePullToRefresh'
import PullToRefreshIndicator from '../components/PullToRefreshIndicator'

export default function Messages() {
  const location = useLocation()
  const navigate = useNavigate()
  const fromPath = `${location.pathname}${location.search}`

  const [editMode, setEditMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [threads, setThreads] = useState<ChatThread[]>(() => listChatThreads())
  const chatIntent = useMemo(() => {
    const state = location.state as Record<string, unknown> | null
    const sellerId = typeof state?.sellerId === 'string' ? state.sellerId : ''
    const productName = typeof state?.productName === 'string' ? state.productName : ''

    if (!sellerId) return null

    return { sellerId, productName }
  }, [location.state])

  const { isUnlocked } = useWalletStore()
  const { unreadOrders, fetchUnread, connectWebSocket, disconnectWebSocket } = useChatStore()

  const [isRefreshing, setIsRefreshing] = useState(false)
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    try {
      await fetchUnread()
    } finally {
      setIsRefreshing(false)
    }
  }, [fetchUnread])
  const { pullY, rotation, opacity, scale, touchHandlers } = usePullToRefresh(handleRefresh, isRefreshing)

  useEffect(() => {
    if (isUnlocked) {
      setThreads(listChatThreads())
      fetchUnread()
      connectWebSocket()
    }
    return () => disconnectWebSocket()
  }, [isUnlocked])

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return mockTransactions
    const q = searchQuery.toLowerCase()
    return mockTransactions.filter(
      (tx) =>
        tx.product.name.toLowerCase().includes(q) ||
        tx.counterparty.toLowerCase().includes(q) ||
        tx.lastMessage.toLowerCase().includes(q) ||
        tx.orderId.toLowerCase().includes(q),
    )
  }, [searchQuery])

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleDelete = () => {
    deleteChatThreads(selected)
    setThreads(listChatThreads())
    setSelected(new Set())
    setEditMode(false)
  }

  const handleMarkAllRead = () => {
    // TODO: mark all unread as read
  }

  const exitEdit = () => {
    setEditMode(false)
    setSelected(new Set())
  }

  return (
    <div className="max-w-2xl mx-auto" {...touchHandlers}>
      {/* ── Fixed header ── */}
      <div
        className="fixed top-0 left-0 right-0 z-50 bg-[var(--color-bg)]"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="max-w-7xl mx-auto px-1.5 h-10 flex items-center justify-between">
          {/* Left icon */}
          {editMode ? (
            <button
              type="button"
              onClick={exitEdit}
              className="tap-feedback p-1.5 text-black"
              aria-label="Cancel edit"
            >
              <X size={20} strokeWidth={2} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="tap-feedback p-1.5 text-black"
              aria-label="Edit messages"
            >
              <Pencil size={18} strokeWidth={2} />
            </button>
          )}

          {/* Centered title */}
          <h1 className="text-lg font-semibold">Messages</h1>

          {/* Right icon */}
          {editMode ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={selected.size === 0}
              className="tap-feedback p-1.5 text-red-500 disabled:text-[var(--color-text-secondary)] disabled:opacity-40"
              aria-label="Delete selected"
            >
              <Trash2 size={20} strokeWidth={1.8} />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="tap-feedback p-1.5 text-black transition-colors"
              aria-label="Mark all as read"
            >
              <CheckCheck size={20} strokeWidth={1.8} />
            </button>
          )}
        </div>

        {/* Search bar */}
        <div className="max-w-7xl mx-auto px-1.5 pb-2">
          <div className="flex items-center gap-2 bg-white rounded-lg px-4 py-2 border border-[var(--color-border)]">
            <Search size={16} strokeWidth={2} className="text-[var(--color-text-secondary)] shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-[var(--color-text-secondary)]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="tap-feedback p-0.5 text-[var(--color-text-secondary)]"
              >
                <X size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
        {chatIntent && (
          <div className="max-w-7xl mx-auto px-1.5 pb-2">
            <div className="rounded-xl border border-[var(--color-accent)]/20 bg-[color-mix(in_srgb,var(--color-accent)_14%,white)] px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                Seller Chat
              </p>
              <p className="mt-1 text-sm font-medium text-[var(--color-text)]">
                {chatIntent.productName
                  ? `Contact ${chatIntent.sellerId} about ${chatIntent.productName}`
                  : `Contact ${chatIntent.sellerId}`}
              </p>
              <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
                Open an existing transaction thread below, or complete checkout to unlock an order-linked encrypted chat.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Pull-to-refresh indicator */}
      <PullToRefreshIndicator pullY={pullY} rotation={rotation} opacity={opacity} scale={scale} isRefreshing={isRefreshing} />

      {/* ── Message list ── */}
      <div className="pt-1 -mx-2 min-h-screen bg-white">
        {filtered.length === 0 && threads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <MessageCircle size={40} strokeWidth={1} className="text-[var(--color-text-secondary)] mb-4" />
            <p className="text-sm text-[var(--color-text-secondary)]">
              {searchQuery ? 'No matching messages' : 'No messages yet'}
            </p>
            {!searchQuery && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                When you buy or sell items, transaction chats will appear here.
              </p>
            )}
          </div>
        ) : (
          <div className="flex flex-col bg-white">
            {/* System message row */}
            <div className="flex items-center gap-3 px-3 py-3.5 bg-[var(--color-bg)] border-b border-[var(--color-border)]">
              <div className="w-13 h-13 rounded-full bg-gray-200 shrink-0 flex items-center justify-center">
                <MessageCircle size={20} strokeWidth={1.5} className="text-[var(--color-text-secondary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">System Notifications</span>
                <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">Order updates and announcements</p>
              </div>
            </div>

            {threads.map((thread) => {
              const isUnread = unreadOrders.has(thread.orderID)
              return (
                <div key={thread.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (editMode) {
                        toggleSelect(thread.id)
                      } else {
                        navigate(`/chat/${thread.id}`, {
                          state: {
                            from: fromPath,
                            peerPubKey: thread.peerPubKey,
                            orderID: thread.orderID,
                          },
                        })
                      }
                    }}
                    className={`tap-feedback w-full flex items-center gap-3 px-3 py-3.5 transition-colors text-left ${
                      editMode && selected.has(thread.id) ? 'bg-[var(--color-accent-50)]' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    {editMode && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          selected.has(thread.id)
                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selected.has(thread.id) && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-gray-100 shrink-0 self-center">
                      <img src={thread.productImage} alt={thread.productName} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-normal text-[var(--color-text-secondary)]'}`}>
                          {thread.productName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-yellow-100 text-yellow-700">
                          Pending
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                        {thread.lastMessage}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-3 self-center">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {new Date(thread.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div className="h-5 flex items-center justify-center">
                        {!editMode && isUnread ? (
                          <span className="min-w-[20px] h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center px-1">
                            <span className="text-xs font-semibold text-[var(--color-accent-active)]">1</span>
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                    </div>
                  </button>
                  <div className="border-b border-[var(--color-border)] ml-[4.75rem] mr-3" />
                </div>
              )
            })}

            {filtered.map((tx, idx) => {
              const isUnread = unreadOrders.has(tx.orderId) || tx.unread
              const unreadCount = unreadOrders.has(tx.orderId) ? tx.unreadCount || 1 : tx.unreadCount

              return (
                <div key={tx.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (editMode) {
                        toggleSelect(tx.id)
                      } else {
                        navigate(`/chat/${tx.id}`, { state: { from: fromPath, peerPubKey: '' } })
                      }
                    }}
                    className={`tap-feedback w-full flex items-center gap-3 px-3 py-3.5 transition-colors text-left ${
                      editMode && selected.has(tx.id) ? 'bg-[var(--color-accent-50)]' : 'hover:bg-gray-50/60'
                    }`}
                  >
                    {/* Edit mode checkbox */}
                    {editMode && (
                      <div
                        className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${
                          selected.has(tx.id)
                            ? 'bg-[var(--color-accent)] border-[var(--color-accent)]'
                            : 'border-gray-300'
                        }`}
                      >
                        {selected.has(tx.id) && (
                          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                            <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>
                    )}

                    {/* Avatar — vertically centered */}
                    <div className="w-13 h-13 rounded-full overflow-hidden bg-gray-100 shrink-0 self-center">
                      <img
                        src={tx.product.image}
                        alt={tx.product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={`text-sm truncate ${isUnread ? 'font-semibold' : 'font-normal text-[var(--color-text-secondary)]'}`}>
                          {tx.product.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ${statusColor[tx.status]}`}>
                          {statusLabel[tx.status]}
                        </span>
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${isUnread ? 'text-[var(--color-text)] font-medium' : 'text-[var(--color-text-secondary)]'}`}>
                        {tx.lastMessage}
                      </p>
                    </div>

                    {/* Time + unread badge, right-aligned column */}
                    <div className="shrink-0 flex flex-col items-end gap-3 self-center">
                      <span className="text-xs text-[var(--color-text-secondary)]">
                        {tx.time}
                      </span>
                      <div className="h-5 flex items-center justify-center">
                        {!editMode && isUnread && unreadCount > 0 ? (
                          <span className="min-w-[20px] h-5 rounded-full bg-[var(--color-accent)] flex items-center justify-center px-1">
                            <span className="text-xs font-semibold text-[var(--color-accent-active)]">
                              {unreadCount}
                            </span>
                          </span>
                        ) : (
                          <span />
                        )}
                      </div>
                    </div>
                  </button>
                  {/* Divider — offset to skip avatar area */}
                  <div className={`border-b border-[var(--color-border)] ${idx < filtered.length - 1 ? 'ml-[4.75rem]' : 'ml-0'} mr-3`} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
