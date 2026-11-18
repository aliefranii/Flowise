import express from 'express'
import evaluatorsController from '../../controllers/evaluators'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// get all datasets
router.get('/', requireJubirPermission('agentflow', 'read'), evaluatorsController.getAllEvaluators)
// get new dataset
router.get(['/', '/:id'], requireJubirPermission('agentflow', 'read'), evaluatorsController.getEvaluator)
// Create new dataset
router.post(['/', '/:id'], requireJubirPermission('agentflow', 'create'), evaluatorsController.createEvaluator)
// Update dataset
router.put(['/', '/:id'], requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), evaluatorsController.updateEvaluator)
// Delete dataset via id
router.delete(['/', '/:id'], requireJubirPermission('agentflow', 'delete'), evaluatorsController.deleteEvaluator)

export default router
