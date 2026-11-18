import { Request } from 'express'
import { Brackets } from 'typeorm'
import { getDataSource } from '../../DataSource'
import { JubirOrganization, JubirSession, JubirUser, JubirWorkspace } from '../entities'
import { Role } from '../config/rbac.config'
import { hashPassword, verifyPassword } from './password'
import { validateEmail, validatePassword } from './validation'
import { hashRefreshToken, refreshTokenExpiryDate, signAccessToken, signRefreshToken, verifyRefreshToken } from './jwt'

export interface AuthSession {
    accessToken: string
    refreshToken: string
    user: PublicJubirUser
}

export interface PublicJubirUser {
    id: string
    name: string
    email: string
    role: Role
    regionId: string | null
    organizationId: string | null
    workspaceId: string | null
}

function toPublicUser(user: JubirUser): PublicJubirUser {
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        regionId: user.regionId,
        organizationId: user.organizationId,
        workspaceId: user.workspaceId
    }
}

async function createSession(user: JubirUser, req: Pick<Request, 'headers' | 'ip'>): Promise<AuthSession> {
    const sessionRepo = getDataSource().getRepository(JubirSession)
    const sessionRow = sessionRepo.create({
        userId: user.id,
        refreshTokenHash: '',
        userAgent: (req.headers['user-agent'] as string) || null,
        ipAddress: req.ip || null,
        expiresAt: refreshTokenExpiryDate(),
        revokedAt: null
    })
    const saved = await sessionRepo.save(sessionRow)

    const basePayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        regionId: user.regionId,
        organizationId: user.organizationId,
        workspaceId: user.workspaceId,
        sid: saved.id
    }
    const accessToken = signAccessToken(basePayload)
    const refreshToken = signRefreshToken(basePayload)

    saved.refreshTokenHash = hashRefreshToken(refreshToken)
    await sessionRepo.save(saved)

    return { accessToken, refreshToken, user: toPublicUser(user) }
}

export interface RegisterInput {
    name: string
    email: string
    password: string
    organizationName?: string
}

export async function register(input: RegisterInput, req: Pick<Request, 'headers' | 'ip'>): Promise<AuthSession> {
    const email = validateEmail(input.email)
    validatePassword(input.password)
    if (!input.name || input.name.length > 150) throw new Error('Nama tidak valid')

    const dataSource = getDataSource()
    const userRepo = dataSource.getRepository(JubirUser)

    const existing = await userRepo.findOne({ where: { email } })
    if (existing) throw new Error('Email sudah terdaftar')

    return await dataSource.transaction(async (manager) => {
        const firstUser = (await manager.count(JubirUser)) === 0
        if (!firstUser) throw new Error('Registrasi hanya terbuka untuk akun pertama. Hubungi administrator.')

        const region = await manager.query(`SELECT id FROM jubir_region ORDER BY created_date ASC LIMIT 1`)
        if (!region.length) throw new Error('Belum ada daerah (region). Jalankan seeder terlebih dahulu.')

        const org = manager.create(JubirOrganization, {
            name: input.organizationName?.trim() || 'Organisasi Default',
            regionId: region[0].id
        })
        const savedOrg = await manager.save(org)

        const workspace = manager.create(JubirWorkspace, {
            organizationId: savedOrg.id,
            name: 'Workspace Default',
            description: null
        })
        const savedWorkspace = await manager.save(workspace)

        const user = manager.create(JubirUser, {
            name: input.name.trim(),
            email,
            passwordHash: hashPassword(input.password),
            role: Role.SUPER_ADMIN,
            regionId: region[0].id,
            organizationId: savedOrg.id,
            workspaceId: savedWorkspace.id
        })
        const savedUser = await manager.save(user)

        return await createSession(savedUser, req)
    })
}

export async function login(emailRaw: unknown, password: unknown, req: Pick<Request, 'headers' | 'ip'>): Promise<AuthSession> {
    const email = validateEmail(emailRaw)
    if (!password || typeof password !== 'string') throw new Error('Password wajib diisi')

    const user = await getDataSource().getRepository(JubirUser).findOne({ where: { email } })
    if (!user) throw new Error('Email atau password salah')
    if (!verifyPassword(password, user.passwordHash)) throw new Error('Email atau password salah')

    return await createSession(user, req)
}

export async function refresh(refreshToken: string, req: Pick<Request, 'headers' | 'ip'>): Promise<AuthSession> {
    if (!refreshToken) throw new Error('Refresh token wajib diisi')
    const payload = verifyRefreshToken(refreshToken)
    const sessionRepo = getDataSource().getRepository(JubirSession)

    const session = await sessionRepo.findOne({ where: { id: payload.sid } })
    if (!session) throw new Error('Sesi tidak ditemukan')
    if (session.revokedAt) throw new Error('Sesi sudah dicabut')
    if (session.expiresAt.getTime() < Date.now()) throw new Error('Sesi kedaluwarsa')
    if (session.refreshTokenHash !== hashRefreshToken(refreshToken)) throw new Error('Refresh token tidak cocok')

    const user = await getDataSource()
        .getRepository(JubirUser)
        .findOne({ where: { id: payload.sub } })
    if (!user) throw new Error('Akun tidak ditemukan')

    session.revokedAt = new Date()
    await sessionRepo.save(session)

    return await createSession(user, req)
}

export async function logout(refreshToken: string): Promise<void> {
    if (!refreshToken) return
    try {
        const payload = verifyRefreshToken(refreshToken)
        const sessionRepo = getDataSource().getRepository(JubirSession)
        await sessionRepo.update({ id: payload.sid }, { revokedAt: new Date() })
    } catch {
        return
    }
}

export async function revokeAllSessions(userId: string): Promise<void> {
    const sessionRepo = getDataSource().getRepository(JubirSession)
    await sessionRepo
        .createQueryBuilder()
        .update(JubirSession)
        .set({ revokedAt: new Date() })
        .where('user_id = :userId', { userId })
        .andWhere(new Brackets((qb) => qb.where('revoked_at IS NULL')))
        .execute()
}
