import express from 'express'
import openaiAssistantsVectorStoreController from '../../controllers/openai-assistants-vector-store'
import { getMulterStorage } from '../../utils'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('agentflow', 'create'), openaiAssistantsVectorStoreController.createAssistantVectorStore)

// READ
router.get('/:id', requireJubirPermission('agentflow', 'read'), openaiAssistantsVectorStoreController.getAssistantVectorStore)

// LIST
router.get('/', requireJubirPermission('agentflow', 'read'), openaiAssistantsVectorStoreController.listAssistantVectorStore)

// UPDATE
router.put(
    ['/', '/:id'],
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    openaiAssistantsVectorStoreController.updateAssistantVectorStore
)

// DELETE
router.delete(
    ['/', '/:id'],
    requireJubirPermission('agentflow', 'delete'),
    openaiAssistantsVectorStoreController.deleteAssistantVectorStore
)

// UPLOAD FILES — permission check must precede multer to reject unauthorized requests before file parsing
router.post(
    '/:id',
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    getMulterStorage().array('files'),
    openaiAssistantsVectorStoreController.uploadFilesToAssistantVectorStore
)

// DELETE FILES
router.patch(
    ['/', '/:id'],
    requireJubirPermission('agentflow', 'update'),
    openaiAssistantsVectorStoreController.deleteFilesFromAssistantVectorStore
)

export default router
