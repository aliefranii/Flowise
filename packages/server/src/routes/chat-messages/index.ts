import express from 'express'
import chatMessageController from '../../controllers/chat-messages'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE
// NOTE: Unused route
// router.post(['/', '/:id'], chatMessageController.createChatMessage)

// READ
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'update']),
    chatMessageController.getAllChatMessages
)

// UPDATE
router.put(
    ['/abort/', '/abort/:chatflowid/:chatid'],
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    chatMessageController.abortChatMessage
)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), chatMessageController.removeAllChatMessages)

export default router
