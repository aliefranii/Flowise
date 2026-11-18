import express from 'express'
import exportImportController from '../../controllers/export-import'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

router.post('/export', requireJubirPermission('workspace', 'update'), exportImportController.exportData)

router.post('/chatflow-messages', requireJubirPermission('workspace', 'update'), exportImportController.exportChatflowMessages)

router.post('/import', requireJubirPermission('workspace', 'create'), exportImportController.importData)

export default router
