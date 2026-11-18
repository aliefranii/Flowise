import express from 'express'
import chatMessagesController from '../../controllers/chat-messages'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE

// READ
router.get(
    '/:id/sessions',
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatMessagesController.getInternalChatSessions
)
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatMessagesController.getAllInternalChatMessages
)

// DELETE
router.delete(
    '/:id/sessions/:chatId',
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatMessagesController.removeInternalChatSession
)

export default router
