// packages/server/src/custom-rbac/entities/Region.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm'
import { JubirOrganization } from './JubirOrganization'

@Entity('jubir_region')
export class JubirRegion {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 100 })
    name: string

    @Column({ type: 'varchar', length: 50, unique: true })
    code: string // Contoh: 'SULSEL', 'JABODETABEK'

    @OneToMany(() => JubirOrganization, (org) => org.region)
    organizations: JubirOrganization[]

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
