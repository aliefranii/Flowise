import { RBAC_MATRIX, Role } from './rbac.config'

describe('RBAC_MATRIX', () => {
    it('SUPER_ADMIN gets GLOBAL scope for hierarchy resources', () => {
        for (const resource of ['region', 'organization', 'store'] as const) {
            expect(RBAC_MATRIX[Role.SUPER_ADMIN][resource]?.scope).toBe('GLOBAL')
        }
    })

    it('ADMIN_DAERAH is REGION-scoped and cannot create region', () => {
        expect(RBAC_MATRIX[Role.ADMIN_DAERAH].region?.scope).toBe('REGION')
        expect(RBAC_MATRIX[Role.ADMIN_DAERAH].region?.actions).toEqual(['read'])
        expect(RBAC_MATRIX[Role.ADMIN_DAERAH].store?.scope).toBe('REGION')
    })

    it('ADMIN_ORGANISASI is ORG-scoped and cannot create/delete organization', () => {
        expect(RBAC_MATRIX[Role.ADMIN_ORGANISASI].organization?.scope).toBe('ORG')
        expect(RBAC_MATRIX[Role.ADMIN_ORGANISASI].organization?.actions).toEqual(['read', 'update'])
        expect(RBAC_MATRIX[Role.ADMIN_ORGANISASI].store?.scope).toBe('ORG')
    })

    it('USER can only read organization and store (ORG scope)', () => {
        expect(RBAC_MATRIX[Role.USER].organization?.actions).toEqual(['read'])
        expect(RBAC_MATRIX[Role.USER].store?.actions).toEqual(['read'])
        expect(RBAC_MATRIX[Role.USER].region?.scope).toBe('SELF')
    })
})
