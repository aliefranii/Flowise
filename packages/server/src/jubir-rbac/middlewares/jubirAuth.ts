import { NextFunction, Request, Response } from 'express'
import { getDataSource } from '../../DataSource'
import { JubirSession, JubirUser } from '../entities'
import { Role, Scope } from '../config/rbac.config'
import { JubirTokenPayload, verifyAccessToken } from '../auth/jwt'

export interface JubirRequestUser {
    id: string
    email: string
    name: string
    role: Role
    regionId: string | null
    organizationId: string | null
    workspaceId: string | null
}

export interface JubirRequestContext {
    organization?: {
        id: string
        name: string
        regionId: string
        subscriptionId: string | null
        subscriptionPlan: string | null
        subscriptionStatus: string | null
        customerId?: string | null
    }
    workspace?: { id: string; name: string; organizationId: string; storeId: string | null }
}

declare global {
    namespace Express {
        interface Request {
            jubirUser?: JubirRequestUser
            jubirContext?: JubirRequestContext
            accessScope?: Scope
        }
    }
}

export const requireJubirAuth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies?.jubirAccessToken

        if (!token) return res.status(401).json({ message: 'Unauthorized' })

        const payload: JubirTokenPayload = verifyAccessToken(token)
        const dataSource = getDataSource()
        const user = await dataSource.getRepository(JubirUser).findOne({
            where: { id: payload.sub },
            relations: ['organization', 'workspace', 'workspace.store']
        })
        if (!user) return res.status(401).json({ message: 'Akun tidak ditemukan' })

        const session = await dataSource.getRepository(JubirSession).findOne({ where: { id: payload.sid } })
        if (!session || session.revokedAt || session.expiresAt.getTime() < Date.now()) {
            return res.status(401).json({ message: 'Sesi tidak valid' })
        }

        req.jubirUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            regionId: user.regionId,
            organizationId: user.organizationId,
            workspaceId: user.workspaceId
        }

        if (user.organization) {
            req.jubirContext = {
                organization: {
                    id: user.organization.id,
                    name: user.organization.name,
                    regionId: user.organization.regionId,
                    subscriptionId: user.organization.subscriptionId,
                    subscriptionPlan: user.organization.subscriptionPlan,
                    subscriptionStatus: user.organization.subscriptionStatus
                }
            }
        }
        if (user.workspace) {
            req.jubirContext = {
                ...req.jubirContext,
                workspace: {
                    id: user.workspace.id,
                    name: user.workspace.name,
                    organizationId: user.workspace.organizationId,
                    storeId: user.workspace.storeId
                }
            }
        }

        next()
    } catch (error) {
        return res.status(401).json({ message: 'Token tidak valid' })
    }
}

export const requireJubirRoles = (...roles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.jubirUser) return res.status(401).json({ message: 'Unauthorized' })
        if (!roles.includes(req.jubirUser.role)) return res.status(403).json({ message: 'Forbidden' })
        next()
    }
}
