import express from 'express'
import openaiRealTimeController from '../../controllers/openai-realtime'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// GET
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'create'], ['agentflow', 'update'], ['agentflow', 'delete']),
    openaiRealTimeController.getAgentTools
)

// EXECUTE
router.post(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['agentflow', 'create'], ['agentflow', 'update'], ['agentflow', 'delete']),
    openaiRealTimeController.executeAgentTool
)

export default router
