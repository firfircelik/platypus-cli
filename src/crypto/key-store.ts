import crypto from 'node:crypto'
import keytar from 'keytar'
import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'
import type {
  EncryptedKey,
  ProviderKey,
  KeyValidationResult,
  EncryptionConfig
} from '../types/crypto.types.js'
import { getPlatypusStateDir } from '../core/paths.js'

const SERVICE_NAME = 'platypus-cli'
const DEFAULT_ENCRYPTION_CONFIG: EncryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: 'pbkdf2',
  iterations: 100000,
  saltLength: 32
}

export class KeyStore {
  private db: Database.Database
  private config: EncryptionConfig
  private masterKey: Buffer | null = null

  constructor(config?: EncryptionConfig, dbPath?: string) {
    this.config = config ?? DEFAULT_ENCRYPTION_CONFIG
    const resolvedDbPath = dbPath ?? path.join(getPlatypusStateDir(), 'keys.db')
    const dbDir = path.dirname(resolvedDbPath)
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }
    
    this.db = new Database(resolvedDbPath)
    this.initializeDatabase()
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS keys (
        provider TEXT PRIMARY KEY,
        key_id TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1,
        algorithm TEXT NOT NULL,
        iv TEXT NOT NULL,
        ciphertext TEXT NOT NULL,
        tag TEXT NOT NULL,
        salt TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        last_validated TEXT,
        valid INTEGER NOT NULL DEFAULT 1,
        metadata TEXT
      )
    `)
  }

  async initialize(): Promise<void> {
    await this.loadMasterKey()
  }

  private async loadMasterKey(): Promise<void> {
    const envMaster = (process.env.PLATYPUS_MASTER_KEY ?? '').trim()
    if (envMaster.length > 0) {
      this.masterKey = Buffer.from(envMaster, 'hex')
      if (this.masterKey.length !== 32) throw new Error('PLATYPUS_MASTER_KEY must be 32 bytes hex (64 chars)')
      return
    }

    const fallbackPath = path.join(getPlatypusStateDir(), 'master.key')

    try {
      let masterKey: string | null = await keytar.getPassword(SERVICE_NAME, 'master')
      if (!masterKey) {
        masterKey = this.generateMasterKey()
        await keytar.setPassword(SERVICE_NAME, 'master', masterKey)
      }
      this.masterKey = Buffer.from(masterKey, 'hex')
      return
    } catch {
      const fromFile = this.loadMasterKeyFromFile(fallbackPath)
      if (fromFile) {
        this.masterKey = Buffer.from(fromFile, 'hex')
        if (this.masterKey.length !== 32) throw new Error(`Invalid master key in ${fallbackPath}`)
        return
      }
      const generated = this.generateMasterKey()
      this.writeMasterKeyToFile(fallbackPath, generated)
      this.masterKey = Buffer.from(generated, 'hex')
    }
  }

  private loadMasterKeyFromFile(filePath: string): string | null {
    try {
      if (!fs.existsSync(filePath)) return null
      const raw = fs.readFileSync(filePath, 'utf8').trim()
      return raw.length > 0 ? raw : null
    } catch {
      return null
    }
  }

  private writeMasterKeyToFile(filePath: string, masterKey: string): void {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    try {
      fs.writeFileSync(filePath, `${masterKey}\n`, { encoding: 'utf8', mode: 0o600 })
    } catch {
      fs.writeFileSync(filePath, `${masterKey}\n`, 'utf8')
    }
  }

  private generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  private deriveKey(password: Buffer, salt: Buffer): Buffer {
    if (this.config.keyDerivation === 'pbkdf2') {
      return crypto.pbkdf2Sync(
        password,
        salt,
        this.config.iterations,
        32,
        'sha256'
      )
    }
    
    if (this.config.keyDerivation === 'scrypt') {
      return crypto.scryptSync(password, salt, 32)
    }
    
    throw new Error(`Unsupported key derivation: ${this.config.keyDerivation}`)
  }

  async encryptKey(plainKey: string, provider: string): Promise<EncryptedKey> {
    if (!this.masterKey) {
      throw new Error('KeyStore not initialized')
    }
    this.validateProvider(provider)
    this.validateApiKey(plainKey)

    const salt = crypto.randomBytes(this.config.saltLength)
    const key = this.deriveKey(this.masterKey, salt)
    const iv = crypto.randomBytes(16)
    
    const cipher = crypto.createCipheriv(this.config.algorithm, key, iv)
    
    let ciphertext = cipher.update(plainKey, 'utf8', 'hex')
    ciphertext += cipher.final('hex')
    
    const tag =
      this.config.algorithm === 'aes-256-gcm'
        ? (cipher as crypto.CipherGCM).getAuthTag().toString('hex')
        : ''
    
    return {
      version: 1,
      algorithm: this.config.algorithm,
      iv: iv.toString('hex'),
      ciphertext,
      tag,
      salt: salt.toString('hex')
    }
  }

  async decryptKey(encrypted: EncryptedKey): Promise<string> {
    if (!this.masterKey) {
      throw new Error('KeyStore not initialized')
    }

    const salt = Buffer.from(encrypted.salt, 'hex')
    const key = this.deriveKey(this.masterKey, salt)
    const iv = Buffer.from(encrypted.iv, 'hex')
    
    const decipher = crypto.createDecipheriv(encrypted.algorithm, key, iv)
    
    if (encrypted.tag && encrypted.algorithm === 'aes-256-gcm') {
      ;(decipher as crypto.DecipherGCM).setAuthTag(Buffer.from(encrypted.tag, 'hex'))
    }
    
    let plaintext = decipher.update(encrypted.ciphertext, 'hex', 'utf8')
    plaintext += decipher.final('utf8')
    
    return plaintext
  }

  async storeKey(provider: string, apiKey: string, metadata?: Record<string, unknown>): Promise<void> {
    this.validateProvider(provider)
    this.validateApiKey(apiKey)
    const encrypted = await this.encryptKey(apiKey, provider)
    const keyId = crypto.createHash('sha256').update(apiKey).digest('hex').slice(0, 16)
    
    const now = new Date().toISOString()
    
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO keys 
      (provider, key_id, version, algorithm, iv, ciphertext, tag, salt, created_at, updated_at, valid, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      provider,
      keyId,
      encrypted.version,
      encrypted.algorithm,
      encrypted.iv,
      encrypted.ciphertext,
      encrypted.tag,
      encrypted.salt,
      now,
      now,
      1,
      metadata ? JSON.stringify(metadata) : null
    )
  }

  async getKey(provider: string): Promise<string> {
    this.validateProvider(provider)
    const row = this.db.prepare('SELECT * FROM keys WHERE provider = ?').get(provider) as any
    
    if (!row) {
      throw new Error(`No key found for provider: ${provider}`)
    }
    
    const encrypted: EncryptedKey = {
      version: row.version,
      algorithm: row.algorithm,
      iv: row.iv,
      ciphertext: row.ciphertext,
      tag: row.tag,
      salt: row.salt
    }
    
    return this.decryptKey(encrypted)
  }

  async listKeys(): Promise<ProviderKey[]> {
    const rows = this.db.prepare('SELECT * FROM keys').all() as any[]
    
    return rows.map(row => ({
      provider: row.provider,
      keyId: row.key_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      lastValidated: row.last_validated ? new Date(row.last_validated) : null,
      valid: row.valid === 1,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined
    }))
  }

  async deleteKey(provider: string): Promise<void> {
    this.validateProvider(provider)
    const stmt = this.db.prepare('DELETE FROM keys WHERE provider = ?')
    const result = stmt.run(provider)
    
    if (result.changes === 0) {
      throw new Error(`No key found for provider: ${provider}`)
    }
  }

  async validateKey(provider: string, validator?: (key: string) => Promise<boolean>): Promise<KeyValidationResult> {
    this.validateProvider(provider)
    try {
      const key = await this.getKey(provider)
      
      if (validator) {
        const valid = await validator(key)
        
        const now = new Date().toISOString()
        const updateStmt = this.db.prepare(`
          UPDATE keys SET last_validated = ?, valid = ? WHERE provider = ?
        `)
        updateStmt.run(now, valid ? 1 : 0, provider)
        
        return {
          valid,
          provider
        }
      }
      
      return {
        valid: true,
        provider
      }
    } catch (error) {
      return {
        valid: false,
        provider,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  async rotateKey(provider: string): Promise<void> {
    this.validateProvider(provider)
    const key = await this.getKey(provider)
    await this.storeKey(provider, key)
  }

  close(): void {
    this.db.close()
  }

  private validateProvider(provider: string): void {
    if (!/^[a-z0-9][a-z0-9._-]{1,63}$/.test(provider)) {
      throw new Error('Invalid provider name')
    }
  }

  private validateApiKey(apiKey: string): void {
    if (typeof apiKey !== 'string') {
      throw new Error('API key must be a string')
    }
    const trimmed = apiKey.trim()
    if (trimmed.length < 16 || trimmed.length > 4096) {
      throw new Error('Invalid API key length')
    }
  }
}
