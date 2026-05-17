import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { signData } from '../store/useWalletStore'

const MINER_URL = import.meta.env.VITE_MINER_URL || 'http://localhost:8080'

export interface WireMessage {
  order_id: string
  from: string
  to: string
  text: string      // encrypted ciphertext hex
  ts: number
  prev_hash: string
  hash: string
  signature: string
}

/** POST /v1/chat/send */
export async function sendMessage(msg: WireMessage): Promise<void> {
  const res = await fetch(`${MINER_URL}/v1/chat/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(msg),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as Record<string, string>).error || `send failed: ${res.status}`)
  }
}

/** GET /v1/chat/messages/{orderID}?after=N */
export async function getMessages(orderID: string, after = 0): Promise<WireMessage[]> {
  const url = `${MINER_URL}/v1/chat/messages/${encodeURIComponent(orderID)}?after=${after}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`getMessages failed: ${res.status}`)
  const data = await res.json()
  if (Array.isArray(data)) return data as WireMessage[]
  return (data as { messages: WireMessage[] }).messages || []
}

/** GET /v1/chat/unread/{pubkey} */
export async function getUnreadOrders(pubkey: string): Promise<string[]> {
  const res = await fetch(`${MINER_URL}/v1/chat/unread/${encodeURIComponent(pubkey)}`)
  if (!res.ok) throw new Error(`getUnread failed: ${res.status}`)
  const data = await res.json()
  return (data as { order_ids?: string[]; orders?: string[] }).order_ids || (data as { orders?: string[] }).orders || []
}

type MessageHandler = (msg: WireMessage) => void

/**
 * WebSocket client with challenge-response Ed25519 auth.
 * Matches Umbra_SVR Hub.HandleWS auth protocol.
 */
export class ChatWebSocket {
  private ws: WebSocket | null = null
  private pubkey: string
  private onMessage: MessageHandler
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private _connected = false
  private destroyed = false

  constructor(pubkey: string, onMessage: MessageHandler) {
    this.pubkey = pubkey
    this.onMessage = onMessage
  }

  get connected() { return this._connected }

  connect() {
    if (this.destroyed) return
    const wsUrl = MINER_URL.replace(/^http/, 'ws') + '/ws'
    this.ws = new WebSocket(wsUrl)

    this.ws.onmessage = (ev) => {
      const data = JSON.parse(ev.data as string)

      // Challenge-response auth
      if (data.challenge) {
        const challengeBytes = hexToBytes(data.challenge as string)
        const sig = signData(challengeBytes)
        this.ws!.send(JSON.stringify({
          pubkey: this.pubkey,
          signature: bytesToHex(sig),
        }))
        return
      }

      // Auth success
      if (data.status === 'connected') {
        this._connected = true
        return
      }

      // Auth error
      if (data.error) {
        console.error('[ws] auth error:', data.error)
        return
      }

      // Incoming message
      if (data.order_id) {
        this.onMessage(data as WireMessage)
      }
    }

    this.ws.onclose = () => {
      this._connected = false
      this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this._connected = false
    }
  }

  private scheduleReconnect() {
    if (this.destroyed) return
    this.reconnectTimer = setTimeout(() => this.connect(), 3000)
  }

  destroy() {
    this.destroyed = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }
    this._connected = false
  }
}
