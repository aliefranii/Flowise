import express from 'express'
import webhookListenerController from '../../controllers/webhook-listener'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

const requireFlowEdit = requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update'])

router.post('/:id/register', requireFlowEdit, webhookListenerController.registerListener)
router.get('/:id/stream/:listenerId', requireFlowEdit, webhookListenerController.streamListener)
router.delete('/:id/listener/:listenerId', requireFlowEdit, webhookListenerController.unregisterListener)

export default router
