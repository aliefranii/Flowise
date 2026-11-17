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
        user: { actions: ['create', 'read', 'update', 'delete'], scope: 'REGION' },
        agentflow: { actions: ['read', 'execute'], scope: 'REGION' }, // Monitoring & test chat saja
        document_store: { actions: ['read'], scope: 'REGION' },
        credential: { actions: ['read'], scope: 'REGION' },
        channel: { actions: ['read'], scope: 'REGION' },
        chat_session: { actions: ['read'], scope: 'REGION' }
    },

    [Role.ADMIN_ORGANISASI]: {
        region: { actions: ['read'], scope: 'REGION' },
        organization: { actions: ['read', 'update'], scope: 'ORG' },
        store: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        user: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        agentflow: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        document_store: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        credential: { actions: ['create', 'read', 'update', 'delete'], scope: 'ORG' },
        channel: { actions: ['create', 'read', 'update', 'delete', 'execute'], scope: 'ORG' },
        chat_session: { actions: ['read', 'delete'], scope: 'ORG' }
    },

    [Role.USER]: {
        organization: { actions: ['read'], scope: 'ORG' },
        store: { actions: ['read'], scope: 'ORG' },
        user: { actions: ['read', 'update'], scope: 'SELF' },
        agentflow: { actions: ['read', 'execute'], scope: 'ORG' }, // Hanya lihat daftar aktif & chat
        chat_session: { actions: ['create', 'read', 'execute'], scope: 'SELF' }
    }
}
