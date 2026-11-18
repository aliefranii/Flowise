import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm'

export enum JubirResourceType {
    CHATFLOW = 'CHATFLOW',
    CREDENTIAL = 'CREDENTIAL',
    DOCUMENT_STORE = 'DOCUMENT_STORE'
}

@Entity('jubir_resource_mapping')
@Index('UQ_jubir_mapping_type_res_id', ['resourceType', 'resourceId'], { unique: true })
export class JubirResourceMapping {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ name: 'resource_id', type: 'varchar', length: 100 })
    resourceId: string // UUID asli dari chat_flow / credential / document_store Flowise

    @Column({ name: 'resource_type', type: 'varchar', length: 50 })
    resourceType: JubirResourceType

    @Index()
    @Column({ name: 'region_id', type: 'uuid', nullable: true })
    regionId: string | null

    @Index()
    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string | null

    @Index()
    @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
    workspaceId: string | null

    @Index()
    @Column({ name: 'store_id', type: 'uuid', nullable: true })
    storeId: string | null

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date
}
