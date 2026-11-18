import express from 'express'
import logController from '../../controllers/log'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// READ
router.get('/', requireJubirPermission('workspace', 'update'), logController.getLogs)

export default router
