import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt)
const KEY_LENGTH = 64

export const SESSION_COOKIE = 'rb_session'
export const SESSION_DAYS = 30
export const MIN_PASSWORD_LENGTH = 8

// Stored as "scrypt$<salt hex>$<hash hex>".
export async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = stored.split('$')
  if (scheme !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

// Used when an email is unknown, so sign-in takes the same time either way.
export const DUMMY_HASH = await hashPassword('dummy-password-for-timing')

export function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : ''
}

export function isValidEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function newSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}
