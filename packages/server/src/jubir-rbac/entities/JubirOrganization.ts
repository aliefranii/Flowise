import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    ManyToOne,
    OneToMany,
    JoinColumn,
    Index
} from 'typeorm'
import { JubirRegion } from './JubirRegion'
import { JubirStore } from './JubirStore'
import { JubirWorkspace } from './JubirWorkspace'

@Entity('jubir_organization')
export class JubirOrganization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Index()
    @Column({ name: 'region_id', type: 'uuid' })
    regionId: string

    @ManyToOne(() => JubirRegion, (region) => region.organizations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'region_id' })
    region: JubirRegion

    @Column({ name: 'subscription_id', type: 'varchar', length: 255, nullable: true })
    subscriptionId: string | null

    @Column({ name: 'subscription_plan', type: 'varchar', length: 50, nullable: true })
    subscriptionPlan: string | null

    @Column({ name: 'subscription_status', type: 'varchar', length: 50, nullable: true })
    subscriptionStatus: string | null

    @Column({ name: 'subscription_expires_at', type: 'timestamp', nullable: true })
    subscriptionExpiresAt: Date | null

    @OneToMany(() => JubirStore, (store) => store.organization)
    stores: JubirStore[]

    @OneToMany(() => JubirWorkspace, (workspace) => workspace.organization)
    workspaces: JubirWorkspace[]

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
