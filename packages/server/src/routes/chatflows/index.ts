import express from 'express'
import chatflowsController from '../../controllers/chatflows'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE
router.post('/', requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), chatflowsController.saveChatflow)

// READ
router.get('/', requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']), chatflowsController.getAllChatflows)
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update'], ['agentflow', 'delete']),
    chatflowsController.getChatflowById
)
router.get(['/apikey/', '/apikey/:apikey'], chatflowsController.getChatflowByApiKey)

// UPDATE
router.put(['/', '/:id'], requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), chatflowsController.updateChatflow)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), chatflowsController.deleteChatflow)

// WEBHOOK SECRET
router.post('/:id/webhook-secret', requireJubirPermission('agentflow', 'update'), chatflowsController.setWebhookSecret)
router.delete('/:id/webhook-secret', requireJubirPermission('agentflow', 'update'), chatflowsController.clearWebhookSecret)

// CHECK FOR CHANGE
router.get(
    '/has-changed/:id/:lastUpdatedDateTime',
    requireJubirPermission('agentflow', 'update'),
    chatflowsController.checkIfChatflowHasChanged
)

// SCHEDULE
router.get(
    '/:id/schedule/status',
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatflowsController.getScheduleStatus
)
router.patch('/:id/schedule/enabled', requireJubirPermission('agentflow', 'update'), chatflowsController.toggleScheduleEnabled)
router.get(
    '/:id/schedule/trigger-logs',
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatflowsController.getScheduleTriggerLogs
)
router.delete(
    '/:id/schedule/trigger-logs',
    requireAnyJubirPermission(['agentflow', 'update'], ['chat_session', 'delete']),
    chatflowsController.deleteScheduleTriggerLogs
)

export default router
