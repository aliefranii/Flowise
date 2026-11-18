import express from 'express'
import toolsController from '../../controllers/tools'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('agentflow', 'create'), toolsController.createTool)

// READ
router.get('/', requireJubirPermission('agentflow', 'read'), toolsController.getAllTools)
router.get(['/', '/:id'], requireJubirPermission('agentflow', 'read'), toolsController.getToolById)

// UPDATE
router.put(['/', '/:id'], requireAnyJubirPermission(['agentflow', 'update'], ['agentflow', 'create']), toolsController.updateTool)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), toolsController.deleteTool)

export default router
