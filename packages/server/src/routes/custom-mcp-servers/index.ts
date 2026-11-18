import express from 'express'
import customMcpServersController from '../../controllers/custom-mcp-servers'
import { requireAnyJubirPermission, requireJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('agentflow', 'create'), customMcpServersController.createCustomMcpServer)

// READ
router.get('/', requireJubirPermission('agentflow', 'read'), customMcpServersController.getAllCustomMcpServers)
router.get('/:id', requireJubirPermission('agentflow', 'read'), customMcpServersController.getCustomMcpServerById)
router.get('/:id/tools', requireJubirPermission('agentflow', 'read'), customMcpServersController.getDiscoveredTools)

// UPDATE
router.put(
    '/:id',
    requireAnyJubirPermission(['agentflow', 'update'], ['agentflow', 'create']),
    customMcpServersController.updateCustomMcpServer
)

// AUTHORIZE (connect to server & discover tools)
router.post(
    '/:id/authorize',
    requireAnyJubirPermission(['agentflow', 'update'], ['agentflow', 'create']),
    customMcpServersController.authorizeCustomMcpServer
)

// DELETE
router.delete('/:id', requireJubirPermission('agentflow', 'delete'), customMcpServersController.deleteCustomMcpServer)

export default router
