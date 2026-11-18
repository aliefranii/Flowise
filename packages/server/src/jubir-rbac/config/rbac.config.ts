export enum Role {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN_DAERAH = 'ADMIN_DAERAH',
    ADMIN_ORGANISASI = 'ADMIN_ORGANISASI',
    USER = 'USER'
}

export type Action = 'create' | 'read' | 'update' | 'delete' | 'execute'

export type Resource =
    | 'region'
    | 'organization'
    | 'store'
    | 'user'
    | 'workspace'
    | 'subscription'
    | 'agentflow'
    | 'document_store'
    | 'credential'
    | 'channel'
    | 'chat_session'

export type Scope = 'GLOBAL' | 'REGION' | 'ORG' | 'SELF'

export interface PermissionRule {
    actions: Action[]
    scope: Scope
}

export const RBAC_MATRIX: Record<Role, Partial<Record<Resource, PermissionRule>>> = {
    [Role.SUPER_ADMIN]: {
        region: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        organization: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        store: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        workspace: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        subscription: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        user: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        agentflow: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'GLOBAL' },
        document_store: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'GLOBAL' },
        credential: { actions: ['create', 'read', 'update', 'delete'], scope: 'GLOBAL' },
        channel: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'GLOBAL' },
        chat_session: { actions: ['read', 'delete'], scope: 'GLOBAL' }
    },

    [Role.ADMIN_DAERAH]: {
        region: { actions: ['read'], scope: 'REGION' },
        organization: { actions: ['create', 'read', 'update', 'delete'], scope: 'REGION' },
        store: { actions: ['create', 'read', 'update', 'delete'], scope: 'REGION' },
        workspace: { actions: ['create', 'read', 'update', 'delete'], scope: 'REGION' },
        subscription: { actions: ['read'], scope: 'REGION' },
        user: { actions: ['create', 'read', 'update', 'delete'], scope: 'REGION' },
        agentflow: { actions: ['read', 'execute'], scope: 'REGION' },
        document_store: { actions: ['read'], scope: 'REGION' },
        credential: { actions: ['read'], scope: 'REGION' },
        channel: { actions: ['read'], scope: 'REGION' },
        chat_session: { actions: ['read'], scope: 'REGION' }
    },

    [Role.ADMIN_ORGANISASI]: {
        region: { actions: ['read'], scope: 'REGION' },
        organization: { actions: ['read', 'update'], scope: 'ORG' },
        store: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        workspace: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        subscription: { actions: ['read'], scope: 'ORG' },
        user: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        agentflow: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        document_store: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        credential: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        channel: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        chat_session: { actions: ['read', 'delete'], scope: 'ORG' }
    },

    [Role.USER]: {
        region: { actions: ['read'], scope: 'SELF' },
        organization: { actions: ['read'], scope: 'ORG' },
        store: { actions: ['read'], scope: 'ORG' },
        workspace: { actions: ['read'], scope: 'SELF' },
        subscription: { actions: ['read'], scope: 'ORG' },
        user: { actions: ['read', 'update'], scope: 'SELF' },
        agentflow: { actions: ['read', 'execute'], scope: 'ORG' },
        chat_session: { actions: ['create', 'read', 'execute'], scope: 'SELF' }
    }
}
