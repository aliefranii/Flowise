import express from 'express'
import evaluationsController from '../../controllers/evaluations'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

router.get('/', requireJubirPermission('agentflow', 'read'), evaluationsController.getAllEvaluations)
router.get('/:id', requireJubirPermission('agentflow', 'read'), evaluationsController.getEvaluation)
router.delete('/:id', requireJubirPermission('agentflow', 'delete'), evaluationsController.deleteEvaluation)
router.post('/', requireJubirPermission('agentflow', 'create'), evaluationsController.createEvaluation)
router.get('/is-outdated/:id', evaluationsController.isOutdated)
router.post('/run-again/:id', requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'execute']), evaluationsController.runAgain)
router.get('/versions/:id', requireJubirPermission('agentflow', 'read'), evaluationsController.getVersions)
router.patch('/', requireJubirPermission('agentflow', 'delete'), evaluationsController.patchDeleteEvaluations)
export default router
