import { Request, Response } from 'express'
import { getDataSource } from '../../DataSource'
import { JubirRegion, JubirOrganization, JubirStore } from '../entities'

// ============================================================================
// 1. REGION CONTROLLER (DAERAH)
// ============================================================================

export const getRegions = async (req: Request, res: Response) => {
    try {
        const repo = getDataSource().getRepository(JubirRegion)
        const user = req.jubirUser!

        // GLOBAL melihat semua daerah; role lain hanya melihat daerahnya sendiri
        if (req.accessScope === 'GLOBAL') {
            const regions = await repo.find({ order: { name: 'ASC' } })
            return res.json(regions)
        }

        if (!user.regionId) return res.json([])

        const regions = await repo.find({
            where: { id: user.regionId },
            order: { name: 'ASC' }
        })
        return res.json(regions)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal mengambil data daerah', error: error.message })
    }
}

export const createRegion = async (req: Request, res: Response) => {
    try {
        const { name, code } = req.body
        if (!name || !code) {
            return res.status(400).json({ message: 'Field name dan code wajib diisi' })
        }

        const repo = getDataSource().getRepository(JubirRegion)
        const existing = await repo.findOne({ where: { code: code.toUpperCase().trim() } })
        if (existing) {
            return res.status(409).json({ message: `Kode daerah '${code}' sudah terdaftar` })
        }

        const newRegion = repo.create({
            name: name.trim(),
            code: code.toUpperCase().trim()
        })
        const saved = await repo.save(newRegion)
        return res.status(201).json(saved)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal membuat daerah', error: error.message })
    }
}

export const updateRegion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { name, code } = req.body
        const repo = getDataSource().getRepository(JubirRegion)

        const region = await repo.findOne({ where: { id } })
        if (!region) return res.status(404).json({ message: 'Daerah tidak ditemukan' })

        if (name) region.name = name.trim()
        if (code) {
            const newCode = code.toUpperCase().trim()
            const dup = await repo.findOne({ where: { code: newCode } })
            if (dup && dup.id !== region.id) {
                return res.status(409).json({ message: `Kode daerah '${code}' sudah terdaftar` })
            }
            region.code = newCode
        }

        const updated = await repo.save(region)
        return res.json(updated)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal memperbarui daerah', error: error.message })
    }
}

export const deleteRegion = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const repo = getDataSource().getRepository(JubirRegion)

        const result = await repo.delete(id)
        if (!result.affected) return res.status(404).json({ message: 'Daerah tidak ditemukan' })

        return res.json({ message: 'Daerah berhasil dihapus' })
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal menghapus daerah', error: error.message })
    }
}

// ============================================================================
// 2. ORGANIZATION CONTROLLER (ORGANISASI)
// ============================================================================

export const getOrganizations = async (req: Request, res: Response) => {
    try {
        const repo = getDataSource().getRepository(JubirOrganization)
        const user = req.jubirUser!

        if (req.accessScope === 'GLOBAL') {
            const orgs = await repo.find({ relations: ['region'], order: { name: 'ASC' } })
            return res.json(orgs)
        }

        if (req.accessScope === 'REGION') {
            if (!user.regionId) return res.json([])
            const orgs = await repo.find({
                where: { regionId: user.regionId },
                relations: ['region'],
                order: { name: 'ASC' }
            })
            return res.json(orgs)
        }

        // Scope 'ORG' (ADMIN_ORGANISASI & USER)
        if (!user.organizationId) return res.json([])
        const orgs = await repo.find({
            where: { id: user.organizationId },
            relations: ['region']
        })
        return res.json(orgs)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal mengambil data organisasi', error: error.message })
    }
}

export const createOrganization = async (req: Request, res: Response) => {
    try {
        const { name } = req.body
        const user = req.jubirUser!

        // GLOBAL dapat menetapkan regionId; REGION/ORG memaksa daerah pengguna
        const targetRegionId = req.accessScope === 'GLOBAL' ? req.body.regionId : user.regionId

        if (!name || !targetRegionId) {
            return res.status(400).json({ message: 'Field name dan regionId wajib diisi' })
        }

        const regionRepo = getDataSource().getRepository(JubirRegion)
        const regionExists = await regionRepo.findOne({ where: { id: targetRegionId } })
        if (!regionExists) {
            return res.status(404).json({ message: 'Daerah (regionId) tidak ditemukan' })
        }

        const orgRepo = getDataSource().getRepository(JubirOrganization)
        const newOrg = orgRepo.create({
            name: name.trim(),
            regionId: targetRegionId
        })
        const saved = await orgRepo.save(newOrg)
        return res.status(201).json(saved)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal membuat organisasi', error: error.message })
    }
}

export const updateOrganization = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { name, regionId } = req.body
        const user = req.jubirUser!
        const repo = getDataSource().getRepository(JubirOrganization)

        const org = await repo.findOne({ where: { id } })
        if (!org) return res.status(404).json({ message: 'Organisasi tidak ditemukan' })

        // Validasi kepemilikan berdasarkan scope
        if (req.accessScope === 'REGION' && org.regionId !== user.regionId) {
            return res.status(403).json({ message: 'Forbidden: Organisasi di luar daerah Anda' })
        }
        if (req.accessScope === 'ORG' && org.id !== user.organizationId) {
            return res.status(403).json({ message: 'Forbidden: Bukan organisasi Anda' })
        }

        if (name) org.name = name.trim()
        // Hanya GLOBAL yang boleh memindahkan organisasi ke daerah lain
        if (regionId && req.accessScope === 'GLOBAL') {
            org.regionId = regionId
        }

        const updated = await repo.save(org)
        return res.json(updated)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal memperbarui organisasi', error: error.message })
    }
}

export const deleteOrganization = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const user = req.jubirUser!
        const repo = getDataSource().getRepository(JubirOrganization)

        const org = await repo.findOne({ where: { id } })
        if (!org) return res.status(404).json({ message: 'Organisasi tidak ditemukan' })

        if (req.accessScope === 'REGION' && org.regionId !== user.regionId) {
            return res.status(403).json({ message: 'Forbidden: Organisasi di luar daerah Anda' })
        }

        await repo.delete(id)
        return res.json({ message: 'Organisasi berhasil dihapus' })
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal menghapus organisasi', error: error.message })
    }
}

// ============================================================================
// 3. STORE CONTROLLER (CABANG)
// ============================================================================

export const getStores = async (req: Request, res: Response) => {
    try {
        const repo = getDataSource().getRepository(JubirStore)
        const user = req.jubirUser!

        if (req.accessScope === 'GLOBAL') {
            const stores = await repo.find({
                relations: ['organization', 'organization.region'],
                order: { name: 'ASC' }
            })
            return res.json(stores)
        }

        if (req.accessScope === 'REGION') {
            if (!user.regionId) return res.json([])
            const stores = await repo
                .createQueryBuilder('store')
                .innerJoinAndSelect('store.organization', 'org')
                .where('org.regionId = :regionId', { regionId: user.regionId })
                .orderBy('store.name', 'ASC')
                .getMany()
            return res.json(stores)
        }

        // Scope 'ORG' (ADMIN_ORGANISASI & USER)
        if (!user.organizationId) return res.json([])
        const stores = await repo.find({
            where: { organizationId: user.organizationId },
            relations: ['organization'],
            order: { name: 'ASC' }
        })
        return res.json(stores)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal mengambil data store', error: error.message })
    }
}

export const createStore = async (req: Request, res: Response) => {
    try {
        const { name, address } = req.body
        const user = req.jubirUser!

        // GLOBAL dapat memilih organisasi; ORG memaksa organisasi pengguna
        const targetOrgId = req.accessScope === 'ORG' ? user.organizationId : req.body.organizationId

        if (!name || !targetOrgId) {
            return res.status(400).json({ message: 'Field name dan organizationId wajib diisi' })
        }

        const orgRepo = getDataSource().getRepository(JubirOrganization)
        const targetOrg = await orgRepo.findOne({ where: { id: targetOrgId } })
        if (!targetOrg) {
            return res.status(404).json({ message: 'Organisasi tidak ditemukan' })
        }

        // Jika ADMIN_DAERAH, pastikan targetOrg berada di dalam regionId-nya
        if (req.accessScope === 'REGION' && targetOrg.regionId !== user.regionId) {
            return res.status(403).json({ message: 'Forbidden: Organisasi target di luar daerah Anda' })
        }

        const storeRepo = getDataSource().getRepository(JubirStore)
        const newStore = storeRepo.create({
            name: name.trim(),
            organizationId: targetOrgId,
            address: address || null
        })
        const saved = await storeRepo.save(newStore)
        return res.status(201).json(saved)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal membuat store', error: error.message })
    }
}

export const updateStore = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const { name, address } = req.body
        const user = req.jubirUser!
        const repo = getDataSource().getRepository(JubirStore)

        const store = await repo.findOne({
            where: { id },
            relations: ['organization']
        })
        if (!store) return res.status(404).json({ message: 'Store tidak ditemukan' })

        // Validasi scope
        if (req.accessScope === 'REGION' && store.organization.regionId !== user.regionId) {
            return res.status(403).json({ message: 'Forbidden: Store di luar daerah Anda' })
        }
        if (req.accessScope === 'ORG' && store.organizationId !== user.organizationId) {
            return res.status(403).json({ message: 'Forbidden: Store di luar organisasi Anda' })
        }

        if (name) store.name = name.trim()
        if (address !== undefined) store.address = address

        const updated = await repo.save(store)
        return res.json(updated)
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal memperbarui store', error: error.message })
    }
}

export const deleteStore = async (req: Request, res: Response) => {
    try {
        const { id } = req.params
        const user = req.jubirUser!
        const repo = getDataSource().getRepository(JubirStore)

        const store = await repo.findOne({
            where: { id },
            relations: ['organization']
        })
        if (!store) return res.status(404).json({ message: 'Store tidak ditemukan' })

        if (req.accessScope === 'REGION' && store.organization.regionId !== user.regionId) {
            return res.status(403).json({ message: 'Forbidden: Store di luar daerah Anda' })
        }
        if (req.accessScope === 'ORG' && store.organizationId !== user.organizationId) {
            return res.status(403).json({ message: 'Forbidden: Store di luar organisasi Anda' })
        }

        await repo.delete(id)
        return res.json({ message: 'Store berhasil dihapus' })
    } catch (error: any) {
        return res.status(500).json({ message: 'Gagal menghapus store', error: error.message })
    }
}
