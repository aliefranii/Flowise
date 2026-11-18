// packages/server/src/jubir-rbac/seeders/jubirAdminSeeder.ts
import { getDataSource } from '../../DataSource'
import { JubirOrganization, JubirRegion, JubirUser, JubirWorkspace } from '../entities'
import { Role } from '../config/rbac.config'
import { hashPassword } from '../auth/password'
import logger from '../../utils/logger'

export { hashPassword } from '../auth/password'
export { verifyPassword } from '../auth/password'

/**
 * Fungsi Seeder Idempotent untuk SUPER_ADMIN pertama kali
 */
export async function seedJubirSuperAdmin(): Promise<void> {
    try {
        const dataSource = getDataSource()
        if (!dataSource || !dataSource.isInitialized) {
            console.warn('⚠️ [JubirSeeder]: DataSource belum siap, seeding dilewati.')
            return
        }

        const userRepo = dataSource.getRepository(JubirUser)

        // 1. Cek apakah sudah ada minimal 1 akun SUPER_ADMIN di database
        const existingSuperAdmin = await userRepo.findOne({
            where: { role: Role.SUPER_ADMIN }
        })

        if (existingSuperAdmin) {
            logger.info(`✅ [JubirSeeder]: Akun SUPER_ADMIN sudah tersedia (${existingSuperAdmin.email}).`)
            return
        }

        // 2. Ambil kredensial awal dari environment variable (atau gunakan default aman)
        const adminName = process.env.JUBIR_SUPERADMIN_NAME || 'Super Admin Jubir'
        const adminEmail = process.env.JUBIR_SUPERADMIN_EMAIL || 'superadmin@jubir.local'
        const adminPassword = process.env.JUBIR_SUPERADMIN_PASSWORD || 'JubirAdmin#2026!'

        // 3. Pastikan ada region, organisasi, dan workspace awal agar SUPER_ADMIN punya konteks tenancy
        const regionRepo = dataSource.getRepository(JubirRegion)
        let region = await regionRepo.findOne({ where: {}, order: { createdDate: 'ASC' } })
        if (!region) {
            region = await regionRepo.save(regionRepo.create({ name: 'Daerah Default', code: 'DEFAULT' }))
        }

        const orgRepo = dataSource.getRepository(JubirOrganization)
        let org = await orgRepo.findOne({ where: { regionId: region.id }, order: { createdDate: 'ASC' } })
        if (!org) {
            org = await orgRepo.save(orgRepo.create({ name: 'Organisasi Default', regionId: region.id }))
        }

        const workspaceRepo = dataSource.getRepository(JubirWorkspace)
        let workspace = await workspaceRepo.findOne({ where: { organizationId: org.id }, order: { createdDate: 'ASC' } })
        if (!workspace) {
            workspace = await workspaceRepo.save(
                workspaceRepo.create({ organizationId: org.id, name: 'Workspace Default', description: null })
            )
        }

        const superAdmin = userRepo.create({
            name: adminName,
            email: adminEmail.toLowerCase().trim(),
            passwordHash: hashPassword(adminPassword),
            role: Role.SUPER_ADMIN,
            regionId: region.id,
            organizationId: org.id,
            workspaceId: workspace.id
        })

        await userRepo.save(superAdmin)
        logger.info(`🚀 [JubirSeeder]: Berhasil membuat akun SUPER_ADMIN awal -> ${adminEmail}`)
    } catch (error) {
        console.error('❌ [JubirSeeder]: Gagal menjalankan seeder SUPER_ADMIN:', error)
    }
}
