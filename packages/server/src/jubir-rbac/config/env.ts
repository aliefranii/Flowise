export const JUBIR_AUTH_NOT_INITIALIZED = 'JUBIR_AUTH_NOT_INITIALIZED'

/**
 * Resolves the JWT signing secret for access or refresh tokens without falling back to any default.
 * Whitespace-only values are treated as unset.
 */
export function resolveJubirJwtSecret(kind: 'access' | 'refresh'): string {
    const secret =
        kind === 'access'
            ? process.env.JUBIR_JWT_ACCESS_SECRET?.trim() || process.env.JUBIR_JWT_SECRET?.trim()
            : process.env.JUBIR_JWT_REFRESH_SECRET?.trim() || process.env.JUBIR_JWT_SECRET?.trim()
    if (!secret) throw new Error(JUBIR_AUTH_NOT_INITIALIZED)
    return secret
}

/**
 * Validates required Jubir secrets at server startup (fail fast; never uses default secrets).
 */
export function validateJubirSecrets(): void {
    const accessSecret = process.env.JUBIR_JWT_ACCESS_SECRET?.trim() || process.env.JUBIR_JWT_SECRET?.trim()
    const refreshSecret = process.env.JUBIR_JWT_REFRESH_SECRET?.trim() || process.env.JUBIR_JWT_SECRET?.trim()

    const missing: string[] = []
    if (!accessSecret) missing.push('JUBIR_JWT_ACCESS_SECRET (or JUBIR_JWT_SECRET)')
    if (!refreshSecret) missing.push('JUBIR_JWT_REFRESH_SECRET (or JUBIR_JWT_SECRET)')

    if (missing.length > 0) {
        throw new Error(`Missing required Jubir auth secret(s): ${missing.join(', ')}. Refusing to start with empty or default secrets.`)
    }

    if (process.env.JUBIR_REQUIRE_LICENSE === 'true' && !process.env.JUBIR_LICENSE_KEY?.trim()) {
        throw new Error('Missing required JUBIR_LICENSE_KEY while JUBIR_REQUIRE_LICENSE=true.')
    }
}
