import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index } from 'typeorm'
import { JubirStore } from './JubirStore'

export enum ChannelPlatform {
    WHATSAPP = 'WA',
    WEB = 'WEB',
    TELEGRAM = 'TG'
}

@Entity('jubir_channel')
export class JubirChannel {
    @PrimaryGeneratedColumn('uuid')
    id: string

    @Index()
    @Column({ name: 'store_id', type: 'uuid' })
    storeId: string

    @ManyToOne(() => JubirStore, (store) => store.channels, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'store_id' })
    store: JubirStore

    @Column({ type: 'varchar', length: 20, default: ChannelPlatform.WEB })
    platform: ChannelPlatform

    @Column({ name: 'webhook_token', type: 'varchar', length: 255, unique: true })
    webhookToken: string

    @Index()
    @Column({ name: 'active_chatflow_id', type: 'varchar', length: 100, nullable: true })
    activeChatflowId: string | null // Merujuk ke chat_flow.id di tabel core Flowise

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean

    @CreateDateColumn({ name: 'created_date' })
    createdDate: Date

    @UpdateDateColumn({ name: 'updated_date' })
    updatedDate: Date
}
