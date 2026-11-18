import { NextFunction, Request, Response } from 'express'
import { getDataSource } from '../../DataSource'
import { JubirOrganization } from '../entities'
import { requireJubirAuth } from './jubirAuth'

async function verifySubscription(req: Request, res: Response, next: NextFunction, feature?: string) {
    try {
        if (!req.jubirUser?.organizationId) {
            return res.status(403).json({ message: 'Organisasi tidak ditemukan' })
        }

        const org = await getDataSource()
            .getRepository(JubirOrganization)
            .findOne({ where: { id: req.jubirUser.organizationId } })
        if (!org) return res.status(404).json({ message: 'Organisasi tidak ditemukan' })

        if (!isSubscriptionActive(org)) {
            return res.status(402).json({ message: 'Langganan tidak aktif', feature: feature ?? null })
        }
        return next()
    } catch (error) {
        return next(error)
    }
}

export const requireJubirSubscription = (feature?: string) => (req: Request, res: Response, next: NextFunction) => {
    if (req.jubirUser) {
        void verifySubscription(req, res, next, feature)
        return
    }

    requireJubirAuth(req, res, (err?: unknown) => {
        if (err) return next(err)
        if (!req.jubirUser) return res.status(401).json({ message: 'Unauthorized' })
        void verifySubscription(req, res, next, feature)
    })
}

export function isSubscriptionActive(org: Pick<JubirOrganization, 'subscriptionStatus' | 'subscriptionExpiresAt'>): boolean {
    if (org.subscriptionStatus !== 'ACTIVE') return false
    if (org.subscriptionExpiresAt && org.subscriptionExpiresAt.getTime() < Date.now()) return false
    return true
}
