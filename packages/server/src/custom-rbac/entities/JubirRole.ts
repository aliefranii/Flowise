// packages/server/src/custom-rbac/entities/JubirUser.ts
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'
import { Role } from '../config/rbac.config'

@Entity('jubir_user')
export class JubirUser {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Column({ type: 'varchar', length: 150 })
    name: string

    @Column({ type: 'varchar', length: 150, unique: true })
    email: string

    @Column({ type: 'varchar', length: 255 })
    passwordHash: string

    @Column({ type: 'varchar', length: 50, default: Role.USER })
    role: Role // SUPER_ADMIN | ADMIN_DAERAH | ADMIN_ORGANISASI | USER

    @Column({ name: 'region_id', type: 'uuid', nullable: true })
    regionId: string | null

    @Column({ name: 'organization_id', type: 'uuid', nullable: true })
    organizationId: string | null

    @CreateDateColumn()
    createdDate: Date

    @UpdateDateColumn()
    updatedDate: Date
}
