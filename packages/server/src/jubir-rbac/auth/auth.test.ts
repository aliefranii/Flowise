import { hashPassword, verifyPassword } from './password'
import { validateEmail, validatePassword } from './validation'
import { hashRefreshToken, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from './jwt'
import { Role } from '../config/rbac.config'

describe('jubir auth', () => {
    const payload = {
        sub: 'user-1',
        email: 'a@b.com',
        role: Role.USER,
        regionId: 'r1',
        organizationId: 'o1',
        workspaceId: 'w1',
        sid: 's1'
    }

    beforeAll(() => {
        process.env.JUBIR_JWT_SECRET = 'test-secret-value'
    })

    it('hashes and verifies password', () => {
        const hash = hashPassword('Secret#123')
        expect(verifyPassword('Secret#123', hash)).toBe(true)
        expect(verifyPassword('wrong', hash)).toBe(false)
    })

    it('rejects tampered password hash', () => {
        expect(verifyPassword('Secret#123', 'not-a-valid-hash')).toBe(false)
    })

    it('validates email and password rules', () => {
        expect(validateEmail('USER@Example.com')).toBe('user@example.com')
        expect(() => validateEmail('bad-email')).toThrow()
        expect(() => validatePassword('short')).toThrow()
        expect(() => validatePassword('nospecial1A')).toThrow()
        expect(() => validatePassword('Good#Pass1')).not.toThrow()
    })

    it('signs and verifies access tokens', () => {
        const token = signAccessToken(payload)
        const decoded = verifyAccessToken(token)
        expect(decoded.sub).toBe(payload.sub)
        expect(decoded.typ).toBe('access')
    })

    it('rejects refresh token used as access token', () => {
        const token = signRefreshToken(payload)
        expect(() => verifyAccessToken(token)).toThrow()
        expect(verifyRefreshToken(token).typ).toBe('refresh')
    })

    it('hashes refresh tokens deterministically', () => {
        const token = signRefreshToken(payload)
        expect(hashRefreshToken(token)).toBe(hashRefreshToken(token))
        expect(hashRefreshToken(token)).toHaveLength(64)
    })
})
