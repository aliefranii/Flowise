import { JUBIR_AUTH_NOT_INITIALIZED, resolveJubirJwtSecret, validateJubirSecrets } from './env'
import { signAccessToken, signRefreshToken } from '../auth/jwt'
import { Role } from './rbac.config'

describe('jubir env secret validation (fail-fast)', () => {
    const savedEnv = { ...process.env }

    beforeEach(() => {
        delete process.env.JUBIR_JWT_SECRET
        delete process.env.JUBIR_JWT_ACCESS_SECRET
        delete process.env.JUBIR_JWT_REFRESH_SECRET
        delete process.env.JUBIR_REQUIRE_LICENSE
        delete process.env.JUBIR_LICENSE_KEY
    })

    afterAll(() => {
        process.env = savedEnv
    })

    it('fails fast on startup when all JWT secrets are empty or whitespace-only', () => {
        expect(() => validateJubirSecrets()).toThrow('Missing required Jubir auth secret(s)')

        process.env.JUBIR_JWT_SECRET = '   '
        expect(() => validateJubirSecrets()).toThrow('Missing required Jubir auth secret(s)')
    })

    it('fails fast when only one of split access/refresh secrets is provided without JUBIR_JWT_SECRET', () => {
        process.env.JUBIR_JWT_ACCESS_SECRET = 'access-only'
        expect(() => validateJubirSecrets()).toThrow('JUBIR_JWT_REFRESH_SECRET')

        delete process.env.JUBIR_JWT_ACCESS_SECRET
        process.env.JUBIR_JWT_REFRESH_SECRET = 'refresh-only'
        expect(() => validateJubirSecrets()).toThrow('JUBIR_JWT_ACCESS_SECRET')
    })

    it('passes startup validation with JUBIR_JWT_SECRET or both split secrets', () => {
        process.env.JUBIR_JWT_SECRET = 'shared-secret'
        expect(() => validateJubirSecrets()).not.toThrow()

        delete process.env.JUBIR_JWT_SECRET
        process.env.JUBIR_JWT_ACCESS_SECRET = 'access-secret'
        process.env.JUBIR_JWT_REFRESH_SECRET = 'refresh-secret'
        expect(() => validateJubirSecrets()).not.toThrow()
    })

    it('fails fast when JUBIR_REQUIRE_LICENSE=true and JUBIR_LICENSE_KEY is missing or blank', () => {
        process.env.JUBIR_JWT_SECRET = 'shared-secret'
        process.env.JUBIR_REQUIRE_LICENSE = 'true'
        expect(() => validateJubirSecrets()).toThrow('JUBIR_LICENSE_KEY')

        process.env.JUBIR_LICENSE_KEY = '   '
        expect(() => validateJubirSecrets()).toThrow('JUBIR_LICENSE_KEY')

        process.env.JUBIR_LICENSE_KEY = 'valid-license'
        expect(() => validateJubirSecrets()).not.toThrow()
    })

    it('rejects token signing at runtime when secrets are unset or whitespace-only', () => {
        expect(() => resolveJubirJwtSecret('access')).toThrow(JUBIR_AUTH_NOT_INITIALIZED)
        expect(() => resolveJubirJwtSecret('refresh')).toThrow(JUBIR_AUTH_NOT_INITIALIZED)

        process.env.JUBIR_JWT_SECRET = '   '
        const payload = {
            sub: 'u1',
            email: 'u1@jubir.local',
            role: Role.USER,
            regionId: null,
            organizationId: null,
            workspaceId: null,
            sid: 's1'
        }
        expect(() => signAccessToken(payload)).toThrow(JUBIR_AUTH_NOT_INITIALIZED)
        expect(() => signRefreshToken(payload)).toThrow(JUBIR_AUTH_NOT_INITIALIZED)
    })
})
