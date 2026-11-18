import express from 'express'
import variablesController from '../../controllers/variables'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('agentflow', 'create'), variablesController.createVariable)

// READ
router.get('/', requireJubirPermission('agentflow', 'read'), variablesController.getAllVariables)

// UPDATE
router.put(['/', '/:id'], requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), variablesController.updateVariable)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), variablesController.deleteVariable)

export default router
