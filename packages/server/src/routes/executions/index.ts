import express from 'express'
import executionController from '../../controllers/executions'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// READ
router.get('/', requireJubirPermission('chat_session', 'read'), executionController.getAllExecutions)
router.get(['/', '/:id'], requireJubirPermission('chat_session', 'read'), executionController.getExecutionById)

// PUT
router.put(['/', '/:id'], requireJubirPermission('agentflow', 'update'), executionController.updateExecution)

// DELETE - single execution or multiple executions
router.delete('/:id', requireJubirPermission('chat_session', 'delete'), executionController.deleteExecutions)
router.delete('/', requireJubirPermission('chat_session', 'delete'), executionController.deleteExecutions)

export default router
