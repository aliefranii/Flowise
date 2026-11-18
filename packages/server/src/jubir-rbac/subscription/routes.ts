import express from 'express'
import { createCheckoutSession, getSubscription, stripeWebhook } from './subscription.controller'
import { requireJubirScope } from '../middlewares/jubirScope'

const router = express.Router()

router.get('/', requireJubirScope('subscription', 'read'), getSubscription)
router.post('/checkout', requireJubirScope('subscription', 'create'), createCheckoutSession)
router.post('/webhook', express.raw({ type: 'application/json' }), stripeWebhook)

export default router
