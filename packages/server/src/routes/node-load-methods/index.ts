import express from 'express'
import nodesRouter from '../../controllers/nodes'
import { requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

router.post(
    ['/', '/:name'],
    requireAnyJubirPermission(
        ['agentflow', 'read'],
        ['agentflow', 'create'],
        ['agentflow', 'update'],
        ['agentflow', 'delete'],
        ['document_store', 'read'],
        ['document_store', 'create'],
        ['document_store', 'update']
    ),
    nodesRouter.getSingleNodeAsyncOptions
)

export default router
