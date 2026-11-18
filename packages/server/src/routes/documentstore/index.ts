import express from 'express'
import { requireJubirPermission, requireAnyJubirPermission } from '../../jubir-rbac/middlewares/permission'
import documentStoreController from '../../controllers/documentstore'
import { getMulterStorage } from '../../utils'

const router = express.Router()

router.post(['/upsert/', '/upsert/:id'], getMulterStorage().array('files'), documentStoreController.upsertDocStoreMiddleware)

router.post(['/refresh/', '/refresh/:id'], documentStoreController.refreshDocStoreMiddleware)

/** Document Store Routes */
// Create document store
router.post('/store', requireJubirPermission('document_store', 'create'), documentStoreController.createDocumentStore)
// List all stores
router.get('/store', requireJubirPermission('document_store', 'read'), documentStoreController.getAllDocumentStores)
// Get specific store
router.get(
    '/store/:id',
    requireAnyJubirPermission(['document_store', 'read'], ['document_store', 'update'], ['document_store', 'delete']),
    documentStoreController.getDocumentStoreById
)
// Update documentStore
router.put(
    '/store/:id',
    requireAnyJubirPermission(['document_store', 'create'], ['document_store', 'update']),
    documentStoreController.updateDocumentStore
)
// Delete documentStore
router.delete('/store/:id', requireJubirPermission('document_store', 'delete'), documentStoreController.deleteDocumentStore)
// Get document store configs
router.get('/store-configs/:id/:loaderId', requireJubirPermission('document_store', 'read'), documentStoreController.getDocStoreConfigs)

/** Component Nodes = Document Store - Loaders */
// Get all loaders
router.get('/components/loaders', requireJubirPermission('document_store', 'update'), documentStoreController.getDocumentLoaders)

// delete loader from document store
router.delete(
    '/loader/:id/:loaderId',
    requireJubirPermission('document_store', 'update'),
    documentStoreController.deleteLoaderFromDocumentStore
)
// chunking preview
router.post('/loader/preview', requireJubirPermission('document_store', 'execute'), documentStoreController.previewFileChunks)
// saving process
router.post('/loader/save', requireJubirPermission('document_store', 'execute'), documentStoreController.saveProcessingLoader)
// chunking process
router.post('/loader/process/:loaderId', requireJubirPermission('document_store', 'execute'), documentStoreController.processLoader)

/** Document Store - Loaders - Chunks */
// delete specific file chunk from the store
router.delete(
    '/chunks/:storeId/:loaderId/:chunkId',
    requireAnyJubirPermission(['document_store', 'update'], ['document_store', 'delete']),
    documentStoreController.deleteDocumentStoreFileChunk
)
// edit specific file chunk from the store
router.put(
    '/chunks/:storeId/:loaderId/:chunkId',
    requireJubirPermission('document_store', 'update'),
    documentStoreController.editDocumentStoreFileChunk
)
// Get all file chunks from the store
router.get(
    '/chunks/:storeId/:fileId/:pageNo',
    requireJubirPermission('document_store', 'read'),
    documentStoreController.getDocumentStoreFileChunks
)

// add chunks to the selected vector store
router.post('/vectorstore/insert', requireJubirPermission('document_store', 'update'), documentStoreController.insertIntoVectorStore)
// save the selected vector store
router.post('/vectorstore/save', requireJubirPermission('document_store', 'update'), documentStoreController.saveVectorStoreConfig)
// delete data from the selected vector store
router.delete(
    '/vectorstore/:storeId',
    requireJubirPermission('document_store', 'update'),
    documentStoreController.deleteVectorStoreFromStore
)
// query the vector store
router.post('/vectorstore/query', requireJubirPermission('document_store', 'read'), documentStoreController.queryVectorStore)
// Get all embedding providers
router.get('/components/embeddings', requireJubirPermission('document_store', 'update'), documentStoreController.getEmbeddingProviders)
// Get all vector store providers
router.get('/components/vectorstore', requireJubirPermission('document_store', 'update'), documentStoreController.getVectorStoreProviders)
// Get all Record Manager providers
router.get(
    '/components/recordmanager',
    requireJubirPermission('document_store', 'update'),
    documentStoreController.getRecordManagerProviders
)

// update the selected vector store from the playground
router.post('/vectorstore/update', requireJubirPermission('document_store', 'update'), documentStoreController.updateVectorStoreConfigOnly)

// generate docstore tool description
router.post('/generate-tool-desc/:id', requireJubirPermission('document_store', 'read'), documentStoreController.generateDocStoreToolDesc)

export default router
