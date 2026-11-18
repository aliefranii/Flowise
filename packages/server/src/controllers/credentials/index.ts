import { Request, Response, NextFunction } from 'express'
import credentialsService from '../../services/credentials'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { StatusCodes } from 'http-status-codes'
import { JubirResourceType } from '../../jubir-rbac/entities'
import { allowedResourceIds, assertJubirResourceAccess } from '../../jubir-rbac/middlewares/jubirScope'
import { deleteResourceMapping, ensureResourceMapping } from '../../jubir-rbac/utils/resourceMapping'
import { GeneralErrorMessage } from '../../utils/constants'

const createCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.createCredential - body not provided!`
            )
        }
        const workspaceId = req.jubirUser?.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.createCredential - workspace ${workspaceId} not found!`
            )
        }
        const body = req.body
        body.workspaceId = workspaceId
        const apiResponse = await credentialsService.createCredential(body)
        await ensureResourceMapping({
            resourceId: apiResponse.id,
            resourceType: JubirResourceType.CREDENTIAL,
            regionId: req.jubirUser?.regionId ?? null,
            organizationId: req.jubirUser?.organizationId ?? null,
            workspaceId,
            storeId: req.jubirContext?.workspace?.storeId ?? null
        })
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const deleteCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.deleteCredentials - id not provided!`
            )
        }
        const workspaceId = req.jubirUser?.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.deleteCredentials - workspace ${workspaceId} not found!`
            )
        }
        await assertJubirResourceAccess(JubirResourceType.CREDENTIAL, req.params.id, req.jubirUser)
        const apiResponse = await credentialsService.deleteCredentials(req.params.id, workspaceId)
        await deleteResourceMapping(JubirResourceType.CREDENTIAL, req.params.id)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getAllCredentials = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.jubirUser) {
            throw new InternalFlowiseError(StatusCodes.UNAUTHORIZED, GeneralErrorMessage.UNAUTHORIZED)
        }
        const workspaceId = req.jubirUser.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.getAllCredentials - workspace ${workspaceId} not found!`
            )
        }
        const allowedIds = await allowedResourceIds(JubirResourceType.CREDENTIAL, req.jubirUser)
        const apiResponse = await credentialsService.getAllCredentials(req.query.credentialName, workspaceId, allowedIds)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const getCredentialById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.getCredentialById - id not provided!`
            )
        }
        const workspaceId = req.jubirUser?.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.getCredentialById - workspace ${workspaceId} not found!`
            )
        }
        await assertJubirResourceAccess(JubirResourceType.CREDENTIAL, req.params.id, req.jubirUser)
        const apiResponse = await credentialsService.getCredentialById(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const revealCredentialById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.revealCredentialById - id not provided!`
            )
        }
        const workspaceId = req.jubirUser?.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.revealCredentialById - workspace ${workspaceId} not found!`
            )
        }
        await assertJubirResourceAccess(JubirResourceType.CREDENTIAL, req.params.id, req.jubirUser)
        const apiResponse = await credentialsService.revealCredentialById(req.params.id, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

const updateCredential = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (typeof req.params === 'undefined' || !req.params.id) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.updateCredential - id not provided!`
            )
        }
        if (!req.body) {
            throw new InternalFlowiseError(
                StatusCodes.PRECONDITION_FAILED,
                `Error: credentialsController.updateCredential - body not provided!`
            )
        }
        const workspaceId = req.jubirUser?.workspaceId
        if (!workspaceId) {
            throw new InternalFlowiseError(
                StatusCodes.NOT_FOUND,
                `Error: credentialsController.updateCredential - workspace ${workspaceId} not found!`
            )
        }
        await assertJubirResourceAccess(JubirResourceType.CREDENTIAL, req.params.id, req.jubirUser)
        const apiResponse = await credentialsService.updateCredential(req.params.id, req.body, workspaceId)
        return res.json(apiResponse)
    } catch (error) {
        next(error)
    }
}

export default {
    createCredential,
    deleteCredentials,
    getAllCredentials,
    getCredentialById,
    revealCredentialById,
    updateCredential
}
