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
import { JubirOrganization } from './JubirOrganization'
import { JubirChannel } from './JubirChannel'

@Entity('jubir_store')
export class JubirStore {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Index()
    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string

    @ManyToOne(() => JubirOrganization, (org) => org.stores, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: JubirOrganization

    @Column({ type: 'text', nullable: true })
    address: string | null

    @OneToMany(() => JubirChannel, (channel) => channel.store)
    channels: JubirChannel[]

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
