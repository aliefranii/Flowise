import { removeFilesFromStorage } from 'flowise-components'
import { StatusCodes } from 'http-status-codes'
import { DeleteResult, FindOptionsWhere, In } from 'typeorm'
import { ChatMessage } from '../../database/entities/ChatMessage'
import { ChatMessageFeedback } from '../../database/entities/ChatMessageFeedback'
import { ChatFlow } from '../../database/entities/ChatFlow'
import { InternalFlowiseError } from '../../errors/internalFlowiseError'
import { getErrorMessage } from '../../errors/utils'
import { ChatMessageRatingType, ChatType, IChatMessage, MODE } from '../../Interface'
import { UsageCacheManager } from '../../UsageCacheManager'
import { utilAddChatMessage } from '../../utils/addChatMesage'
import { utilGetChatMessage } from '../../utils/getChatMessage'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'
import { updateStorageUsage } from '../../utils/quotaUsage'

// Add chatmessages for chatflowid
const createChatMessage = async (chatMessage: Partial<IChatMessage>) => {
    try {
        const dbResponse = await utilAddChatMessage(chatMessage)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.createChatMessage - ${getErrorMessage(error)}`
        )
    }
}

// Get all chatmessages from chatflowid
const getAllChatMessages = async (
    chatflowId: string,
    chatTypes: ChatType[] | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean,
    feedbackTypes?: ChatMessageRatingType[],
    activeWorkspaceId?: string,
    page?: number,
    pageSize?: number
): Promise<ChatMessage[]> => {
    try {
        const dbResponse = await utilGetChatMessage({
            chatflowid: chatflowId,
            chatTypes,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypes,
            activeWorkspaceId,
            page,
            pageSize
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.getAllChatMessages - ${getErrorMessage(error)}`
        )
    }
}

// Get internal chatmessages from chatflowid
const getAllInternalChatMessages = async (
    chatflowId: string,
    chatTypes: ChatType[] | undefined,
    sortOrder: string = 'ASC',
    chatId?: string,
    memoryType?: string,
    sessionId?: string,
    startDate?: string,
    endDate?: string,
    messageId?: string,
    feedback?: boolean,
    feedbackTypes?: ChatMessageRatingType[],
    activeWorkspaceId?: string
): Promise<ChatMessage[]> => {
    try {
        const dbResponse = await utilGetChatMessage({
            chatflowid: chatflowId,
            chatTypes,
            sortOrder,
            chatId,
            memoryType,
            sessionId,
            startDate,
            endDate,
            messageId,
            feedback,
            feedbackTypes,
            activeWorkspaceId
        })
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.getAllInternalChatMessages - ${getErrorMessage(error)}`
        )
    }
}

export interface IChatSessionSummary {
    chatId: string
    title: string
    createdDate: Date
    updatedDate: Date
}

const getInternalChatSessions = async (chatflowId: string, activeWorkspaceId?: string): Promise<IChatSessionSummary[]> => {
    try {
        if (!activeWorkspaceId) throw new Error('Unauthorized access')
        const appServer = getRunningExpressApp()

        const chatflow = await appServer.AppDataSource.getRepository(ChatFlow).findOneBy({ id: chatflowId, workspaceId: activeWorkspaceId })
        if (!chatflow) throw new Error('Unauthorized access')

        const repository = appServer.AppDataSource.getRepository(ChatMessage)

        // ponytail: aggregates in DB, title resolution in JS. Two queries keep it portable across sqlite/mysql/postgres. Upgrade to a single paginated query if agents accumulate thousands of sessions.
        const rows: Array<{ chatId: string; minDate: Date | string; maxDate: Date | string }> = await repository
            .createQueryBuilder('chat_message')
            .select('chat_message.chatId', 'chatId')
            .addSelect('MIN(chat_message.createdDate)', 'minDate')
            .addSelect('MAX(chat_message.createdDate)', 'maxDate')
            .where('chat_message.chatflowid = :chatflowid', { chatflowid: chatflowId })
            .andWhere('chat_message.chatType = :chatType', { chatType: ChatType.INTERNAL })
            .groupBy('chat_message.chatId')
            .orderBy('maxDate', 'DESC')
            .getRawMany()

        if (rows.length === 0) return []

        const chatIds = rows.map((row) => row.chatId)
        const firstUserMessages = await repository
            .createQueryBuilder('chat_message')
            .select('chat_message.chatId', 'chatId')
            .addSelect('chat_message.content', 'content')
            .where('chat_message.chatflowid = :chatflowid', { chatflowid: chatflowId })
            .andWhere('chat_message.chatType = :chatType', { chatType: ChatType.INTERNAL })
            .andWhere('chat_message.role = :role', { role: 'userMessage' })
            .andWhere('chat_message.chatId IN (:...chatIds)', { chatIds })
            .orderBy('chat_message.createdDate', 'ASC')
            .getRawMany()

        const titleByChatId = new Map<string, string>()
        for (const row of firstUserMessages) {
            if (!titleByChatId.has(row.chatId)) {
                titleByChatId.set(row.chatId, (row.content ?? '').replace(/\s+/g, ' ').trim())
            }
        }

        return rows.map((row) => {
            const title = titleByChatId.get(row.chatId) ?? ''
            return {
                chatId: row.chatId,
                title: title.length > 60 ? `${title.slice(0, 60)}…` : title || 'Sesi tanpa judul',
                createdDate: new Date(row.minDate),
                updatedDate: new Date(row.maxDate)
            }
        })
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.getInternalChatSessions - ${getErrorMessage(error)}`
        )
    }
}

const removeAllChatMessages = async (
    chatId: string,
    chatflowid: string,
    deleteOptions: FindOptionsWhere<ChatMessage>,
    orgId: string,
    workspaceId: string,
    usageCacheManager: UsageCacheManager
): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()

        // Remove all related feedback records
        const feedbackDeleteOptions: FindOptionsWhere<ChatMessageFeedback> = { chatId }
        await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete(feedbackDeleteOptions)

        // Delete all uploads corresponding to this chatflow/chatId
        if (chatId) {
            try {
                const { totalSize } = await removeFilesFromStorage(orgId, chatflowid, chatId)
                await updateStorageUsage(orgId, workspaceId, totalSize, usageCacheManager)
            } catch (e) {
                // Don't throw error if file deletion fails because file might not exist
            }
        }
        const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).delete(deleteOptions)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.removeAllChatMessages - ${getErrorMessage(error)}`
        )
    }
}

const removeChatMessagesByMessageIds = async (
    chatflowid: string,
    chatIdMap: Map<string, ChatMessage[]>,
    messageIds: string[],
    orgId: string,
    workspaceId: string,
    usageCacheManager: UsageCacheManager
): Promise<DeleteResult> => {
    try {
        const appServer = getRunningExpressApp()

        // Get messages before deletion to check for executionId
        const messages = await appServer.AppDataSource.getRepository(ChatMessage).findByIds(messageIds)
        const executionIds = messages.map((msg) => msg.executionId).filter(Boolean)

        for (const [composite_key] of chatIdMap) {
            const [chatId] = composite_key.split('_')

            // Remove all related feedback records
            const feedbackDeleteOptions: FindOptionsWhere<ChatMessageFeedback> = { chatId }
            await appServer.AppDataSource.getRepository(ChatMessageFeedback).delete(feedbackDeleteOptions)

            // Delete all uploads corresponding to this chatflow/chatId
            try {
                const { totalSize } = await removeFilesFromStorage(orgId, chatflowid, chatId)
                await updateStorageUsage(orgId, workspaceId, totalSize, usageCacheManager)
            } catch (e) {
                // Don't throw error if file deletion fails because file might not exist
            }
        }

        // Delete executions if they exist
        if (executionIds.length > 0) {
            await appServer.AppDataSource.getRepository('Execution').delete(executionIds)
        }

        const dbResponse = await appServer.AppDataSource.getRepository(ChatMessage).delete(messageIds)
        return dbResponse
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.removeChatMessagesByMessageIds - ${getErrorMessage(error)}`
        )
    }
}

const abortChatMessage = async (chatId: string, chatflowid: string) => {
    try {
        const appServer = getRunningExpressApp()
        const id = `${chatflowid}_${chatId}`

        if (process.env.MODE === MODE.QUEUE) {
            await appServer.queueManager.getPredictionQueueEventsProducer().publishEvent({
                eventName: 'abort',
                id
            })
        } else {
            appServer.abortControllerPool.abort(id)
        }
    } catch (error) {
        throw new InternalFlowiseError(
            StatusCodes.INTERNAL_SERVER_ERROR,
            `Error: chatMessagesService.abortChatMessage - ${getErrorMessage(error)}`
        )
    }
}

async function getMessagesByChatflowIds(chatflowIds: string[]): Promise<ChatMessage[]> {
    const appServer = getRunningExpressApp()
    return await appServer.AppDataSource.getRepository(ChatMessage).find({ where: { chatflowid: In(chatflowIds) } })
}

async function getMessagesFeedbackByChatflowIds(chatflowIds: string[]): Promise<ChatMessageFeedback[]> {
    const appServer = getRunningExpressApp()
    return await appServer.AppDataSource.getRepository(ChatMessageFeedback).find({ where: { chatflowid: In(chatflowIds) } })
}

export default {
    createChatMessage,
    getAllChatMessages,
    getAllInternalChatMessages,
    getInternalChatSessions,
    removeAllChatMessages,
    removeChatMessagesByMessageIds,
    abortChatMessage,
    getMessagesByChatflowIds,
    getMessagesFeedbackByChatflowIds
}
