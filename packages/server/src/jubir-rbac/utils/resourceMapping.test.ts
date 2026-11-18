jest.mock('../../DataSource', () => ({
    getDataSource: jest.fn()
}))
jest.mock('../../utils/logger', () => ({
    __esModule: true,
    default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}))

import { DataSource } from 'typeorm'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Credential } from '../../database/entities/Credential'
import { DocumentStore } from '../../database/entities/DocumentStore'
import { JubirResourceMapping, JubirResourceType, JubirWorkspace } from '../entities'
import { backfillJubirResourceMappings, deleteResourceMapping, ensureResourceMapping } from './resourceMapping'

describe('jubir resourceMapping & backfill', () => {
    const wsIdA = '11111111-1111-4111-8111-111111111111'
    const orgIdA = '22222222-2222-4222-8222-222222222222'
    const regIdA = '33333333-3333-4333-8333-333333333333'
    const storeIdA = '44444444-4444-4444-8444-444444444444'

    let mappingsStore: JubirResourceMapping[]

    const mockWorkspaceRepo = {
        findOne: jest.fn(),
        find: jest.fn()
    }
    const mockMappingRepo = {
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn((data: Partial<JubirResourceMapping>) => ({ id: `map-${Math.random()}`, ...data })),
        save: jest.fn(),
        delete: jest.fn()
    }
    const mockChatflowRepo = { find: jest.fn() }
    const mockCredRepo = { find: jest.fn() }
    const mockDocStoreRepo = { find: jest.fn() }

    const fakeDataSource = {
        isInitialized: true,
        manager: {
            getRepository: (entity: unknown) => {
                if (entity === JubirWorkspace) return mockWorkspaceRepo
                if (entity === JubirResourceMapping) return mockMappingRepo
                if (entity === ChatFlow) return mockChatflowRepo
                if (entity === Credential) return mockCredRepo
                if (entity === DocumentStore) return mockDocStoreRepo
                return {}
            }
        },
        getRepository: (entity: unknown) => {
            if (entity === JubirWorkspace) return mockWorkspaceRepo
            if (entity === JubirResourceMapping) return mockMappingRepo
            if (entity === ChatFlow) return mockChatflowRepo
            if (entity === Credential) return mockCredRepo
            if (entity === DocumentStore) return mockDocStoreRepo
            return {}
        }
    } as unknown as DataSource

    beforeEach(() => {
        jest.clearAllMocks()
        mappingsStore = []

        mockWorkspaceRepo.findOne.mockResolvedValue({
            id: wsIdA,
            organizationId: orgIdA,
            storeId: storeIdA,
            organization: { id: orgIdA, regionId: regIdA }
        })
        mockWorkspaceRepo.find.mockResolvedValue([
            {
                id: wsIdA,
                organizationId: orgIdA,
                storeId: storeIdA,
                organization: { id: orgIdA, regionId: regIdA }
            }
        ])

        mockMappingRepo.findOne.mockImplementation(async ({ where }: any) => {
            return mappingsStore.find((m) => m.resourceType === where.resourceType && m.resourceId === where.resourceId) ?? null
        })
        mockMappingRepo.find.mockImplementation(async () => [...mappingsStore])
        mockMappingRepo.save.mockImplementation(async (item: JubirResourceMapping | JubirResourceMapping[]) => {
            const list = Array.isArray(item) ? item : [item]
            for (const row of list) {
                const idx = mappingsStore.findIndex((m) => m.resourceType === row.resourceType && m.resourceId === row.resourceId)
                if (idx >= 0) {
                    mappingsStore[idx] = row
                } else {
                    mappingsStore.push(row)
                }
            }
            return item
        })
        mockMappingRepo.delete.mockImplementation(async (criteria: any) => {
            mappingsStore = mappingsStore.filter((m) => !(m.resourceType === criteria.resourceType && m.resourceId === criteria.resourceId))
            return { affected: 1 }
        })
    })

    it('ensureResourceMapping resolves hierarchy from workspace and avoids duplicates on repeat calls', async () => {
        await ensureResourceMapping({
            resourceId: 'cf-1',
            resourceType: JubirResourceType.CHATFLOW,
            workspaceId: wsIdA,
            dataSource: fakeDataSource
        })

        expect(mappingsStore).toHaveLength(1)
        expect(mappingsStore[0]).toMatchObject({
            resourceId: 'cf-1',
            resourceType: JubirResourceType.CHATFLOW,
            regionId: regIdA,
            organizationId: orgIdA,
            workspaceId: wsIdA,
            storeId: storeIdA
        })

        // Calling again updates the same mapping instead of creating a duplicate
        await ensureResourceMapping({
            resourceId: 'cf-1',
            resourceType: JubirResourceType.CHATFLOW,
            workspaceId: wsIdA,
            regionId: regIdA,
            organizationId: orgIdA,
            storeId: storeIdA,
            dataSource: fakeDataSource
        })
        expect(mappingsStore).toHaveLength(1)
    })

    it('deleteResourceMapping removes the mapping row', async () => {
        await ensureResourceMapping({
            resourceId: 'cred-1',
            resourceType: JubirResourceType.CREDENTIAL,
            workspaceId: wsIdA,
            regionId: regIdA,
            organizationId: orgIdA,
            dataSource: fakeDataSource
        })
        expect(mappingsStore).toHaveLength(1)

        await deleteResourceMapping(JubirResourceType.CREDENTIAL, 'cred-1', undefined, fakeDataSource)
        expect(mappingsStore).toHaveLength(0)
    })

    it('backfillJubirResourceMappings backfills existing resources idempotently without duplicates', async () => {
        mockChatflowRepo.find.mockResolvedValue([
            { id: 'cf-1', workspaceId: wsIdA },
            { id: 'cf-legacy', workspaceId: 'non-uuid-legacy-ws' }
        ])
        mockCredRepo.find.mockResolvedValue([{ id: 'cred-1', workspaceId: wsIdA }])
        mockDocStoreRepo.find.mockResolvedValue([{ id: 'ds-1', workspaceId: wsIdA }])

        const firstRun = await backfillJubirResourceMappings(fakeDataSource)
        expect(firstRun).toEqual({ inserted: 4, updated: 0, skipped: 0 })
        expect(mappingsStore).toHaveLength(4)

        const mappedCf = mappingsStore.find((m) => m.resourceId === 'cf-1')
        expect(mappedCf).toMatchObject({
            resourceType: JubirResourceType.CHATFLOW,
            regionId: regIdA,
            organizationId: orgIdA,
            workspaceId: wsIdA,
            storeId: storeIdA
        })

        const legacyCf = mappingsStore.find((m) => m.resourceId === 'cf-legacy')
        expect(legacyCf).toMatchObject({
            resourceType: JubirResourceType.CHATFLOW,
            regionId: null,
            organizationId: null,
            workspaceId: null,
            storeId: null
        })

        // Re-running backfill must skip all existing mappings and create zero duplicates
        const secondRun = await backfillJubirResourceMappings(fakeDataSource)
        expect(secondRun).toEqual({ inserted: 0, updated: 0, skipped: 4 })
        expect(mappingsStore).toHaveLength(4)
    })
})
