import { NextFunction, Request, Response } from 'express'
import { DataSource } from 'typeorm'
import { API_KEY_BLACKLIST_URLS } from '../../utils/constants'
import { validateAPIKey } from '../../utils/validateKey'
import { Role } from '../config/rbac.config'
import { JubirWorkspace } from '../entities'
import { requireJubirAuth } from './jubirAuth'

const URL_CASE_INSENSITIVE_REGEX = /\/api\/v1\//i
const URL_CASE_SENSITIVE_REGEX = /\/api\/v1\//

export interface JubirGatekeeperOptions {
    whitelistURLs: string[]
    dataSource: DataSource
}

/**
 * Global /api/v1/ authentication gatekeeper using pure Jubir JWT/cookie auth
 * and JubirWorkspace-backed API keys, without enterprise passport or IdentityManager.
 */
export function createJubirApiGatekeeper({ whitelistURLs, dataSource }: JubirGatekeeperOptions) {
    return async (req: Request, res: Response, next: NextFunction) => {
        if (!URL_CASE_INSENSITIVE_REGEX.test(req.path)) {
            return next()
        }
        if (!URL_CASE_SENSITIVE_REGEX.test(req.path)) {
            return res.status(401).json({ error: 'Unauthorized Access' })
        }

        const isWhitelisted = whitelistURLs.some((url) => req.path.startsWith(url))
        const isJubirRequest = req.path.startsWith('/api/v1/jubir')
        if (isWhitelisted || isJubirRequest) {
            return next()
        }

        if (req.headers['x-request-from'] === 'internal' || req.cookies?.jubirAccessToken || req.jubirUser) {
            return requireJubirAuth(req, res, next)
        }

        const isAPIKeyBlacklisted = API_KEY_BLACKLIST_URLS.some((url) => req.path.startsWith(url))
        if (isAPIKeyBlacklisted) {
            return res.status(401).json({ error: 'Unauthorized Access' })
        }

        if (process.env.JUBIR_REQUIRE_LICENSE === 'true' && !process.env.JUBIR_LICENSE_KEY?.trim()) {
            return res.status(401).json({ error: 'Unauthorized Access' })
        }

        try {
            const { isValid, apiKey } = await validateAPIKey(req)
            if (!isValid || !apiKey) {
                return res.status(401).json({ error: 'Unauthorized Access' })
            }

            const workspace = await dataSource.getRepository(JubirWorkspace).findOne({
                where: { id: apiKey.workspaceId },
                relations: ['organization']
            })
            if (!workspace || !workspace.organization) {
                return res.status(401).json({ error: 'Unauthorized Access' })
            }

            req.jubirUser = {
                id: apiKey.id,
                email: '',
                name: apiKey.keyName,
                role: Role.USER,
                regionId: workspace.organization.regionId,
                organizationId: workspace.organizationId,
                workspaceId: workspace.id
            }
            req.jubirContext = {
                organization: {
                    id: workspace.organization.id,
                    name: workspace.organization.name,
                    regionId: workspace.organization.regionId,
                    subscriptionId: workspace.organization.subscriptionId ?? null,
                    subscriptionPlan: workspace.organization.subscriptionPlan ?? null,
                    subscriptionStatus: workspace.organization.subscriptionStatus
                },
                workspace: {
                    id: workspace.id,
                    name: workspace.name,
                    organizationId: workspace.organizationId,
                    storeId: workspace.storeId
                }
            }
            return next()
        } catch (error) {
            return next(error)
        }
    }
}
