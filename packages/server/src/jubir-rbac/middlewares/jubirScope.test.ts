import { Role } from '../config/rbac.config'
import { JubirResourceMapping, JubirResourceType } from '../entities'

const mockGetRawMany = jest.fn()
const mockQueryBuilder = {
    select: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getRawMany: mockGetRawMany
}
const mockMappingRepo = {
    createQueryBuilder: jest.fn(() => mockQueryBuilder)
}

jest.mock('../../DataSource', () => ({
    getDataSource: () => ({
        getRepository: (entity: unknown) => {
            if (entity === JubirResourceMapping) return mockMappingRepo
            return {}
        }
    })
}))

import { allowedResourceIds, assertJubirResourceAccess, resolveScopeFilter } from './jubirScope'

describe('jubirScope & allowedResourceIds', () => {
    beforeEach(() => {
        jest.clearAllMocks()
        mockGetRawMany.mockResolvedValue([{ resource_id: 'res-1' }, { resource_id: 'res-1' }, { resource_id: 'res-2' }])
    })

    it('resolves scope filters for GLOBAL, REGION, ORG, and SELF', () => {
        const user = { regionId: 'reg-1', organizationId: 'org-1', workspaceId: 'ws-1' }
        expect(resolveScopeFilter('GLOBAL', user)).toEqual({ selfOnly: false })
        expect(resolveScopeFilter('REGION', user)).toEqual({ regionId: 'reg-1', selfOnly: false })
        expect(resolveScopeFilter('ORG', user)).toEqual({ organizationId: 'org-1', selfOnly: false })
        expect(resolveScopeFilter('SELF', user)).toEqual({ workspaceId: 'ws-1', selfOnly: true })
    })

    it('queries GLOBAL scope without tenant filters for SUPER_ADMIN', async () => {
        const ids = await allowedResourceIds(JubirResourceType.CHATFLOW, {
            role: Role.SUPER_ADMIN,
            regionId: 'reg-1',
            organizationId: 'org-1',
            workspaceId: 'ws-1'
        })

        expect(ids).toEqual(['res-1', 'res-2'])
        expect(mockQueryBuilder.where).toHaveBeenCalledWith('m.resource_type = :t', { t: JubirResourceType.CHATFLOW })
        expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled()
    })

    it('filters by region_id for ADMIN_DAERAH (REGION scope)', async () => {
        await allowedResourceIds(JubirResourceType.DOCUMENT_STORE, {
            role: Role.ADMIN_DAERAH,
            regionId: 'reg-1',
            organizationId: 'org-1',
            workspaceId: 'ws-1'
        })

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1)
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.region_id = :regionId', { regionId: 'reg-1' })
    })

    it('filters by organization_id for ADMIN_ORGANISASI (ORG scope)', async () => {
        await allowedResourceIds(JubirResourceType.CREDENTIAL, {
            role: Role.ADMIN_ORGANISASI,
            regionId: 'reg-1',
            organizationId: 'org-1',
            workspaceId: 'ws-1'
        })

        expect(mockQueryBuilder.andWhere).toHaveBeenCalledTimes(1)
        expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('m.organization_id = :organizationId', { organizationId: 'org-1' })
    })

    it('fails closed when role has no rule or required scope ID is missing', async () => {
        // USER has no rule for CREDENTIAL or DOCUMENT_STORE
        const userCreds = await allowedResourceIds(JubirResourceType.CREDENTIAL, {
            role: Role.USER,
            regionId: 'reg-1',
            organizationId: 'org-1',
            workspaceId: 'ws-1'
        })
        expect(userCreds).toEqual([])
        expect(mockMappingRepo.createQueryBuilder).not.toHaveBeenCalled()

        // ADMIN_ORGANISASI with missing organizationId must NOT fall back to unscoped query
        const missingOrg = await allowedResourceIds(JubirResourceType.CHATFLOW, {
            role: Role.ADMIN_ORGANISASI,
            regionId: 'reg-1',
            organizationId: null,
            workspaceId: 'ws-1'
        })
        expect(missingOrg).toEqual([])
        expect(mockMappingRepo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('enforces assertJubirResourceAccess for allowed, cross-org, and unauthenticated requests', async () => {
        await expect(assertJubirResourceAccess(JubirResourceType.CHATFLOW, 'res-1', undefined)).rejects.toMatchObject({
            statusCode: 401
        })

        await expect(
            assertJubirResourceAccess(JubirResourceType.CHATFLOW, 'res-1', {
                role: Role.ADMIN_ORGANISASI,
                regionId: 'reg-1',
                organizationId: 'org-1',
                workspaceId: 'ws-1'
            })
        ).resolves.toBeUndefined()

        await expect(
            assertJubirResourceAccess(JubirResourceType.CHATFLOW, 'res-other-org', {
                role: Role.ADMIN_ORGANISASI,
                regionId: 'reg-1',
                organizationId: 'org-1',
                workspaceId: 'ws-1'
            })
        ).rejects.toMatchObject({ statusCode: 403 })
    })
})
