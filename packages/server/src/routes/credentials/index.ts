import express from 'express'
import credentialsController from '../../controllers/credentials'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
const router = express.Router()

// CREATE
router.post('/', requireJubirPermission('credential', 'create'), credentialsController.createCredential)

// READ
router.get('/', requireJubirPermission('credential', 'read'), credentialsController.getAllCredentials)
router.get(
    ['/', '/:id'],
    requireAnyJubirPermission(['credential', 'create'], ['credential', 'update']),
    credentialsController.getCredentialById
)

// REVEAL
router.get(
    '/:id/reveal',
    requireAnyJubirPermission(['credential', 'create'], ['credential', 'update']),
    credentialsController.revealCredentialById
)

// UPDATE
router.put(
    ['/', '/:id'],
    requireAnyJubirPermission(['credential', 'create'], ['credential', 'update']),
    credentialsController.updateCredential
)

// DELETE
router.delete(['/', '/:id'], requireJubirPermission('credential', 'delete'), credentialsController.deleteCredentials)

export default router
