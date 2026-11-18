import express, { NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { Role } from '../config/rbac.config'
import { JubirRequestUser } from './jubirAuth'
import {
    LEGACY_PERMISSION_MAP,
    hasJubirPermission,
    requireAnyJubirPermission,
    requireJubirPermission,
    resolveJubirPermissionTarget
} from './permission'

function makeUser(role: Role): JubirRequestUser {
    return {
        id: `user-${role}`,
        email: `${role.toLowerCase()}@jubir.local`,
        name: role,
        role,
        regionId: 'region-1',
        organizationId: 'org-1',
        workspaceId: 'ws-1'
    }
}

function createTestApp(user?: JubirRequestUser) {
    const app = express()
    app.use((req: Request, _res: Response, next: NextFunction) => {
        if (user) req.jubirUser = user
        next()
    })

    app.get('/chatflows', requireJubirPermission('agentflow', 'read'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.delete('/chatflows/:id', requireJubirPermission('agentflow', 'delete'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.post('/chatflows', requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.get('/credentials', requireJubirPermission('credential', 'read'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.post('/document-store', requireJubirPermission('document_store', 'create'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.get('/logs', requireJubirPermission('workspace', 'update'), (req, res) => {
        res.json({ scope: req.accessScope })
    })

    // Legacy string invocations
    app.delete('/legacy/chatflows/:id', requireJubirPermission('chatflows:delete'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.get('/legacy/upsert-history', requireAnyJubirPermission('chatflows:view,documentStores:view'), (req, res) => {
        res.json({ scope: req.accessScope })
    })
    app.post('/legacy/unknown', requireJubirPermission('unknown:perm'), (_req, res) => {
        res.json({ ok: true })
    })
    app.post('/legacy/unknown-any', requireAnyJubirPermission('unknown:perm,another:invalid'), (_req, res) => {
        res.json({ ok: true })
    })

    return app
}

describe('jubir permission middleware', () => {
    it('returns 401 when req.jubirUser is missing', async () => {
        const app = createTestApp(undefined)
        expect((await request(app).get('/chatflows')).status).toBe(401)
        expect((await request(app).post('/chatflows')).status).toBe(401)
        expect((await request(app).get('/legacy/upsert-history')).status).toBe(401)
    })

    it('enforces RBAC_MATRIX for SUPER_ADMIN with GLOBAL scope', async () => {
        const app = createTestApp(makeUser(Role.SUPER_ADMIN))

        const readRes = await request(app).get('/chatflows')
        expect(readRes.status).toBe(200)
        expect(readRes.body.scope).toBe('GLOBAL')

        expect((await request(app).post('/chatflows')).status).toBe(200)
        expect((await request(app).delete('/chatflows/1')).status).toBe(200)
        expect((await request(app).get('/credentials')).status).toBe(200)
        expect((await request(app).post('/document-store')).status).toBe(200)
        expect((await request(app).get('/logs')).status).toBe(200)
    })

    it('enforces RBAC_MATRIX for ADMIN_ORGANISASI with ORG scope', async () => {
        const app = createTestApp(makeUser(Role.ADMIN_ORGANISASI))

        const readRes = await request(app).get('/chatflows')
        expect(readRes.status).toBe(200)
        expect(readRes.body.scope).toBe('ORG')

        expect((await request(app).post('/chatflows')).status).toBe(200)
        expect((await request(app).delete('/chatflows/1')).status).toBe(200)
        expect((await request(app).get('/credentials')).status).toBe(200)
        expect((await request(app).post('/document-store')).status).toBe(200)
        expect((await request(app).get('/logs')).status).toBe(200)
    })

    it('enforces RBAC_MATRIX for ADMIN_DAERAH (read-only operational resources, REGION scope)', async () => {
        const app = createTestApp(makeUser(Role.ADMIN_DAERAH))

        const readRes = await request(app).get('/chatflows')
        expect(readRes.status).toBe(200)
        expect(readRes.body.scope).toBe('REGION')

        expect((await request(app).get('/credentials')).status).toBe(200)
        expect((await request(app).get('/logs')).status).toBe(200)
        expect((await request(app).post('/chatflows')).status).toBe(403)
        expect((await request(app).delete('/chatflows/1')).status).toBe(403)
        expect((await request(app).post('/document-store')).status).toBe(403)
    })

    it('enforces RBAC_MATRIX for USER (read/execute agentflow, denied mutations & credentials/logs)', async () => {
        const app = createTestApp(makeUser(Role.USER))

        const readRes = await request(app).get('/chatflows')
        expect(readRes.status).toBe(200)
        expect(readRes.body.scope).toBe('ORG')

        expect((await request(app).post('/chatflows')).status).toBe(403)
        expect((await request(app).delete('/chatflows/1')).status).toBe(403)
        expect((await request(app).get('/credentials')).status).toBe(403)
        expect((await request(app).post('/document-store')).status).toBe(403)
        expect((await request(app).get('/logs')).status).toBe(403)
    })

    it('supports legacy permission strings and comma-separated lists via LEGACY_PERMISSION_MAP', async () => {
        const userApp = createTestApp(makeUser(Role.USER))
        expect((await request(userApp).get('/legacy/upsert-history')).status).toBe(200)
        expect((await request(userApp).delete('/legacy/chatflows/1')).status).toBe(403)

        const adminApp = createTestApp(makeUser(Role.ADMIN_ORGANISASI))
        expect((await request(adminApp).delete('/legacy/chatflows/1')).status).toBe(200)
    })

    it('fails closed on unknown permission strings', async () => {
        const superApp = createTestApp(makeUser(Role.SUPER_ADMIN))
        expect((await request(superApp).post('/legacy/unknown')).status).toBe(403)
        expect((await request(superApp).post('/legacy/unknown-any')).status).toBe(403)
        expect(resolveJubirPermissionTarget('nonexistent:action')).toBeNull()
        expect(resolveJubirPermissionTarget('')).toBeNull()
    })

    it('resolves native resource:action strings and hasJubirPermission helper', () => {
        expect(resolveJubirPermissionTarget('region:create')).toEqual({ resource: 'region', action: 'create' })
        expect(resolveJubirPermissionTarget('documentStores:preview-process')).toEqual({
            resource: 'document_store',
            action: 'execute'
        })
        expect(hasJubirPermission(Role.SUPER_ADMIN, 'region', 'delete')).toBe(true)
        expect(hasJubirPermission(Role.USER, 'credential', 'read')).toBe(false)
        expect(hasJubirPermission(undefined, 'agentflow', 'read')).toBe(false)

        // Ensure every mapped legacy permission points to a valid target in SUPER_ADMIN matrix
        for (const [legacy, target] of Object.entries(LEGACY_PERMISSION_MAP)) {
            expect(hasJubirPermission(Role.SUPER_ADMIN, target.resource, target.action)).toBe(true)
            expect(resolveJubirPermissionTarget(legacy)).toEqual(target)
        }
    })
})
