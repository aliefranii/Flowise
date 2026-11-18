import express from 'express'
import openaiAssistantsController from '../../controllers/openai-assistants'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE

// READ
router.get('/', requireJubirPermission('agentflow', 'read'), openaiAssistantsController.getAllOpenaiAssistants)
router.get(['/', '/:id'], requireJubirPermission('agentflow', 'read'), openaiAssistantsController.getSingleOpenaiAssistant)

// UPDATE

// DELETE

export default router
