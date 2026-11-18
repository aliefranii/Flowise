import { Request, Response } from 'express'
import { login, logout, refresh, register } from './auth.service'

const errorResponse = (res: Response, error: unknown) => {
    const message = error instanceof Error ? error.message : 'Auth gagal'
    return res.status(400).json({ message })
}

export const registerJubir = async (req: Request, res: Response) => {
    try {
        const { name, email, password, organizationName } = req.body
        return res.status(201).json(await register({ name, email, password, organizationName }, req))
    } catch (error) {
        return errorResponse(res, error)
    }
}

export const loginJubir = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body
        return res.json(await login(email, password, req))
    } catch (error) {
        return errorResponse(res, error)
    }
}

export const refreshJubir = async (req: Request, res: Response) => {
    try {
        const token = req.body.refreshToken || req.cookies?.jubirRefreshToken
        return res.json(await refresh(token, req))
    } catch (error) {
        return errorResponse(res, error)
    }
}

export const logoutJubir = async (req: Request, res: Response) => {
    try {
        await logout(req.body.refreshToken || req.cookies?.jubirRefreshToken)
        return res.json({ message: 'Logout berhasil' })
    } catch (error) {
        return errorResponse(res, error)
    }
}
