import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { JubirOrganization } from './JubirOrganization'
import { JubirStore } from './JubirStore'

export enum WorkspaceStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

@Entity('jubir_workspace')
export class JubirWorkspace {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string

    @ManyToOne(() => JubirOrganization, (org) => org.workspaces, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: JubirOrganization

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Column({ type: 'text', nullable: true })
    description: string | null

    @Index()
    @Column({ name: 'store_id', type: 'uuid', nullable: true })
    storeId: string | null

    @ManyToOne(() => JubirStore, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'store_id' })
    store: JubirStore | null

    @Column({ type: 'varchar', length: 20, default: WorkspaceStatus.ACTIVE })
    status: WorkspaceStatus

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
