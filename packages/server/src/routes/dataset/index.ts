import express from 'express'
import datasetController from '../../controllers/dataset'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// get all datasets
router.get('/', requireJubirPermission('agentflow', 'read'), datasetController.getAllDatasets)
// get new dataset
router.get(['/set', '/set/:id'], requireJubirPermission('agentflow', 'read'), datasetController.getDataset)
// Create new dataset
router.post(['/set', '/set/:id'], requireJubirPermission('agentflow', 'create'), datasetController.createDataset)
// Update dataset
router.put(
    ['/set', '/set/:id'],
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    datasetController.updateDataset
)
// Delete dataset via id
router.delete(['/set', '/set/:id'], requireJubirPermission('agentflow', 'delete'), datasetController.deleteDataset)

// Create new row in a given dataset
router.post(['/rows', '/rows/:id'], requireJubirPermission('agentflow', 'create'), datasetController.addDatasetRow)
// Update row for a dataset
router.put(
    ['/rows', '/rows/:id'],
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    datasetController.updateDatasetRow
)
// Delete dataset row via id
router.delete(['/rows', '/rows/:id'], requireJubirPermission('agentflow', 'delete'), datasetController.deleteDatasetRow)
// PATCH delete by ids
router.patch('/rows', requireJubirPermission('agentflow', 'delete'), datasetController.patchDeleteRows)

// Update row for a dataset
router.post(
    ['/reorder', '/reorder'],
    requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']),
    datasetController.reorderDatasetRow
)

export default router
