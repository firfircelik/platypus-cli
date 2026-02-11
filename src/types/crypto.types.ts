export interface EncryptedKey {
  version: number
  algorithm: string
  iv: string
  ciphertext: string
  tag: string
  salt: string
}

export interface ProviderKey {
  provider: string
  keyId: string
  createdAt: Date
  updatedAt: Date
  lastValidated: Date | null
  valid: boolean
  metadata?: Record<string, unknown>
}

export interface KeyValidationResult {
  valid: boolean
  provider: string
  error?: string
  usage?: number
  limit?: number
  resetAt?: Date
}

export interface KeyRotationConfig {
  autoRotate: boolean
  rotationInterval: number
  notifyBefore: number
  keepOldVersions: number
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc'
  keyDerivation: 'pbkdf2' | 'scrypt' | 'argon2id'
  iterations: number
  saltLength: number
}
