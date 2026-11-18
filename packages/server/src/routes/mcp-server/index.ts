import express from 'express'
import mcpServerController from '../../controllers/mcp-server'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// GET    /api/v1/mcp-server/:id     → get current config
router.get('/:id', requireJubirPermission('agentflow', 'update'), mcpServerController.getMcpServerConfig)

// POST   /api/v1/mcp-server/:id       → enable (generates token)
router.post('/:id', requireJubirPermission('agentflow', 'update'), mcpServerController.createMcpServerConfig)

// PUT    /api/v1/mcp-server/:id         → update description/toolName/status
router.put('/:id', requireJubirPermission('agentflow', 'update'), mcpServerController.updateMcpServerConfig)

// DELETE /api/v1/mcp-server/:id         → disable (set enabled=false)
router.delete('/:id', requireJubirPermission('agentflow', 'update'), mcpServerController.deleteMcpServerConfig)

// POST   /api/v1/mcp-server/:id/refresh → rotate token
router.post('/:id/refresh', requireJubirPermission('agentflow', 'update'), mcpServerController.refreshMcpToken)

export default router
