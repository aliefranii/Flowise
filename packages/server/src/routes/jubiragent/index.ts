import express from 'express'
import jubiragentController from '../../controllers/jubiragent'

const router = express.Router()

// GET
router.get('/config', jubiragentController.getConfig)
router.get('/documents', jubiragentController.getAgentDocument)

export default router
