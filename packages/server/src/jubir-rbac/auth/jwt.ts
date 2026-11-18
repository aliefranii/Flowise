import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { resolveJubirJwtSecret } from '../config/env'
import { Role } from '../config/rbac.config'

const DEFAULT_ACCESS_TTL_SECONDS = 60 * 60
const DEFAULT_REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7

export interface JubirTokenPayload {
    sub: string
    email: string
    role: Role
    regionId: string | null
    organizationId: string | null
    workspaceId: string | null
    sid: string
    typ: 'access' | 'refresh'
}

function getSecret(kind: 'access' | 'refresh'): string {
    return resolveJubirJwtSecret(kind)
}

function ttl(kind: 'access' | 'refresh'): number {
    const raw = kind === 'access' ? process.env.JUBIR_JWT_ACCESS_TTL_SECONDS : process.env.JUBIR_JWT_REFRESH_TTL_SECONDS
    const parsed = raw ? parseInt(raw, 10) : NaN
    if (Number.isFinite(parsed) && parsed > 0) return parsed
    return kind === 'access' ? DEFAULT_ACCESS_TTL_SECONDS : DEFAULT_REFRESH_TTL_SECONDS
}

export function signAccessToken(payload: Omit<JubirTokenPayload, 'typ'>): string {
    return jwt.sign({ ...payload, typ: 'access' }, getSecret('access'), { expiresIn: ttl('access') })
}

export function signRefreshToken(payload: Omit<JubirTokenPayload, 'typ'>): string {
    return jwt.sign({ ...payload, typ: 'refresh' }, getSecret('refresh'), { expiresIn: ttl('refresh') })
}

export function verifyAccessToken(token: string): JubirTokenPayload {
    const decoded = jwt.verify(token, getSecret('access')) as JubirTokenPayload
    if (decoded.typ !== 'access') throw new Error('Invalid token type')
    return decoded
}

export function verifyRefreshToken(token: string): JubirTokenPayload {
    const decoded = jwt.verify(token, getSecret('refresh')) as JubirTokenPayload
    if (decoded.typ !== 'refresh') throw new Error('Invalid token type')
    return decoded
}

export function refreshTokenExpiryDate(): Date {
    return new Date(Date.now() + ttl('refresh') * 1000)
}

export function hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex')
}
