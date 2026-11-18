import express from 'express'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
import upsertHistoryController from '../../controllers/upsert-history'
const router = express.Router()

// CREATE

// READ
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'read'], ['document_store', 'read']),
    upsertHistoryController.getAllUpsertHistory
)

// PATCH
router.patch(
    '/',
    requireAnyJubirPermission(['agentflow', 'update'], ['document_store', 'update']),
    upsertHistoryController.patchDeleteUpsertHistory
)

// DELETE

export default router
