import { Request, Response, NextFunction } from 'express'

const getConfig = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.json({ chatflowId: process.env.JUBIRAGENT_CHATFLOW_ID || '' })
    } catch (error) {
        next(error)
    }
}

const getAgentDocument = async (req: Request, res: Response, next: NextFunction) => {
    try {
        return res.json({ documents: ['Dokumen A', 'Dokumen B', 'Dokumen C'] })
    } catch (error) {
        next(error)
    }
}

export default {
    getConfig,
    getAgentDocument
}
