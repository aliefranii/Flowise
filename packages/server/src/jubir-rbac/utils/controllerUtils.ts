import { Request } from 'express'
import { StatusCodes } from 'http-status-codes'
import { Equal } from 'typeorm'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { GeneralErrorMessage } from '../../utils/constants'
import { Action, RBAC_MATRIX, Resource, Role } from '../config/rbac.config'
import { LEGACY_PERMISSION_MAP } from '../middlewares/permission'

const RESOURCE_TO_LEGACY_PREFIXES: Partial<Record<Resource, string[]>> = {
    agentflow: ['chatflows', 'agentflows', 'assistants'],
    document_store: ['documentStores'],
    credential: ['credentials'],
    workspace: ['workspace'],
    user: ['users'],
    organization: ['organization'],
    subscription: ['subscription']
}

const ACTION_TO_LEGACY_SUFFIX: Record<Action, string> = {
    create: 'create',
    read: 'view',
    update: 'update',
    delete: 'delete',
    execute: 'execute'
}

export const getWorkspaceSearchOptions = (workspaceId?: string) => {
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Workspace ID is required`)
    }
    return { workspaceId: Equal(workspaceId) }
}

export const getWorkspaceSearchOptionsFromReq = (req: Request) => {
    const workspaceId = req.jubirUser?.workspaceId
    if (!workspaceId) {
        throw new InternalFlowiseError(StatusCodes.BAD_REQUEST, `Workspace ID is required`)
    }
    return { workspaceId: Equal(workspaceId) }
}

export function getActiveWorkspaceIdForRequest(req: Request): string {
    const workspaceId = req.jubirUser?.workspaceId
    const organizationId = req.jubirUser?.organizationId
    if (!workspaceId || !organizationId) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
    }
    return workspaceId
}

export function isJubirOrganizationAdmin(role?: Role): boolean {
    return role === Role.SUPER_ADMIN || role === Role.ADMIN_ORGANISASI
}

/**
 * Derives flat permission strings from RBAC_MATRIX for a given Jubir role.
 * Includes both native `resource:action` entries and legacy Flowise equivalents.
 */
export function getJubirPermissions(role?: Role): string[] {
    if (!role) return []
    const rules = RBAC_MATRIX[role]
    if (!rules) return []

    const permissions = new Set<string>()
    for (const [resource, rule] of Object.entries(rules) as [Resource, { actions: Action[] } | undefined][]) {
        if (!rule) continue
        const legacyPrefixes = RESOURCE_TO_LEGACY_PREFIXES[resource] ?? []
        for (const action of rule.actions) {
            permissions.add(`${resource}:${action}`)
            const legacyAction = ACTION_TO_LEGACY_SUFFIX[action]
            for (const prefix of legacyPrefixes) {
                permissions.add(`${prefix}:${legacyAction}`)
            }
        }
    }

    for (const [legacyPerm, target] of Object.entries(LEGACY_PERMISSION_MAP)) {
        if (rules[target.resource]?.actions.includes(target.action)) {
            permissions.add(legacyPerm)
        }
    }

    return [...permissions]
}
