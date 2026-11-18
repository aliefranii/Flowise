import { DataSource, EntityManager } from 'typeorm'
import { getDataSource } from '../../DataSource'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { Credential } from '../../database/entities/Credential'
import { DocumentStore } from '../../database/entities/DocumentStore'
import logger from '../../utils/logger'
import { JubirResourceMapping, JubirResourceType, JubirWorkspace } from '../entities'

export interface EnsureResourceMappingInput {
    resourceId: string
    resourceType: JubirResourceType
    workspaceId?: string | null
    organizationId?: string | null
    regionId?: string | null
    storeId?: string | null
    manager?: EntityManager
    dataSource?: DataSource
}

interface ResolvedHierarchyContext {
    regionId: string | null
    organizationId: string | null
    workspaceId: string | null
    storeId: string | null
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function toNullableUuid(value?: string | null): string | null {
    if (!value || !UUID_REGEX.test(value)) return null
    return value
}

async function resolveHierarchyContext(
    manager: EntityManager,
    input: {
        workspaceId?: string | null
        organizationId?: string | null
        regionId?: string | null
        storeId?: string | null
    }
): Promise<ResolvedHierarchyContext> {
    let regionId = toNullableUuid(input.regionId)
    let organizationId = toNullableUuid(input.organizationId)
    const workspaceId = toNullableUuid(input.workspaceId)
    let storeId = toNullableUuid(input.storeId)

    if (workspaceId && (!regionId || !organizationId || input.storeId === undefined)) {
        const workspace = await manager.getRepository(JubirWorkspace).findOne({
            where: { id: workspaceId },
            relations: ['organization']
        })
        if (workspace) {
            organizationId = organizationId ?? workspace.organizationId
            regionId = regionId ?? workspace.organization?.regionId ?? null
            storeId = storeId ?? workspace.storeId ?? null
        }
    }

    return { regionId, organizationId, workspaceId, storeId }
}

/**
 * Creates or updates a single `JubirResourceMapping` row idempotently (keyed by resourceType + resourceId).
 */
export async function ensureResourceMapping(input: EnsureResourceMappingInput): Promise<JubirResourceMapping> {
    const manager = input.manager ?? (input.dataSource ?? getDataSource()).manager
    const mappingRepo = manager.getRepository(JubirResourceMapping)
    const context = await resolveHierarchyContext(manager, input)

    const existing = await mappingRepo.findOne({
        where: { resourceType: input.resourceType, resourceId: input.resourceId }
    })

    if (existing) {
        existing.regionId = context.regionId
        existing.organizationId = context.organizationId
        existing.workspaceId = context.workspaceId
        existing.storeId = context.storeId
        return await mappingRepo.save(existing)
    }

    const mapping = mappingRepo.create({
        resourceId: input.resourceId,
        resourceType: input.resourceType,
        regionId: context.regionId,
        organizationId: context.organizationId,
        workspaceId: context.workspaceId,
        storeId: context.storeId
    })
    return await mappingRepo.save(mapping)
}

/**
 * Idempotently writes `JubirResourceMapping` rows for a batch of resources sharing one workspace context.
 */
export async function ensureResourceMappingsBatch(
    entries: Array<{ resourceId: string; resourceType: JubirResourceType }>,
    contextInput: {
        workspaceId?: string | null
        organizationId?: string | null
        regionId?: string | null
        storeId?: string | null
    },
    manager?: EntityManager,
    dataSource?: DataSource
): Promise<void> {
    if (entries.length === 0) return
    const resolvedManager = manager ?? (dataSource ?? getDataSource()).manager
    const context = await resolveHierarchyContext(resolvedManager, contextInput)
    const mappingRepo = resolvedManager.getRepository(JubirResourceMapping)

    const existingRows = await mappingRepo.find()
    const existingByKey = new Map<string, JubirResourceMapping>()
    for (const row of existingRows) {
        existingByKey.set(`${row.resourceType}:${row.resourceId}`, row)
    }

    const toSave: JubirResourceMapping[] = []
    for (const entry of entries) {
        if (!entry.resourceId) continue
        const key = `${entry.resourceType}:${entry.resourceId}`
        const existing = existingByKey.get(key)
        if (existing) {
            if (
                existing.regionId !== context.regionId ||
                existing.organizationId !== context.organizationId ||
                existing.workspaceId !== context.workspaceId ||
                existing.storeId !== context.storeId
            ) {
                existing.regionId = context.regionId
                existing.organizationId = context.organizationId
                existing.workspaceId = context.workspaceId
                existing.storeId = context.storeId
                toSave.push(existing)
            }
            continue
        }
        const created = mappingRepo.create({
            resourceId: entry.resourceId,
            resourceType: entry.resourceType,
            regionId: context.regionId,
            organizationId: context.organizationId,
            workspaceId: context.workspaceId,
            storeId: context.storeId
        })
        existingByKey.set(key, created)
        toSave.push(created)
    }

    if (toSave.length > 0) {
        await mappingRepo.save(toSave)
    }
}

export async function deleteResourceMapping(
    resourceType: JubirResourceType,
    resourceId: string,
    manager?: EntityManager,
    dataSource?: DataSource
): Promise<void> {
    if (!resourceId) return
    const resolvedManager = manager ?? (dataSource ?? getDataSource()).manager
    await resolvedManager.getRepository(JubirResourceMapping).delete({ resourceType, resourceId })
}

/**
 * Idempotently backfills `JubirResourceMapping` for existing ChatFlow, Credential, and DocumentStore rows.
 */
export async function backfillJubirResourceMappings(
    dataSourceArg?: DataSource
): Promise<{ inserted: number; updated: number; skipped: number }> {
    const dataSource = dataSourceArg ?? getDataSource()
    if (!dataSource || !dataSource.isInitialized) {
        return { inserted: 0, updated: 0, skipped: 0 }
    }

    const workspaces = await dataSource.getRepository(JubirWorkspace).find({ relations: ['organization'] })
    const workspaceById = new Map<string, JubirWorkspace>()
    for (const ws of workspaces) {
        workspaceById.set(ws.id, ws)
    }

    const mappingRepo = dataSource.getRepository(JubirResourceMapping)
    const existingMappings = await mappingRepo.find()
    const existingByKey = new Map<string, JubirResourceMapping>()
    for (const m of existingMappings) {
        existingByKey.set(`${m.resourceType}:${m.resourceId}`, m)
    }

    const [chatflows, credentials, docStores] = await Promise.all([
        dataSource.getRepository(ChatFlow).find({ select: ['id', 'workspaceId'] }),
        dataSource.getRepository(Credential).find({ select: ['id', 'workspaceId'] }),
        dataSource.getRepository(DocumentStore).find({ select: ['id', 'workspaceId'] })
    ])

    const allResources: Array<{ id: string; workspaceId: string; resourceType: JubirResourceType }> = [
        ...chatflows.map((c) => ({ id: c.id, workspaceId: c.workspaceId, resourceType: JubirResourceType.CHATFLOW })),
        ...credentials.map((c) => ({ id: c.id, workspaceId: c.workspaceId, resourceType: JubirResourceType.CREDENTIAL })),
        ...docStores.map((d) => ({ id: d.id, workspaceId: d.workspaceId, resourceType: JubirResourceType.DOCUMENT_STORE }))
    ]

    const toSave: JubirResourceMapping[] = []
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const res of allResources) {
        const key = `${res.resourceType}:${res.id}`
        const workspace = res.workspaceId ? workspaceById.get(res.workspaceId) : undefined
        const regionId = workspace?.organization?.regionId ?? null
        const organizationId = workspace?.organizationId ?? null
        const workspaceId = workspace?.id ?? null
        const storeId = workspace?.storeId ?? null

        const existing = existingByKey.get(key)
        if (existing) {
            if (!existing.organizationId && organizationId) {
                existing.regionId = regionId
                existing.organizationId = organizationId
                existing.workspaceId = workspaceId
                existing.storeId = storeId
                toSave.push(existing)
                updated += 1
            } else {
                skipped += 1
            }
            continue
        }

        const created = mappingRepo.create({
            resourceId: res.id,
            resourceType: res.resourceType,
            regionId,
            organizationId,
            workspaceId,
            storeId
        })
        existingByKey.set(key, created)
        toSave.push(created)
        inserted += 1
    }

    if (toSave.length > 0) {
        await mappingRepo.save(toSave)
    }

    logger.info(`🔒 [JubirResourceMapping]: Backfill selesai (inserted=${inserted}, updated=${updated}, skipped=${skipped}).`)
    return { inserted, updated, skipped }
}
