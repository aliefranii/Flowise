import { NextFunction, Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import { getDataSource } from '../../DataSource'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { JubirResourceMapping, JubirResourceType } from '../entities'
import { Action, RBAC_MATRIX, Resource, Role, Scope } from '../config/rbac.config'
import { JubirRequestUser, requireJubirAuth } from './jubirAuth'

export { requireJubirAuth }
export type { JubirRequestUser } from './jubirAuth'

export const requireJubirScope = (resource: Resource, action: Action) => (req: Request, res: Response, next: NextFunction) => {
    requireJubirAuth(req, res, (err?: unknown) => {
        if (err || !req.jubirUser) return res.status(401).json({ message: 'Unauthorized' })
        const rule = RBAC_MATRIX[req.jubirUser.role]?.[resource]
        if (!rule || !rule.actions.includes(action)) return res.status(403).json({ message: 'Forbidden' })
        req.accessScope = rule.scope
        next()
    })
}

export interface ScopeFilter {
    regionId?: string
    organizationId?: string
    workspaceId?: string
    selfOnly: boolean
}

export function resolveScopeFilter(
    scope: Scope,
    user: { regionId: string | null; organizationId: string | null; workspaceId: string | null }
): ScopeFilter {
    switch (scope) {
        case 'GLOBAL':
            return { selfOnly: false }
        case 'REGION':
            return { regionId: user.regionId ?? undefined, selfOnly: false }
        case 'ORG':
            return { organizationId: user.organizationId ?? undefined, selfOnly: false }
        case 'SELF':
            return { workspaceId: user.workspaceId ?? undefined, selfOnly: true }
    }
}

function resourceTypeToResource(t: JubirResourceType): Resource {
    switch (t) {
        case JubirResourceType.CHATFLOW:
            return 'agentflow'
        case JubirResourceType.CREDENTIAL:
            return 'credential'
        case JubirResourceType.DOCUMENT_STORE:
            return 'document_store'
    }
}

export async function allowedResourceIds(
    resourceType: JubirResourceType,
    user: { role: Role; regionId: string | null; organizationId: string | null; workspaceId: string | null }
): Promise<string[]> {
    const resource = resourceTypeToResource(resourceType)
    const rule = RBAC_MATRIX[user.role]?.[resource]
    if (!rule) return []

    const filter = resolveScopeFilter(rule.scope, user)
    if (
        (rule.scope === 'REGION' && !filter.regionId) ||
        (rule.scope === 'ORG' && !filter.organizationId) ||
        (rule.scope === 'SELF' && !filter.workspaceId)
    ) {
        return []
    }

    const qb = getDataSource()
        .getRepository(JubirResourceMapping)
        .createQueryBuilder('m')
        .select('m.resource_id', 'resource_id')
        .where('m.resource_type = :t', { t: resourceType })

    if (filter.regionId) qb.andWhere('m.region_id = :regionId', { regionId: filter.regionId })
    if (filter.organizationId) qb.andWhere('m.organization_id = :organizationId', { organizationId: filter.organizationId })
    if (filter.workspaceId) qb.andWhere('m.workspace_id = :workspaceId', { workspaceId: filter.workspaceId })

    const rows = await qb.getRawMany<{ resource_id: string }>()
    return [...new Set(rows.map((r) => r.resource_id).filter(Boolean))]
}

/**
 * Enforces JubirResourceMapping scope isolation on detail/update/delete endpoints
 * using `allowedResourceIds()`, throwing 401 when unauthenticated or 403 when outside scope.
 */
export async function assertJubirResourceAccess(
    resourceType: JubirResourceType,
    resourceId: string,
    user?: Pick<JubirRequestUser, 'role' | 'regionId' | 'organizationId' | 'workspaceId'>
): Promise<void> {
    if (!user) {
        throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, 'Unauthorized')
    }
    if (!resourceId) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Forbidden')
    }
    const allowedIds = await allowedResourceIds(resourceType, user)
    if (!allowedIds.includes(resourceId)) {
        throw new InternalFlowiseError(StatusCodes.FORBIDDEN, 'Forbidden')
    }
}
