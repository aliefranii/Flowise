import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { JubirUser } from './JubirUser'

@Entity('jubir_session')
export class JubirSession {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ name: 'user_id', type: 'uuid' })
    userId: string

    @ManyToOne(() => JubirUser, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: JubirUser

    @Index()
    @Column({ name: 'refresh_token_hash', type: 'varchar', length: 255 })
    refreshTokenHash: string

    @Column({ name: 'user_agent', type: 'varchar', length: 255, nullable: true })
    userAgent: string | null

    @Column({ name: 'ip_address', type: 'varchar', length: 100, nullable: true })
    ipAddress: string | null

    @Column({ name: 'expires_at', type: 'timestamp' })
    expiresAt: Date

    @Column({ name: 'revoked_at', type: 'timestamp', nullable: true })
    revokedAt: Date | null

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
