import { Fingerprint, Key, Lock, LogOut, Plus, Shield, Unlock } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { isBiometricSupported } from '../services/walletCrypto'
import { useStore } from '../store/useStore'
import PinGrid, { PIN_LENGTH } from './PinGrid'
import MnemonicGrid from './MnemonicGrid'

type View = 'idle' | 'biometric-unlocking' | 'create-pin' | 'create-confirm' | 'unlock' | 'import-input' | 'import-pin' | 'mnemonic-backup' | 'disconnect-confirm'
type ImportMode = 'mnemonic' | 'privateKey'

export default function AuthGate() {
  const {
    unlocked, isLoading, error, hasExistingWallet,
    createWallet, importWalletFromMnemonic, importWalletFromKey,
    unlock, disconnect, pendingMnemonic, acknowledgeMnemonic, verifyBiometric,
  } = useWallet()

  const [view, setView] = useState<View>('idle')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinMismatch, setPinMismatch] = useState(false)
  const [importMode, setImportMode] = useState<ImportMode>('mnemonic')
  const [importValue, setImportValue] = useState('')
  const [localError, setLocalError] = useState<string | null>(null)
  const submitting = useRef(false)

  const setBottomNavHidden = useStore((s) => s.setBottomNavHidden)

  // Show mnemonic backup after wallet creation
  useEffect(() => {
    if (pendingMnemonic) setView('mnemonic-backup')
  }, [pendingMnemonic])

  // Hide bottom nav while gate is visible
  const visible = !unlocked
  useEffect(() => {
    if (visible) setBottomNavHidden(true)
    return () => { if (visible) setBottomNavHidden(false) }
  }, [visible, setBottomNavHidden])

  // Reset state when gate becomes hidden
  useEffect(() => {
    if (!visible) {
      setView('idle')
      setPin('')
      setConfirmPin('')
      setImportValue('')
      setLocalError(null)
      setPinMismatch(false)
    }
  }, [visible])

  const resetToIdle = () => {
    setView('idle')
    setPin('')
    setConfirmPin('')
    setLocalError(null)
    setPinMismatch(false)
  }

  // --- Create wallet flow ---
  const startCreate = async () => {
    setLocalError(null)
    if (isBiometricSupported()) {
      try {
        await verifyBiometric()
      } catch (e) {
        setLocalError((e as Error).message || 'Biometric verification failed.')
        return
      }
    }
    setView('create-pin')
  }

  const handleCreatePin = useCallback((v: string) => {
    setPin(v)
    setPinMismatch(false)
    if (v.length === PIN_LENGTH) {
      setTimeout(() => setView('create-confirm'), 150)
    }
  }, [])

  const handleConfirmPin = useCallback(async (v: string) => {
    setConfirmPin(v)
    if (v.length === PIN_LENGTH && !submitting.current) {
      if (v !== pin) {
        setPinMismatch(true)
        setConfirmPin('')
        return
      }
      submitting.current = true
      await createWallet(v)
      setPin('')
      setConfirmPin('')
      submitting.current = false
    }
  }, [pin, createWallet])

  // --- Unlock flow ---
  const handleUnlockPin = useCallback(async (v: string) => {
    setPin(v)
    if (v.length === PIN_LENGTH && !submitting.current) {
      submitting.current = true
      await unlock(v)
      setPin('')
      submitting.current = false
    }
  }, [unlock])

  // --- Import flow ---
  const startImport = () => {
    setImportValue('')
    setImportMode('mnemonic')
    setLocalError(null)
    setView('import-input')
  }

  const continueImport = async () => {
    if (!importValue.trim()) return
    setLocalError(null)
    if (isBiometricSupported()) {
      try {
        await verifyBiometric()
      } catch (e) {
        setLocalError((e as Error).message || 'Biometric verification failed.')
        return
      }
    }
    setPin('')
    setView('import-pin')
  }

  const handleImportPin = useCallback(async (v: string) => {
    setPin(v)
    if (v.length === PIN_LENGTH && !submitting.current) {
      const trimmed = importValue.trim()
      if (!trimmed) return
      submitting.current = true
      if (importMode === 'mnemonic') {
        await importWalletFromMnemonic(trimmed, v)
      } else {
        await importWalletFromKey(trimmed, v)
      }
      setPin('')
      setImportValue('')
      submitting.current = false
    }
  }, [importValue, importMode, importWalletFromMnemonic, importWalletFromKey])

  // --- Disconnect ---
  const handleDisconnect = () => {
    disconnect()
    setView('idle')
  }

  // --- Mnemonic acknowledgement ---
  const handleMnemonicAck = () => {
    acknowledgeMnemonic()
    setView('idle')
  }

  if (!visible && !pendingMnemonic) return null

  // If wallet is unlocked but pending mnemonic needs acknowledgement
  if (unlocked && pendingMnemonic) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold">Save Your Recovery Phrase</h2>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] text-center mb-5">
            Write down these 12 words and store them securely. This is the only way to recover your wallet.
          </p>
          <MnemonicGrid mnemonic={pendingMnemonic} onDone={handleMnemonicAck} doneLabel="I've Saved My Recovery Phrase" />
        </div>
      </div>
    )
  }

  const displayError = localError || error

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center px-6 pb-24">
      <div className="w-full max-w-sm">

        {/* Biometric unlocking in progress */}
        {view === 'biometric-unlocking' && (
          <div className="flex flex-col items-center py-8">
            <Fingerprint size={48} className="text-gray-400 mb-4 animate-pulse" />
            <p className="text-sm text-[var(--color-text-secondary)]">Verifying identity...</p>
          </div>
        )}

        {/* Idle: no wallet */}
        {view === 'idle' && !hasExistingWallet && (
          <>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={24} className="text-gray-500" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-center mb-1">Welcome to Umbra</h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-8">
              Create or import a wallet to get started.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={startCreate}
                disabled={isLoading}
                className="tap-feedback w-full py-3 rounded-xl bg-[var(--color-accent)] text-black text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Plus size={16} /> Create Wallet
              </button>
              <button
                type="button"
                onClick={startImport}
                disabled={isLoading}
                className="tap-feedback w-full py-3 rounded-xl bg-black text-white text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Key size={16} /> Import Wallet
              </button>
            </div>
          </>
        )}

        {/* Idle: wallet locked */}
        {view === 'idle' && hasExistingWallet && (
          <>
            <div className="flex items-center justify-center mb-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <Lock size={24} className="text-gray-500" />
              </div>
            </div>
            <h2 className="text-lg font-semibold text-center mb-1">Wallet Locked</h2>
            <p className="text-sm text-[var(--color-text-secondary)] text-center mb-8">
              Unlock your wallet to continue.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => { setPin(''); setView('unlock') }}
                disabled={isLoading}
                className="tap-feedback w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 bg-black text-white"
              >
                <Unlock size={16} /> Unlock with PIN
              </button>
              <button
                type="button"
                onClick={() => setView('disconnect-confirm')}
                className="tap-feedback w-full py-3 rounded-xl border border-red-200 text-red-500 text-sm font-medium flex items-center justify-center gap-2"
              >
                <LogOut size={16} /> Disconnect Wallet
              </button>
            </div>
          </>
        )}

        {/* Create: set PIN */}
        {view === 'create-pin' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={18} className="text-gray-600" />
              <h2 className="text-base font-semibold">Set a PIN</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 text-center">
              Choose a 6-digit PIN to protect your wallet.
            </p>
            <PinGrid value={pin} onChange={handleCreatePin} autoFocus disabled={isLoading} />
            <button type="button" onClick={resetToIdle} className="w-full mt-4 text-sm text-[var(--color-text-secondary)]">
              Cancel
            </button>
          </>
        )}

        {/* Create: confirm PIN */}
        {view === 'create-confirm' && (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={18} className="text-gray-600" />
              <h2 className="text-base font-semibold">Confirm PIN</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 text-center">
              Enter your PIN again to confirm.
            </p>
            <PinGrid value={confirmPin} onChange={handleConfirmPin} autoFocus disabled={isLoading} />
            {pinMismatch && (
              <p className="text-xs text-red-500 mt-3 text-center">PINs don't match. Try again.</p>
            )}
            {isLoading && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-3 text-center">Creating wallet...</p>
            )}
            <button type="button" onClick={resetToIdle} className="w-full mt-4 text-sm text-[var(--color-text-secondary)]">
              Cancel
            </button>
          </>
        )}

        {/* Unlock with PIN */}
        {view === 'unlock' && (
          <>
            <h2 className="text-base font-semibold mb-2 text-center">Enter PIN</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 text-center">
              Enter your PIN to unlock your wallet.
            </p>
            <PinGrid value={pin} onChange={handleUnlockPin} autoFocus disabled={isLoading} />
            {isLoading && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-3 text-center">Unlocking...</p>
            )}
            <button type="button" onClick={resetToIdle} className="w-full mt-3 text-sm text-[var(--color-text-secondary)]">
              Back
            </button>
          </>
        )}

        {/* Import: input */}
        {view === 'import-input' && (
          <>
            <h2 className="text-base font-semibold mb-4 text-center">Import Wallet</h2>
            <div className="flex rounded-lg bg-gray-100 p-0.5 mb-4">
              <button
                type="button"
                onClick={() => { setImportMode('mnemonic'); setImportValue('') }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${importMode === 'mnemonic' ? 'bg-white shadow-sm' : ''}`}
              >
                Recovery Phrase
              </button>
              <button
                type="button"
                onClick={() => { setImportMode('privateKey'); setImportValue('') }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${importMode === 'privateKey' ? 'bg-white shadow-sm' : ''}`}
              >
                Private Key
              </button>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              {importMode === 'mnemonic'
                ? 'Enter your 12-word recovery phrase separated by spaces.'
                : 'Paste your Solana private key (base58 encoded).'}
            </p>
            <textarea
              value={importValue}
              onChange={(e) => setImportValue(e.target.value)}
              placeholder={importMode === 'mnemonic' ? 'word1 word2 word3 ...' : 'Private key...'}
              rows={3}
              className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-mono-accent resize-none focus:outline-none focus:border-gray-400"
            />
            <button
              type="button"
              onClick={continueImport}
              disabled={!importValue.trim() || isLoading}
              className="tap-feedback w-full mt-4 py-3 rounded-xl bg-black text-white text-sm font-medium disabled:opacity-40"
            >
              Continue
            </button>
            <button type="button" onClick={resetToIdle} className="w-full mt-3 text-sm text-[var(--color-text-secondary)]">
              Cancel
            </button>
          </>
        )}

        {/* Import: PIN */}
        {view === 'import-pin' && (
          <>
            <h2 className="text-base font-semibold mb-2 text-center">Set a PIN</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 text-center">
              Choose a 6-digit PIN to protect your wallet.
            </p>
            <PinGrid value={pin} onChange={handleImportPin} autoFocus disabled={isLoading} />
            {isLoading && (
              <p className="text-xs text-[var(--color-text-secondary)] mt-3 text-center">Importing...</p>
            )}
            <button type="button" onClick={() => setView('import-input')} className="w-full mt-4 text-sm text-[var(--color-text-secondary)]">
              Back
            </button>
          </>
        )}

        {/* Mnemonic backup (shown after creation) */}
        {view === 'mnemonic-backup' && pendingMnemonic && (
          <>
            <div className="flex items-center justify-center gap-2 mb-2">
              <Shield size={20} className="text-gray-600" />
              <h2 className="text-lg font-semibold">Save Your Recovery Phrase</h2>
            </div>
            <p className="text-xs text-[var(--color-text-secondary)] text-center mb-5">
              Write down these 12 words and store them securely. This is the only way to recover your wallet.
            </p>
            <MnemonicGrid mnemonic={pendingMnemonic} onDone={handleMnemonicAck} doneLabel="I've Saved My Recovery Phrase" />
          </>
        )}

        {/* Disconnect confirm */}
        {view === 'disconnect-confirm' && (
          <>
            <h2 className="text-base font-semibold mb-2 text-center">Disconnect Wallet?</h2>
            <p className="text-xs text-[var(--color-text-secondary)] mb-5 text-center">
              This will remove your local wallet data and cannot be undone. Make sure you have backed up your recovery phrase.
            </p>
            <div className="flex gap-3">
              <button type="button" onClick={resetToIdle} className="btn-outline tap-feedback flex-1 py-3 rounded-xl text-sm font-medium">
                Cancel
              </button>
              <button type="button" onClick={handleDisconnect} className="tap-feedback flex-1 py-3 rounded-xl text-sm font-medium bg-red-500 text-white">
                Disconnect
              </button>
            </div>
          </>
        )}

        {displayError && (
          <p className="text-xs text-red-500 mt-4 text-center">{displayError}</p>
        )}
      </div>
    </div>
  )
}
