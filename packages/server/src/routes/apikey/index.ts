import express from 'express'
import apikeyController from '../../controllers/apikey'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('credential', 'create'), apikeyController.createApiKey)

// READ
router.get('/', requireJubirPermission('workspace', 'read'), apikeyController.getAllApiKeys)

// UPDATE
router.put(['/', '/:id'], requireAnyJubirPermission(['credential', 'create'], ['credential', 'update']), apikeyController.updateApiKey)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('credential', 'delete'), apikeyController.deleteApiKey)

export default router
