import client from './client'

const getInternalChatmessageFromChatflow = (id, params = {}) =>
    client.get(`/internal-chatmessage/${id}`, { params: { feedback: true, ...params } })
const getInternalChatSessions = (id) => client.get(`/internal-chatmessage/${id}/sessions`)
const deleteInternalChatSession = (id, chatId) => client.delete(`/internal-chatmessage/${id}/sessions/${chatId}`)
const getAllChatmessageFromChatflow = (id, params = {}) =>
    client.get(`/chatmessage/${id}`, { params: { order: 'DESC', feedback: true, ...params } })
const getChatmessageFromPK = (id, params = {}) => client.get(`/chatmessage/${id}`, { params: { order: 'ASC', feedback: true, ...params } })
const deleteChatmessage = (id, params = {}) => client.delete(`/chatmessage/${id}`, { params: { ...params } })
const abortMessage = (chatflowid, chatid) => client.put(`/chatmessage/abort/${chatflowid}/${chatid}`)

export default {
    getInternalChatmessageFromChatflow,
    getInternalChatSessions,
    deleteInternalChatSession,
    getAllChatmessageFromChatflow,
    getChatmessageFromPK,
    deleteChatmessage,
    abortMessage
}
