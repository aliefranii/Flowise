import express, { NextFunction, Request, Response } from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { Role } from '../config/rbac.config'
import { signAccessToken } from '../auth/jwt'
import { JubirOrganization, JubirSession, JubirUser } from '../entities'

const mockUserRepo = { findOne: jest.fn() }
const mockSessionRepo = { findOne: jest.fn() }
const mockOrgRepo = { findOne: jest.fn() }

jest.mock('../../DataSource', () => ({
    getDataSource: () => ({
        getRepository: (entity: unknown) => {
            if (entity === JubirUser) return mockUserRepo
            if (entity === JubirSession) return mockSessionRepo
            if (entity === JubirOrganization) return mockOrgRepo
            return {}
        }
    })
}))

import { requireJubirAuth, requireJubirRoles } from './jubirAuth'
import { requireJubirSubscription } from './jubirSubscription'

describe('jubirAuth & jubirSubscription middlewares', () => {
    const validUser = {
        id: 'user-1',
        email: 'admin@jubir.local',
        name: 'Admin',
        role: Role.SUPER_ADMIN,
        regionId: 'region-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        organization: {
            id: 'org-1',
            name: 'Org 1',
            regionId: 'region-1',
            subscriptionStatus: 'ACTIVE'
        },
        workspace: {
            id: 'ws-1',
            name: 'Workspace 1',
            organizationId: 'org-1',
            storeId: null
        }
    }

    const validSession = {
        id: 'sess-1',
        revokedAt: null,
        expiresAt: new Date(Date.now() + 60_000)
    }

    let token: string

    beforeAll(() => {
        process.env.JUBIR_JWT_SECRET = 'test-jubir-secret'
        token = signAccessToken({
            sub: validUser.id,
            email: validUser.email,
            role: validUser.role,
            regionId: validUser.regionId,
            organizationId: validUser.organizationId,
            workspaceId: validUser.workspaceId,
            sid: validSession.id
        })
    })

    beforeEach(() => {
        jest.clearAllMocks()
        mockUserRepo.findOne.mockResolvedValue(validUser)
        mockSessionRepo.findOne.mockResolvedValue(validSession)
        mockOrgRepo.findOne.mockResolvedValue({
            id: 'org-1',
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiresAt: null
        })
    })

    function createApp() {
        const app = express()
        app.use(cookieParser())
        app.get('/protected', requireJubirAuth, (req, res) => {
            res.json({ jubirUser: req.jubirUser, hasLegacyUser: Boolean(req.user) })
        })
        app.get('/admin-only', requireJubirAuth, requireJubirRoles(Role.SUPER_ADMIN), (_req, res) => {
            res.json({ ok: true })
        })
        app.get('/paywalled', requireJubirSubscription('feat:datasets'), (_req, res) => {
            res.json({ ok: true })
        })
        app.get(
            '/paywalled-apikey',
            (req, _res, next) => {
                req.jubirUser = {
                    id: 'apikey-1',
                    email: '',
                    name: 'Test Key',
                    role: Role.USER,
                    regionId: 'region-1',
                    organizationId: 'org-1',
                    workspaceId: 'ws-1'
                }
                next()
            },
            requireJubirSubscription('feat:datasets'),
            (_req, res) => {
                res.json({ ok: true })
            }
        )
        app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
            res.status(500).json({ error: err.message })
        })
        return app
    }

    it('authenticates via Authorization Bearer header without setting req.user', async () => {
        const res = await request(createApp()).get('/protected').set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(200)
        expect(res.body.jubirUser.id).toBe('user-1')
        expect(res.body.hasLegacyUser).toBe(false)
    })

    it('authenticates via jubirAccessToken cookie', async () => {
        const res = await request(createApp()).get('/protected').set('Cookie', `jubirAccessToken=${token}`)
        expect(res.status).toBe(200)
        expect(res.body.jubirUser.email).toBe('admin@jubir.local')
    })

    it('returns 401 when token is missing', async () => {
        const res = await request(createApp()).get('/protected')
        expect(res.status).toBe(401)
    })

    it('returns 401 when session is revoked', async () => {
        mockSessionRepo.findOne.mockResolvedValue({ ...validSession, revokedAt: new Date() })
        const res = await request(createApp()).get('/protected').set('Authorization', `Bearer ${token}`)
        expect(res.status).toBe(401)
    })

    it('enforces requireJubirRoles', async () => {
        const app = createApp()
        const okRes = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`)
        expect(okRes.status).toBe(200)

        mockUserRepo.findOne.mockResolvedValue({ ...validUser, role: Role.USER })
        const forbiddenRes = await request(app).get('/admin-only').set('Authorization', `Bearer ${token}`)
        expect(forbiddenRes.status).toBe(403)
    })

    it('enforces requireJubirSubscription on active vs inactive org', async () => {
        const app = createApp()
        const okRes = await request(app).get('/paywalled').set('Authorization', `Bearer ${token}`)
        expect(okRes.status).toBe(200)

        mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', subscriptionStatus: 'INACTIVE', subscriptionExpiresAt: null })
        const paywallRes = await request(app).get('/paywalled').set('Authorization', `Bearer ${token}`)
        expect(paywallRes.status).toBe(402)
        expect(paywallRes.body.feature).toBe('feat:datasets')
    })

    it('allows pre-populated API Key req.jubirUser through requireJubirSubscription without requiring JWT', async () => {
        const app = createApp()
        const okRes = await request(app).get('/paywalled-apikey')
        expect(okRes.status).toBe(200)
        expect(mockSessionRepo.findOne).not.toHaveBeenCalled()

        mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', subscriptionStatus: 'INACTIVE', subscriptionExpiresAt: null })
        const paywallRes = await request(app).get('/paywalled-apikey')
        expect(paywallRes.status).toBe(402)
    })

    it('forwards database errors in requireJubirSubscription to Express error handler', async () => {
        mockOrgRepo.findOne.mockRejectedValue(new Error('db failure'))
        const res = await request(createApp()).get('/paywalled-apikey')
        expect(res.status).toBe(500)
        expect(res.body.error).toBe('db failure')
    })
})
