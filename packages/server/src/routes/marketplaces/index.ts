import express from 'express'
import marketplacesController from '../../controllers/marketplaces'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// READ
router.get('/templates', requireJubirPermission('agentflow', 'read'), marketplacesController.getAllTemplates)

router.post('/custom', requireJubirPermission('agentflow', 'create'), marketplacesController.saveCustomTemplate)

// READ
router.get('/custom', requireJubirPermission('agentflow', 'read'), marketplacesController.getAllCustomTemplates)

// DELETE
router.delete(['/', '/custom/:id'], requireJubirPermission('agentflow', 'delete'), marketplacesController.deleteCustomTemplate)

export default router
