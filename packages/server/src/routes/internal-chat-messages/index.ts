import express from 'express'
import chatMessagesController from '../../controllers/chat-messages'
import { checkAnyPermission } from '../../enterprise/rbac/PermissionCheck'
const router = express.Router()

// CREATE

// READ
router.get(
    '/:id/sessions',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatMessagesController.getInternalChatSessions
)
router.get(
    ['/', '/:id'],
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatMessagesController.getAllInternalChatMessages
)

// DELETE
router.delete(
    '/:id/sessions/:chatId',
    checkAnyPermission('chatflows:view,chatflows:update,agentflows:view,agentflows:update'),
    chatMessagesController.removeInternalChatSession
)

export default router
