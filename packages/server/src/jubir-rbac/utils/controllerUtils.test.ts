import { Request } from 'express'
import { Role } from '../config/rbac.config'
import {
    getActiveWorkspaceIdForRequest,
    getJubirPermissions,
    getWorkspaceSearchOptions,
    getWorkspaceSearchOptionsFromReq,
    isJubirOrganizationAdmin
} from './controllerUtils'

describe('jubir controllerUtils', () => {
    it('returns TypeORM Equal filter for getWorkspaceSearchOptions', () => {
        const result = getWorkspaceSearchOptions('ws-1')
        expect(result.workspaceId).toMatchObject({ type: 'equal', value: 'ws-1' })
        expect(() => getWorkspaceSearchOptions(undefined)).toThrow('Workspace ID is required')
    })

    it('reads workspaceId from req.jubirUser in getWorkspaceSearchOptionsFromReq', () => {
        const req = { jubirUser: { workspaceId: 'ws-2' } } as unknown as Request
        const result = getWorkspaceSearchOptionsFromReq(req)
        expect(result.workspaceId).toMatchObject({ type: 'equal', value: 'ws-2' })
        expect(() => getWorkspaceSearchOptionsFromReq({} as Request)).toThrow('Workspace ID is required')
    })

    it('validates both workspaceId and organizationId in getActiveWorkspaceIdForRequest', () => {
        const req = { jubirUser: { workspaceId: 'ws-3', organizationId: 'org-3' } } as unknown as Request
        expect(getActiveWorkspaceIdForRequest(req)).toBe('ws-3')
        expect(() => getActiveWorkspaceIdForRequest({ jubirUser: { workspaceId: 'ws-3' } } as unknown as Request)).toThrow()
    })

    it('checks isJubirOrganizationAdmin only for SUPER_ADMIN and ADMIN_ORGANISASI', () => {
        expect(isJubirOrganizationAdmin(Role.SUPER_ADMIN)).toBe(true)
        expect(isJubirOrganizationAdmin(Role.ADMIN_ORGANISASI)).toBe(true)
        expect(isJubirOrganizationAdmin(Role.ADMIN_DAERAH)).toBe(false)
        expect(isJubirOrganizationAdmin(Role.USER)).toBe(false)
        expect(isJubirOrganizationAdmin(undefined)).toBe(false)
    })

    it('derives permissions from RBAC_MATRIX in getJubirPermissions', () => {
        const superPerms = getJubirPermissions(Role.SUPER_ADMIN)
        expect(superPerms).toContain('agentflow:delete')
        expect(superPerms).toContain('chatflows:delete')
        expect(superPerms).toContain('variables:view')

        const userPerms = getJubirPermissions(Role.USER)
        expect(userPerms).toContain('chatflows:view')
        expect(userPerms).not.toContain('chatflows:delete')
        expect(userPerms).not.toContain('credentials:create')
    })
})
