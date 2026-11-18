// packages/server/src/jubir-rbac/entities/index.ts
import { JubirRegion } from './JubirRegion'
import { JubirOrganization } from './JubirOrganization'
import { JubirStore } from './JubirStore'
import { JubirChannel, ChannelPlatform } from './JubirChannel'
import { JubirUser } from './JubirUser'
import { JubirWorkspace, WorkspaceStatus } from './JubirWorkspace'
import { JubirSession } from './JubirSession'
import { JubirResourceMapping, JubirResourceType } from './JubirResourceMapping'

export const jubirEntities = [
    JubirRegion,
    JubirOrganization,
    JubirStore,
    JubirChannel,
    JubirUser,
    JubirWorkspace,
    JubirSession,
    JubirResourceMapping
]

export {
    JubirRegion,
    JubirOrganization,
    JubirStore,
    JubirChannel,
    ChannelPlatform,
    JubirUser,
    JubirWorkspace,
    WorkspaceStatus,
    JubirSession,
    JubirResourceMapping,
    JubirResourceType
}
