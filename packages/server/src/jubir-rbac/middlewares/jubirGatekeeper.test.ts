import express from 'express'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { Role } from '../config/rbac.config'
import { signAccessToken } from '../auth/jwt'
import { JubirOrganization, JubirSession, JubirUser, JubirWorkspace } from '../entities'

const mockUserRepo = { findOne: jest.fn() }
const mockSessionRepo = { findOne: jest.fn() }
const mockOrgRepo = { findOne: jest.fn() }
const mockWorkspaceRepo = { findOne: jest.fn() }
const mockValidateAPIKey = jest.fn()

jest.mock('../../DataSource', () => ({
    getDataSource: () => ({
        getRepository: (entity: unknown) => {
            if (entity === JubirUser) return mockUserRepo
            if (entity === JubirSession) return mockSessionRepo
            if (entity === JubirOrganization) return mockOrgRepo
            if (entity === JubirWorkspace) return mockWorkspaceRepo
            return {}
        }
    })
}))

jest.mock('../../utils/validateKey', () => ({
    validateAPIKey: (...args: unknown[]) => mockValidateAPIKey(...args)
}))

import { attachJubirUser } from './attachJubirUser'
import { createJubirApiGatekeeper } from './jubirGatekeeper'
import { requireJubirSubscription } from './jubirSubscription'

describe('createJubirApiGatekeeper', () => {
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

    const fakeDataSource = {
        getRepository: (entity: unknown) => {
            if (entity === JubirWorkspace) return mockWorkspaceRepo
            return {}
        }
    } as unknown as DataSource

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
        delete process.env.JUBIR_REQUIRE_LICENSE
        delete process.env.JUBIR_LICENSE_KEY

        mockUserRepo.findOne.mockResolvedValue(validUser)
        mockSessionRepo.findOne.mockResolvedValue(validSession)
        mockOrgRepo.findOne.mockResolvedValue({
            id: 'org-1',
            subscriptionStatus: 'ACTIVE',
            subscriptionExpiresAt: null
        })
        mockWorkspaceRepo.findOne.mockResolvedValue({
            id: 'ws-1',
            name: 'Workspace 1',
            organizationId: 'org-1',
            storeId: null,
            organization: {
                id: 'org-1',
                name: 'Org 1',
                regionId: 'region-1',
                subscriptionStatus: 'ACTIVE'
            }
        })
        mockValidateAPIKey.mockResolvedValue({
            isValid: true,
            apiKey: { id: 'key-1', keyName: 'My Key', workspaceId: 'ws-1', permissions: [] }
        })
    })

    function createApp() {
        const app = express()
        app.use(cookieParser())
        app.use(attachJubirUser)
        app.use(
            createJubirApiGatekeeper({
                whitelistURLs: ['/api/v1/ping'],
                dataSource: fakeDataSource
            })
        )
        app.get('/assets/app.js', (_req, res) => res.json({ ok: true }))
        app.get('/api/v1/ping', (_req, res) => res.json({ ok: true }))
        app.get('/api/v1/jubir/regions', (_req, res) => res.json({ ok: true }))
        app.get('/api/v1/chatflows', (req, res) => {
            res.json({ jubirUser: req.jubirUser, hasLegacyUser: Boolean(req.user) })
        })
        app.get('/api/v1/datasets', requireJubirSubscription('feat:datasets'), (req, res) => {
            res.json({ jubirUser: req.jubirUser, hasLegacyUser: Boolean(req.user) })
        })
        return app
    }

    it('allows non-api paths and whitelisted or /api/v1/jubir paths through', async () => {
        const app = createApp()
        expect((await request(app).get('/assets/app.js')).status).toBe(200)
        expect((await request(app).get('/api/v1/ping')).status).toBe(200)
        expect((await request(app).get('/api/v1/jubir/regions')).status).toBe(200)
    })

    it('rejects non-lowercase /api/v1/ prefix', async () => {
        const res = await request(createApp()).get('/API/v1/chatflows')
        expect(res.status).toBe(401)
    })

    it('enforces requireJubirAuth for x-request-from: internal requests', async () => {
        const app = createApp()
        const noAuth = await request(app).get('/api/v1/chatflows').set('x-request-from', 'internal')
        expect(noAuth.status).toBe(401)

        const withCookie = await request(app)
            .get('/api/v1/chatflows')
            .set('x-request-from', 'internal')
            .set('Cookie', `jubirAccessToken=${token}`)
        expect(withCookie.status).toBe(200)
        expect(withCookie.body.jubirUser.id).toBe('user-1')
    })

    it('authenticates API Key via JubirWorkspace without setting req.user and works with requireJubirSubscription', async () => {
        const app = createApp()
        const res = await request(app).get('/api/v1/datasets').set('Authorization', 'Bearer flowise-api-key-secret')
        expect(res.status).toBe(200)
        expect(res.body.jubirUser.id).toBe('key-1')
        expect(res.body.jubirUser.workspaceId).toBe('ws-1')
        expect(res.body.hasLegacyUser).toBe(false)

        mockOrgRepo.findOne.mockResolvedValue({ id: 'org-1', subscriptionStatus: 'INACTIVE', subscriptionExpiresAt: null })
        const inactiveRes = await request(app).get('/api/v1/datasets').set('Authorization', 'Bearer flowise-api-key-secret')
        expect(inactiveRes.status).toBe(402)
    })

    it('enforces JUBIR_REQUIRE_LICENSE only when set to true', async () => {
        const app = createApp()
        process.env.JUBIR_REQUIRE_LICENSE = 'true'
        const blocked = await request(app).get('/api/v1/chatflows').set('Authorization', 'Bearer flowise-api-key-secret')
        expect(blocked.status).toBe(401)

        process.env.JUBIR_LICENSE_KEY = 'valid-jubir-key'
        const allowed = await request(app).get('/api/v1/chatflows').set('Authorization', 'Bearer flowise-api-key-secret')
        expect(allowed.status).toBe(200)
    })
})
