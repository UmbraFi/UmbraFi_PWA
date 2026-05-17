import { create } from 'zustand'
import {
  generateMnemonic,
  validateMnemonic,
  keypairFromMnemonic,
  importFromPrivateKey,
  encryptData,
  decryptData,
  encryptMnemonic,
  deriveKeyFromPin,
  generateSalt,
  loadWalletData,
  saveWalletData,
  clearWalletData,
  uint8ToBase64,
  base64ToUint8,
  type WalletData,
} from '../services/walletCrypto'

import nacl from 'tweetnacl'
import { migrateToScopedStorage } from '../services/storage'
import { hydrateStoreFromWallet } from './useStore'

// Module-scoped secret key — never exposed in store state or devtools
let _secretKey: Uint8Array | null = null

function onWalletReady() {
  migrateToScopedStorage()
  hydrateStoreFromWallet()
}

/** Returns the raw Ed25519 secret key (64 bytes). Throws if wallet is locked. */
export function getSecretKey(): Uint8Array {
  if (!_secretKey) throw new Error('Wallet is locked')
  return _secretKey
}

/** Signs data with Ed25519 detached signature. Returns 64-byte signature. */
export function signData(data: Uint8Array): Uint8Array {
  if (!_secretKey) throw new Error('Wallet is locked')
  return nacl.sign.detached(data, _secretKey)
}

interface WalletState {
  publicKey: string | null
  isUnlocked: boolean
  isLoading: boolean
  error: string | null
  pendingMnemonic: string | null

  createWallet: (pin: string) => Promise<void>
  importWalletFromMnemonic: (mnemonic: string, pin: string) => Promise<void>
  importWalletFromKey: (base58Key: string, pin: string) => Promise<void>
  unlock: (pin: string) => Promise<void>
  lock: () => void
  disconnect: () => void
  hasWallet: () => boolean
  acknowledgeMnemonic: () => void
  getDecryptedMnemonic: (pin: string) => Promise<string | null>
}

export const useWalletStore = create<WalletState>((set) => ({
  publicKey: loadWalletData()?.publicKey ?? null,
  isUnlocked: false,
  isLoading: false,
  error: null,
  pendingMnemonic: null,

  hasWallet: () => !!loadWalletData(),

  createWallet: async (pin: string) => {
    set({ isLoading: true, error: null })
    try {
      const mnemonic = generateMnemonic()
      const { publicKey, secretKey } = await keypairFromMnemonic(mnemonic)

      const salt = generateSalt()
      const encKey = await deriveKeyFromPin(pin, salt)

      const encrypted = encryptData(secretKey, encKey)
      const encMnemonic = encryptMnemonic(mnemonic, encKey)

      const data: WalletData = {
        version: 2,
        publicKey,
        encrypted,
        encryptedMnemonic: encMnemonic,
        pinSalt: uint8ToBase64(salt),
        createdAt: new Date().toISOString(),
      }
      saveWalletData(data)

      _secretKey = secretKey
      set({ publicKey, isUnlocked: true, isLoading: false, pendingMnemonic: mnemonic })
      onWalletReady()
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  importWalletFromMnemonic: async (mnemonic: string, pin: string) => {
    set({ isLoading: true, error: null })
    try {
      if (!validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic phrase')

      const { publicKey, secretKey } = await keypairFromMnemonic(mnemonic)
      const salt = generateSalt()
      const encKey = await deriveKeyFromPin(pin, salt)

      const encrypted = encryptData(secretKey, encKey)
      const encMnemonic = encryptMnemonic(mnemonic, encKey)

      const data: WalletData = {
        version: 2,
        publicKey,
        encrypted,
        encryptedMnemonic: encMnemonic,
        pinSalt: uint8ToBase64(salt),
        createdAt: new Date().toISOString(),
      }
      saveWalletData(data)

      _secretKey = secretKey
      set({ publicKey, isUnlocked: true, isLoading: false })
      onWalletReady()
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  importWalletFromKey: async (base58Key: string, pin: string) => {
    set({ isLoading: true, error: null })
    try {
      const { publicKey, secretKey } = importFromPrivateKey(base58Key)
      const salt = generateSalt()
      const encKey = await deriveKeyFromPin(pin, salt)

      const encrypted = encryptData(secretKey, encKey)

      const data: WalletData = {
        version: 2,
        publicKey,
        encrypted,
        pinSalt: uint8ToBase64(salt),
        createdAt: new Date().toISOString(),
      }
      saveWalletData(data)

      _secretKey = secretKey
      set({ publicKey, isUnlocked: true, isLoading: false })
      onWalletReady()
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  unlock: async (pin: string) => {
    set({ isLoading: true, error: null })
    try {
      const data = loadWalletData()
      if (!data) throw new Error('No wallet found')

      const salt = base64ToUint8(data.pinSalt)
      const encKey = await deriveKeyFromPin(pin, salt)

      const secretKey = decryptData(
        data.encrypted.nonce,
        data.encrypted.ciphertext,
        encKey,
      )

      _secretKey = secretKey
      set({ publicKey: data.publicKey, isUnlocked: true, isLoading: false })
      onWalletReady()
    } catch (e) {
      set({ isLoading: false, error: (e as Error).message })
    }
  },

  lock: () => {
    if (_secretKey) {
      _secretKey.fill(0)
      _secretKey = null
    }
    set({ isUnlocked: false })
  },

  disconnect: () => {
    if (_secretKey) {
      _secretKey.fill(0)
      _secretKey = null
    }
    clearWalletData()
    set({ publicKey: null, isUnlocked: false, error: null, pendingMnemonic: null })
  },

  acknowledgeMnemonic: () => {
    set({ pendingMnemonic: null })
  },

  getDecryptedMnemonic: async (pin: string) => {
    const data = loadWalletData()
    if (!data?.encryptedMnemonic) return null
    const salt = base64ToUint8(data.pinSalt)
    const encKey = await deriveKeyFromPin(pin, salt)
    const decrypted = decryptData(
      data.encryptedMnemonic.nonce,
      data.encryptedMnemonic.ciphertext,
      encKey,
    )
    return new TextDecoder().decode(decrypted)
  },
}))
