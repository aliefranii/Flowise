import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { Role } from '../config/rbac.config'
import { JubirRegion } from './JubirRegion'
import { JubirOrganization } from './JubirOrganization'
import { JubirWorkspace } from './JubirWorkspace'

@Entity('jubir_user')
export class JubirUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Column({ type: 'varchar', length: 150, unique: true })
    email: string

    @Column({ name: 'password_hash', type: 'varchar', length: 255 })
    passwordHash: string

    @Column({ type: 'varchar', length: 50, default: Role.USER })
    role: Role // SUPER_ADMIN | ADMIN_DAERAH | ADMIN_ORGANISASI | USER

    @Index()
    @Column({ name: 'region_id', type: 'uuid', nullable: true })
    regionId: string | null

    @ManyToOne(() => JubirRegion, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'region_id' })
    region: JubirRegion | null

    @Index()
    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string | null

    @ManyToOne(() => JubirOrganization, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'organization_id' })
    organization: JubirOrganization | null

    @Index()
    @Column({ name: 'workspace_id', type: 'uuid', nullable: true })
    workspaceId: string | null

    @ManyToOne(() => JubirWorkspace, { onDelete: 'SET NULL', nullable: true })
    @JoinColumn({ name: 'workspace_id' })
    workspace: JubirWorkspace | null

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
