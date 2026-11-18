import express from 'express'
import assistantsController from '../../controllers/assistants'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('agentflow', 'create'), assistantsController.createAssistant)

// READ
router.get('/', requireJubirPermission('agentflow', 'read'), assistantsController.getAllAssistants)
router.get(['/', '/:id'], requireJubirPermission('agentflow', 'read'), assistantsController.getAssistantById)

// UPDATE
router.put(['/', '/:id'], requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), assistantsController.updateAssistant)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), assistantsController.deleteAssistant)

router.get('/components/chatmodels', assistantsController.getChatModels)
router.get('/components/docstores', assistantsController.getDocumentStores)
router.get('/components/tools', assistantsController.getTools)

// Generate Assistant Instruction
router.post('/generate/instruction', assistantsController.generateAssistantInstruction)

export default router
