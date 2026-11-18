import { NextFunction, Request, Response } from 'express'
import { getDataSource } from '../../DataSource'
import { JubirUser } from '../entities'
import { verifyAccessToken } from '../auth/jwt'

export const attachJubirUser = async (req: Request, _res: Response, next: NextFunction) => {
    if (req.jubirUser) return next()

    const token = req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : req.cookies?.jubirAccessToken
    if (!token) return next()

    try {
        const payload = verifyAccessToken(token)
        const user = await getDataSource()
            .getRepository(JubirUser)
            .findOne({
                where: { id: payload.sub },
                relations: ['organization', 'workspace']
            })
        if (!user) return next()

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
    } catch {
        return next()
    }
    next()
}
