import client from './client'

const getConfig = () => client.get('/jubiragent/config')
const getDocuments = () => client.get('/jubiragent/documents')

export default {
    getConfig,
    getDocuments
}
