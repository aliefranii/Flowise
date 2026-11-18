import { NextFunction, Request, RequestHandler, Response } from 'express'
import { Action, RBAC_MATRIX, Resource, Role } from '../config/rbac.config'

export interface JubirPermissionTarget {
    resource: Resource
    action: Action
}

export type PermissionCheckInput = JubirPermissionTarget | [Resource, Action] | string

const VALID_RESOURCES = new Set<Resource>([
    'region',
    'organization',
    'store',
    'user',
    'workspace',
    'subscription',
    'agentflow',
    'document_store',
    'credential',
    'channel',
    'chat_session'
])

const VALID_ACTIONS = new Set<Action>(['create', 'read', 'update', 'delete', 'execute'])

/**
 * Maps legacy Flowise enterprise permission identifiers (`prefix:perm`)
 * to Jubir RBAC_MATRIX `(resource, action)` targets.
 */
export const LEGACY_PERMISSION_MAP: Record<string, JubirPermissionTarget> = {
    // Agentflows / Chatflows / Assistants
    'chatflows:view': { resource: 'agentflow', action: 'read' },
    'chatflows:create': { resource: 'agentflow', action: 'create' },
    'chatflows:update': { resource: 'agentflow', action: 'update' },
    'chatflows:duplicate': { resource: 'agentflow', action: 'create' },
    'chatflows:delete': { resource: 'agentflow', action: 'delete' },
    'chatflows:export': { resource: 'agentflow', action: 'read' },
    'chatflows:import': { resource: 'agentflow', action: 'create' },
    'chatflows:config': { resource: 'agentflow', action: 'update' },
    'chatflows:domains': { resource: 'agentflow', action: 'update' },

    'agentflows:view': { resource: 'agentflow', action: 'read' },
    'agentflows:create': { resource: 'agentflow', action: 'create' },
    'agentflows:update': { resource: 'agentflow', action: 'update' },
    'agentflows:duplicate': { resource: 'agentflow', action: 'create' },
    'agentflows:delete': { resource: 'agentflow', action: 'delete' },
    'agentflows:export': { resource: 'agentflow', action: 'read' },
    'agentflows:import': { resource: 'agentflow', action: 'create' },
    'agentflows:config': { resource: 'agentflow', action: 'update' },
    'agentflows:domains': { resource: 'agentflow', action: 'update' },

    'assistants:view': { resource: 'agentflow', action: 'read' },
    'assistants:create': { resource: 'agentflow', action: 'create' },
    'assistants:update': { resource: 'agentflow', action: 'update' },
    'assistants:delete': { resource: 'agentflow', action: 'delete' },

    // Document Stores
    'documentStores:view': { resource: 'document_store', action: 'read' },
    'documentStores:create': { resource: 'document_store', action: 'create' },
    'documentStores:update': { resource: 'document_store', action: 'update' },
    'documentStores:delete': { resource: 'document_store', action: 'delete' },
    'documentStores:add-loader': { resource: 'document_store', action: 'update' },
    'documentStores:delete-loader': { resource: 'document_store', action: 'update' },
    'documentStores:preview-process': { resource: 'document_store', action: 'execute' },
    'documentStores:upsert-config': { resource: 'document_store', action: 'update' },

    // Credentials
    'credentials:view': { resource: 'credential', action: 'read' },
    'credentials:create': { resource: 'credential', action: 'create' },
    'credentials:update': { resource: 'credential', action: 'update' },
    'credentials:delete': { resource: 'credential', action: 'delete' },
    'credentials:share': { resource: 'credential', action: 'update' },

    // Tools & Custom MCP Servers (agentflow tooling)
    'tools:view': { resource: 'agentflow', action: 'read' },
    'tools:create': { resource: 'agentflow', action: 'create' },
    'tools:update': { resource: 'agentflow', action: 'update' },
    'tools:delete': { resource: 'agentflow', action: 'delete' },
    'tools:export': { resource: 'agentflow', action: 'read' },

    // Variables
    'variables:view': { resource: 'agentflow', action: 'read' },
    'variables:create': { resource: 'agentflow', action: 'create' },
    'variables:update': { resource: 'agentflow', action: 'update' },
    'variables:delete': { resource: 'agentflow', action: 'delete' },

    // API Keys
    'apikeys:view': { resource: 'workspace', action: 'read' },
    'apikeys:create': { resource: 'credential', action: 'create' },
    'apikeys:update': { resource: 'credential', action: 'update' },
    'apikeys:delete': { resource: 'credential', action: 'delete' },

    // Executions
    'executions:view': { resource: 'chat_session', action: 'read' },
    'executions:update': { resource: 'agentflow', action: 'update' },
    'executions:delete': { resource: 'chat_session', action: 'delete' },

    // Datasets, Evaluators, Evaluations
    'datasets:view': { resource: 'agentflow', action: 'read' },
    'datasets:create': { resource: 'agentflow', action: 'create' },
    'datasets:update': { resource: 'agentflow', action: 'update' },
    'datasets:delete': { resource: 'agentflow', action: 'delete' },

    'evaluators:view': { resource: 'agentflow', action: 'read' },
    'evaluators:create': { resource: 'agentflow', action: 'create' },
    'evaluators:update': { resource: 'agentflow', action: 'update' },
    'evaluators:delete': { resource: 'agentflow', action: 'delete' },

    'evaluations:view': { resource: 'agentflow', action: 'read' },
    'evaluations:create': { resource: 'agentflow', action: 'create' },
    'evaluations:update': { resource: 'agentflow', action: 'update' },
    'evaluations:delete': { resource: 'agentflow', action: 'delete' },
    'evaluations:run': { resource: 'agentflow', action: 'execute' },

    // Marketplaces / Templates
    'templates:marketplace': { resource: 'agentflow', action: 'read' },
    'templates:custom': { resource: 'agentflow', action: 'read' },
    'templates:custom-delete': { resource: 'agentflow', action: 'delete' },
    'templates:toolexport': { resource: 'agentflow', action: 'create' },
    'templates:flowexport': { resource: 'agentflow', action: 'create' },
    'templates:custom-share': { resource: 'agentflow', action: 'update' },

    // Workspace export/import & management
    'workspace:view': { resource: 'workspace', action: 'read' },
    'workspace:create': { resource: 'workspace', action: 'create' },
    'workspace:update': { resource: 'workspace', action: 'update' },
    'workspace:delete': { resource: 'workspace', action: 'delete' },
    'workspace:export': { resource: 'workspace', action: 'update' },
    'workspace:import': { resource: 'workspace', action: 'create' },

    // Logs
    'logs:view': { resource: 'workspace', action: 'update' }
}

/**
 * Resolves a native `(resource, action)` pair or legacy permission string to a `JubirPermissionTarget`.
 * Returns `null` for unknown permission strings so callers fail closed.
 */
export function resolveJubirPermissionTarget(input: PermissionCheckInput): JubirPermissionTarget | null {
    if (Array.isArray(input)) {
        const [resource, action] = input
        return VALID_RESOURCES.has(resource) && VALID_ACTIONS.has(action) ? { resource, action } : null
    }
    if (typeof input === 'object' && input !== null) {
        return VALID_RESOURCES.has(input.resource) && VALID_ACTIONS.has(input.action) ? input : null
    }
    const trimmed = input.trim()
    if (!trimmed) return null

    const mapped = LEGACY_PERMISSION_MAP[trimmed]
    if (mapped) return mapped

    const [resourcePart, actionPart, ...rest] = trimmed.split(':')
    if (rest.length === 0 && VALID_RESOURCES.has(resourcePart as Resource) && VALID_ACTIONS.has(actionPart as Action)) {
        return { resource: resourcePart as Resource, action: actionPart as Action }
    }
    return null
}

export function hasJubirPermission(role: Role | undefined, resource: Resource, action: Action): boolean {
    if (!role) return false
    const rule = RBAC_MATRIX[role]?.[resource]
    return Boolean(rule && rule.actions.includes(action))
}

function expandPermissionInputs(inputs: PermissionCheckInput[]): Array<JubirPermissionTarget | null> {
    const resolved: Array<JubirPermissionTarget | null> = []
    for (const input of inputs) {
        if (typeof input === 'string' && input.includes(',')) {
            for (const part of input.split(',')) {
                resolved.push(resolveJubirPermissionTarget(part))
            }
        } else {
            resolved.push(resolveJubirPermissionTarget(input))
        }
    }
    return resolved
}

/**
 * Express middleware that enforces a single RBAC_MATRIX permission on `req.jubirUser`.
 * Supports either `(resource, action)` or a legacy Flowise permission string.
 */
export const requireJubirPermission: {
    (resource: Resource, action: Action): RequestHandler
    (permission: string): RequestHandler
} = (resourceOrPermission: Resource | string, action?: Action): RequestHandler => {
    const target: JubirPermissionTarget | null =
        action !== undefined
            ? resolveJubirPermissionTarget([resourceOrPermission as Resource, action])
            : resolveJubirPermissionTarget(resourceOrPermission)

    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.jubirUser) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        if (!target) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        const rule = RBAC_MATRIX[req.jubirUser.role]?.[target.resource]
        if (!rule || !rule.actions.includes(target.action)) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        req.accessScope = rule.scope
        return next()
    }
}

/**
 * Express middleware that grants access if `req.jubirUser` holds ANY of the given RBAC_MATRIX permissions.
 * Accepts `(resource, action)` tuples/objects or comma-separated legacy permission strings.
 */
export function requireAnyJubirPermission(...permissions: PermissionCheckInput[]): RequestHandler {
    const targets = expandPermissionInputs(permissions)

    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.jubirUser) {
            return res.status(401).json({ message: 'Unauthorized' })
        }
        const roleRules = RBAC_MATRIX[req.jubirUser.role]
        if (!roleRules) {
            return res.status(403).json({ message: 'Forbidden' })
        }
        for (const target of targets) {
            if (!target) continue
            const rule = roleRules[target.resource]
            if (rule && rule.actions.includes(target.action)) {
                req.accessScope = rule.scope
                return next()
            }
        }
        return res.status(403).json({ message: 'Forbidden' })
    }
}
