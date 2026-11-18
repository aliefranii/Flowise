import express, { NextFunction, Request, Response } from 'express'
import request from 'supertest'
import { Role } from '../config/rbac.config'
import { JubirResourceMapping, JubirResourceType } from '../entities'
import errorHandlerMiddleware from '../../middlewares/errors'

const mockAllowedResourceIds = jest.fn()
const mockEnsureResourceMapping = jest.fn()
const mockDeleteResourceMapping = jest.fn()

jest.mock('../middlewares/jubirScope', () => ({
    allowedResourceIds: (...args: unknown[]) => mockAllowedResourceIds(...args),
    assertJubirResourceAccess: async (resourceType: JubirResourceType, resourceId: string, user?: any) => {
        if (!user) {
            const { InternalFlowiseError } = require('../../errors/internalFlowiseError')
            throw new InternalFlowiseError(401, 'Unauthorized')
        }
        const allowed: string[] = await mockAllowedResourceIds(resourceType, user)
        if (!allowed.includes(resourceId)) {
            const { InternalFlowiseError } = require('../../errors/internalFlowiseError')
            throw new InternalFlowiseError(403, 'Forbidden')
        }
    }
}))

jest.mock('../../DataSource', () => ({ getDataSource: jest.fn() }))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))
jest.mock('../../schedule/ScheduleBeat', () => ({
    ScheduleBeat: { getInstance: () => ({ onScheduleChanged: jest.fn() }) }
}))
jest.mock('../../services/schedule', () => ({ __esModule: true, default: {} }))
jest.mock('../../services/apikey', () => ({ __esModule: true, default: {} }))
jest.mock('../../utils/sanitizeFlowData', () => ({ sanitizeFlowDataForPublicEndpoint: (x: unknown) => x }))
jest.mock('../../utils/stripProtectedFields', () => ({ stripProtectedFields: (x: unknown) => x }))
jest.mock('../../utils/pagination', () => ({ getPageAndLimitParams: () => ({ page: -1, limit: -1 }) }))

jest.mock('./resourceMapping', () => ({
    ensureResourceMapping: (...args: unknown[]) => mockEnsureResourceMapping(...args),
    deleteResourceMapping: (...args: unknown[]) => mockDeleteResourceMapping(...args)
}))

const mockChatflowsService = {
    getAllChatflows: jest.fn(),
    getChatflowById: jest.fn(),
    saveChatflow: jest.fn(),
    updateChatflow: jest.fn(),
    deleteChatflow: jest.fn(),
    getAllChatflowsCountByOrganization: jest.fn()
}
const mockCredentialsService = {
    getAllCredentials: jest.fn(),
    getCredentialById: jest.fn(),
    revealCredentialById: jest.fn(),
    createCredential: jest.fn(),
    updateCredential: jest.fn(),
    deleteCredentials: jest.fn()
}
const mockDocStoreService = {
    getAllDocumentStores: jest.fn(),
    getDocumentStoreById: jest.fn(),
    getUsedChatflowNames: jest.fn(),
    createDocumentStore: jest.fn(),
    updateDocumentStore: jest.fn(),
    deleteDocumentStore: jest.fn()
}

jest.mock('../../services/chatflows', () => ({ __esModule: true, default: mockChatflowsService }))
jest.mock('../../services/credentials', () => ({ __esModule: true, default: mockCredentialsService }))
jest.mock('../../services/documentstore', () => ({ __esModule: true, default: mockDocStoreService }))
jest.mock('../../utils/quotaUsage', () => ({ checkUsageLimit: jest.fn().mockResolvedValue(undefined) }))
jest.mock('../../utils/rateLimit', () => ({
    RateLimiterManager: {
        getInstance: () => ({ updateRateLimiter: jest.fn().mockResolvedValue(undefined) })
    }
}))
jest.mock('../../utils/getRunningExpressApp', () => ({
    getRunningExpressApp: () => ({ usageCacheManager: {} })
}))

import chatflowsController from '../../controllers/chatflows'
import credentialsController from '../../controllers/credentials'
import documentStoreController from '../../controllers/documentstore'

describe('Jubir controller resource isolation (ChatFlow, Credential, DocumentStore)', () => {
    const orgAUser = {
        id: 'user-a',
        email: 'a@org-a.local',
        name: 'Admin Org A',
        role: Role.ADMIN_ORGANISASI,
        regionId: 'reg-1',
        organizationId: 'org-a',
        workspaceId: 'ws-a'
    }

    function createApp() {
        const app = express()
        app.use(express.json())
        app.use((req: Request, _res: Response, next: NextFunction) => {
            req.jubirUser = orgAUser
            req.jubirContext = {
                organization: {
                    id: 'org-a',
                    name: 'Org A',
                    regionId: 'reg-1',
                    subscriptionId: null,
                    subscriptionPlan: null,
                    subscriptionStatus: 'ACTIVE'
                },
                workspace: { id: 'ws-a', name: 'WS A', organizationId: 'org-a', storeId: 'store-a' }
            }
            next()
        })

        app.get('/chatflows', chatflowsController.getAllChatflows)
        app.post('/chatflows', chatflowsController.saveChatflow)
        app.get('/chatflows/:id', chatflowsController.getChatflowById)
        app.put('/chatflows/:id', chatflowsController.updateChatflow)
        app.delete('/chatflows/:id', chatflowsController.deleteChatflow)

        app.get('/credentials', credentialsController.getAllCredentials)
        app.post('/credentials', credentialsController.createCredential)
        app.get('/credentials/:id', credentialsController.getCredentialById)
        app.put('/credentials/:id', credentialsController.updateCredential)
        app.delete('/credentials/:id', credentialsController.deleteCredentials)

        app.get('/document-store/store', documentStoreController.getAllDocumentStores)
        app.post('/document-store/store', documentStoreController.createDocumentStore)
        app.get('/document-store/store/:id', documentStoreController.getDocumentStoreById)
        app.put('/document-store/store/:id', documentStoreController.updateDocumentStore)
        app.delete('/document-store/store/:id', documentStoreController.deleteDocumentStore)

        app.use(errorHandlerMiddleware)
        return app
    }

    beforeEach(() => {
        jest.clearAllMocks()
        mockAllowedResourceIds.mockImplementation(async (resourceType: JubirResourceType) => {
            if (resourceType === JubirResourceType.CHATFLOW) return ['cf-org-a']
            if (resourceType === JubirResourceType.CREDENTIAL) return ['cred-org-a']
            if (resourceType === JubirResourceType.DOCUMENT_STORE) return ['ds-org-a']
            return []
        })
        mockEnsureResourceMapping.mockResolvedValue({} as JubirResourceMapping)
        mockDeleteResourceMapping.mockResolvedValue(undefined)

        mockChatflowsService.getAllChatflowsCountByOrganization.mockResolvedValue(0)
        mockChatflowsService.saveChatflow.mockImplementation(async (cf: any) => ({ ...cf, id: 'cf-new' }))
        mockChatflowsService.getAllChatflows.mockResolvedValue([])
        mockChatflowsService.getChatflowById.mockResolvedValue({ id: 'cf-org-a', workspaceId: 'ws-a' })
        mockChatflowsService.updateChatflow.mockResolvedValue({ id: 'cf-org-a', workspaceId: 'ws-a' })
        mockChatflowsService.deleteChatflow.mockResolvedValue({ affected: 1 })

        mockCredentialsService.createCredential.mockImplementation(async (body: any) => ({ id: 'cred-new', ...body }))
        mockCredentialsService.getAllCredentials.mockResolvedValue([])
        mockCredentialsService.getCredentialById.mockResolvedValue({ id: 'cred-org-a' })
        mockCredentialsService.updateCredential.mockResolvedValue({ id: 'cred-org-a' })
        mockCredentialsService.deleteCredentials.mockResolvedValue({ affected: 1 })

        mockDocStoreService.createDocumentStore.mockImplementation(async (ds: any) => ({ ...ds, id: 'ds-new' }))
        mockDocStoreService.getAllDocumentStores.mockResolvedValue([])
        mockDocStoreService.getDocumentStoreById.mockResolvedValue({ id: 'ds-org-a', name: 'Store A', loaders: '[]' })
        mockDocStoreService.updateDocumentStore.mockResolvedValue({ id: 'ds-org-a', name: 'Store A', loaders: '[]' })
        mockDocStoreService.deleteDocumentStore.mockResolvedValue({ deleted: 1 })
    })

    it('writes workspaceId and JubirResourceMapping on create for ChatFlow, Credential, and DocumentStore', async () => {
        const app = createApp()

        const cfRes = await request(app).post('/chatflows').send({ name: 'Flow A', flowData: '{}', type: 'CHATFLOW' })
        expect(cfRes.status).toBe(200)
        expect(mockChatflowsService.saveChatflow.mock.calls[0][0].workspaceId).toBe('ws-a')
        expect(mockEnsureResourceMapping).toHaveBeenCalledWith({
            resourceId: 'cf-new',
            resourceType: JubirResourceType.CHATFLOW,
            regionId: 'reg-1',
            organizationId: 'org-a',
            workspaceId: 'ws-a',
            storeId: 'store-a'
        })

        const credRes = await request(app).post('/credentials').send({ name: 'Cred A', credentialName: 'openAIApi' })
        expect(credRes.status).toBe(200)
        expect(mockCredentialsService.createCredential).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: 'ws-a' }))
        expect(mockEnsureResourceMapping).toHaveBeenCalledWith({
            resourceId: 'cred-new',
            resourceType: JubirResourceType.CREDENTIAL,
            regionId: 'reg-1',
            organizationId: 'org-a',
            workspaceId: 'ws-a',
            storeId: 'store-a'
        })

        const dsRes = await request(app).post('/document-store/store').send({ name: 'DS A' })
        expect(dsRes.status).toBe(200)
        expect(mockDocStoreService.createDocumentStore.mock.calls[0][0].workspaceId).toBe('ws-a')
        expect(mockEnsureResourceMapping).toHaveBeenCalledWith({
            resourceId: 'ds-new',
            resourceType: JubirResourceType.DOCUMENT_STORE,
            regionId: 'reg-1',
            organizationId: 'org-a',
            workspaceId: 'ws-a',
            storeId: 'store-a'
        })
    })

    it('passes allowedResourceIds() on list endpoints', async () => {
        const app = createApp()

        expect((await request(app).get('/chatflows')).status).toBe(200)
        expect(mockChatflowsService.getAllChatflows).toHaveBeenCalledWith(undefined, 'ws-a', -1, -1, ['cf-org-a'])

        expect((await request(app).get('/credentials')).status).toBe(200)
        expect(mockCredentialsService.getAllCredentials).toHaveBeenCalledWith(undefined, 'ws-a', ['cred-org-a'])

        expect((await request(app).get('/document-store/store')).status).toBe(200)
        expect(mockDocStoreService.getAllDocumentStores).toHaveBeenCalledWith('ws-a', -1, -1, ['ds-org-a'])
    })

    it('blocks cross-organization detail/update/delete with 403 via allowedResourceIds()', async () => {
        const app = createApp()

        // Cross-org ChatFlow
        expect((await request(app).get('/chatflows/cf-org-b')).status).toBe(403)
        expect((await request(app).put('/chatflows/cf-org-b').send({ name: 'Hacked' })).status).toBe(403)
        expect((await request(app).delete('/chatflows/cf-org-b')).status).toBe(403)
        expect(mockChatflowsService.getChatflowById).not.toHaveBeenCalled()
        expect(mockChatflowsService.deleteChatflow).not.toHaveBeenCalled()

        // Cross-org Credential
        expect((await request(app).get('/credentials/cred-org-b')).status).toBe(403)
        expect((await request(app).put('/credentials/cred-org-b').send({ name: 'Hacked' })).status).toBe(403)
        expect((await request(app).delete('/credentials/cred-org-b')).status).toBe(403)
        expect(mockCredentialsService.getCredentialById).not.toHaveBeenCalled()
        expect(mockCredentialsService.deleteCredentials).not.toHaveBeenCalled()

        // Cross-org DocumentStore
        expect((await request(app).get('/document-store/store/ds-org-b')).status).toBe(403)
        expect((await request(app).put('/document-store/store/ds-org-b').send({ name: 'Hacked' })).status).toBe(403)
        expect((await request(app).delete('/document-store/store/ds-org-b')).status).toBe(403)
        expect(mockDocStoreService.getDocumentStoreById).not.toHaveBeenCalled()
        expect(mockDocStoreService.deleteDocumentStore).not.toHaveBeenCalled()
    })

    it('allows same-org detail/update/delete and cleans up mapping on delete', async () => {
        const app = createApp()

        expect((await request(app).get('/chatflows/cf-org-a')).status).toBe(200)
        expect((await request(app).delete('/chatflows/cf-org-a')).status).toBe(200)
        expect(mockDeleteResourceMapping).toHaveBeenCalledWith(JubirResourceType.CHATFLOW, 'cf-org-a')

        expect((await request(app).get('/credentials/cred-org-a')).status).toBe(200)
        expect((await request(app).delete('/credentials/cred-org-a')).status).toBe(200)
        expect(mockDeleteResourceMapping).toHaveBeenCalledWith(JubirResourceType.CREDENTIAL, 'cred-org-a')

        expect((await request(app).get('/document-store/store/ds-org-a')).status).toBe(200)
        expect((await request(app).delete('/document-store/store/ds-org-a')).status).toBe(200)
        expect(mockDeleteResourceMapping).toHaveBeenCalledWith(JubirResourceType.DOCUMENT_STORE, 'ds-org-a')
    })
})
