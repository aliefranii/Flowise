import express from 'express'
import textToSpeechController from '../../controllers/text-to-speech'
import { requireJubirPermission } from '../../jubir-rbac/middlewares/permission'

const router = express.Router()

router.post('/generate', textToSpeechController.generateTextToSpeech)

router.post('/abort', textToSpeechController.abortTextToSpeech)

router.get('/voices', requireJubirPermission('agentflow', 'update'), textToSpeechController.getVoices)

export default router
