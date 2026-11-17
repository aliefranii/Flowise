// packages/server/src/custom-rbac/entities/JubirResourceMapping.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

@Entity('jubir_resource_mapping')
export class JubirResourceMapping {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ name: 'resource_id', type: 'varchar', length: 100 })
    resourceId: string // Menyimpan ID dari tabel chat_flow / credential milik Flowise

    @Column({ name: 'resource_type', type: 'varchar', length: 50 })
    resourceType: string // 'CHATFLOW' | 'CREDENTIAL' | 'DOCUMENT_STORE'

    @Index()
    @Column({ name: 'region_id', type: 'uuid', nullable: true })
    regionId: string | null

    @Index()
    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string | null

    @Column({ name: 'store_id', type: 'uuid', nullable: true })
    storeId: string | null

    @CreateDateColumn()
    createdDate: Date
}
