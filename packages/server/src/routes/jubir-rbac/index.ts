import express from 'express'
import { loginJubir, logoutJubir, refreshJubir, registerJubir } from '../../jubir-rbac/auth/auth.controller'
import {
    createOrganization,
    createRegion,
    createStore,
    deleteOrganization,
    deleteRegion,
    deleteStore,
    getOrganizations,
    getRegions,
    getStores,
    updateOrganization,
    updateRegion,
    updateStore
} from '../../jubir-rbac/controllers/jubirHierarchy.controller'
import { requireJubirScope } from '../../jubir-rbac/middlewares/jubirScope'
import subscriptionRouter from '../../jubir-rbac/subscription/routes'

const router = express.Router()

// AUTH
router.post('/auth/register', registerJubir)
router.post('/auth/login', loginJubir)
router.post('/auth/refresh', refreshJubir)
router.post('/auth/logout', logoutJubir)

// REGION
router.get('/regions', requireJubirScope('region', 'read'), getRegions)
router.post('/regions', requireJubirScope('region', 'create'), createRegion)
router.put('/regions/:id', requireJubirScope('region', 'update'), updateRegion)
router.delete('/regions/:id', requireJubirScope('region', 'delete'), deleteRegion)

// ORGANIZATION
router.get('/organizations', requireJubirScope('organization', 'read'), getOrganizations)
router.post('/organizations', requireJubirScope('organization', 'create'), createOrganization)
router.put('/organizations/:id', requireJubirScope('organization', 'update'), updateOrganization)
router.delete('/organizations/:id', requireJubirScope('organization', 'delete'), deleteOrganization)

// STORE
router.get('/stores', requireJubirScope('store', 'read'), getStores)
router.post('/stores', requireJubirScope('store', 'create'), createStore)
router.put('/stores/:id', requireJubirScope('store', 'update'), updateStore)
router.delete('/stores/:id', requireJubirScope('store', 'delete'), deleteStore)

// SUBSCRIPTION
router.use('/subscription', subscriptionRouter)

export default router
