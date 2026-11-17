// packages/server/src/custom-rbac/entities/JubirtStore.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { JubirOrganization } from './JubirOrganization'

@Entity('jubir_store')
export class JubirStore {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Column({ name: 'organization_id', type: 'uuid' })
    organizationId: string

    @ManyToOne(() => JubirOrganization, (org) => org.stores, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'organization_id' })
    organization: JubirOrganization

    @Column({ type: 'text', nullable: true })
    address: string

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
