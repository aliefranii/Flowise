import express from 'express'
import nodesRouter from '../../controllers/nodes'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE

// READ
router.post('/', requireAnyJubirPermission(['agentflow', 'create'], ['agentflow', 'update']), nodesRouter.executeCustomFunction)

// UPDATE

// DELETE

export default router
