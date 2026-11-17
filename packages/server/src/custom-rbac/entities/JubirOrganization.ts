// packages/server/src/custom-rbac/entities/JubirOrganization.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm'
import { JubirRegion } from './Region'
import { JubirStore } from './JubirStore'

@Entity('jubir_organization')
export class JubirOrganization {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Column({ name: 'region_id', type: 'uuid' })
    regionId: string

    @ManyToOne(() => JubirRegion, (region) => region.organizations, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'region_id' })
    region: JubirRegion

    @OneToMany(() => JubirStore, (store) => store.organization)
    stores: JubirStore[]

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
