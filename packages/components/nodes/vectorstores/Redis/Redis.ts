import { randomUUID } from 'crypto'
import { flatten } from 'lodash'
import { createClient, SearchOptions } from 'redis'
import { Embeddings } from '@langchain/core/embeddings'
import { RedisVectorStore, RedisVectorStoreConfig } from '@langchain/redis'
import { Document } from '@langchain/core/documents'
import { ICommonObject, INode, INodeData, INodeOutputsValue, INodeParams, IndexingResult } from '../../../src/Interface'
import { getBaseClasses, getCredentialData, getCredentialParam } from '../../../src/utils'
import { index } from '../../../src/indexing'
import { escapeMetadataChars, escapeSpecialChars, unEscapeSpecialChars } from './utils'

const ADD_BATCH_SIZE = 500
const DELETE_BATCH_SIZE = 500

class Redis_VectorStores implements INode {
    label: string
    name: string
    version: number
    description: string
    type: string
    icon: string
    category: string
    badge: string
    baseClasses: string[]
    inputs: INodeParams[]
    credential: INodeParams
    outputs: INodeOutputsValue[]

    constructor() {
        this.label = 'Redis'
        this.name = 'redis'
        this.version = 2.0
        this.description =
            'Upsert embedded data and perform similarity search upon query using Redis, an open source, in-memory data structure store'
        this.type = 'Redis'
        this.icon = 'redis.svg'
        this.category = 'Vector Stores'
        this.baseClasses = [this.type, 'VectorStoreRetriever', 'BaseRetriever']
        this.credential = {
            label: 'Connect Credential',
            name: 'credential',
            type: 'credential',
            credentialNames: ['redisCacheUrlApi', 'redisCacheApi']
        }
        this.inputs = [
            {
                label: 'Document',
                name: 'document',
                type: 'Document',
                list: true,
                optional: true
            },
            {
                label: 'Embeddings',
                name: 'embeddings',
                type: 'Embeddings'
            },
            {
                label: 'Record Manager',
                name: 'recordManager',
                type: 'RecordManager',
                description: 'Keep track of the record to prevent duplication',
                optional: true
            },
            {
                label: 'Index Name',
                name: 'indexName',
                placeholder: '<VECTOR_INDEX_NAME>',
                type: 'string'
            },
            {
                label: 'Replace Index on Upsert',
                name: 'replaceIndex',
                description: 'Selecting this option will delete the existing index and recreate a new one when upserting',
                default: false,
                type: 'boolean'
            },
            {
                label: 'Content Field',
                name: 'contentKey',
                description: 'Name of the field (column) that contains the actual content',
                type: 'string',
                default: 'content',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Metadata Field',
                name: 'metadataKey',
                description: 'Name of the field (column) that contains the metadata of the document',
                type: 'string',
                default: 'metadata',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Vector Field',
                name: 'vectorKey',
                description: 'Name of the field (column) that contains the vector',
                type: 'string',
                default: 'content_vector',
                additionalParams: true,
                optional: true
            },
            {
                label: 'Top K',
                name: 'topK',
                description: 'Number of top results to fetch. Default to 4',
                placeholder: '4',
                type: 'number',
                additionalParams: true,
                optional: true
            }
        ]
        this.outputs = [
            {
                label: 'Redis Retriever',
                name: 'retriever',
                baseClasses: this.baseClasses
            },
            {
                label: 'Redis Vector Store',
                name: 'vectorStore',
                baseClasses: [this.type, ...getBaseClasses(RedisVectorStore)]
            }
        ]
    }

    //@ts-ignore
    vectorStoreMethods = {
        async upsert(nodeData: INodeData, options: ICommonObject): Promise<Partial<IndexingResult>> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const indexName = nodeData.inputs?.indexName as string
            const contentKey = (nodeData.inputs?.contentKey as string) || 'content'
            const metadataKey = (nodeData.inputs?.metadataKey as string) || 'metadata'
            const vectorKey = (nodeData.inputs?.vectorKey as string) || 'content_vector'
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const replaceIndex = nodeData.inputs?.replaceIndex as boolean
            const recordManager = nodeData.inputs?.recordManager

            const docs = nodeData.inputs?.document as Document[]

            const flattenDocs = docs && docs.length ? flatten(docs) : []
            const finalDocs = []
            for (let i = 0; i < flattenDocs.length; i += 1) {
                if (flattenDocs[i] && flattenDocs[i].pageContent) {
                    const document = new Document(flattenDocs[i])
                    finalDocs.push(document)
                }
            }

            const redisClient = buildRedisClient(credentialData, nodeData)

            try {
                await redisClient.connect()

                const storeConfig: RedisVectorStoreConfig = {
                    redisClient: redisClient as any,
                    indexName,
                    contentKey,
                    metadataKey,
                    vectorKey
                }
                const isIndexExists = await checkIndexExists(redisClient, indexName)
                if (replaceIndex && isIndexExists) {
                    const response = await redisClient.ft.dropIndex(indexName, { DD: true })
                    if (process.env.DEBUG === 'true') {
                        // eslint-disable-next-line no-console
                        console.log(`Redis Vector Store :: Dropping index [${indexName}], Received Response [${response}]`)
                    }
                }

                const vectorStore = new RedisVectorStore(embeddings, storeConfig)
                adaptVectorStore(vectorStore, redisClient)

                if (recordManager) {
                    await recordManager.createSchema()

                    const res = await index({
                        docsSource: finalDocs,
                        recordManager,
                        vectorStore,
                        options: {
                            cleanup: recordManager?.cleanup,
                            sourceIdKey: recordManager?.sourceIdKey ?? 'source',
                            vectorStoreName: indexName
                        }
                    })

                    return res
                } else {
                    if (finalDocs.length > 0) {
                        await vectorStore.addDocuments(finalDocs)
                    }

                    return { numAdded: finalDocs.length, addedDocs: finalDocs }
                }
            } catch (e) {
                throw new Error(e)
            } finally {
                if (redisClient.isOpen) {
                    await redisClient.quit()
                }
            }
        },
        async delete(nodeData: INodeData, ids: string[], options: ICommonObject): Promise<void> {
            const credentialData = await getCredentialData(nodeData.credential ?? '', options)
            const indexName = nodeData.inputs?.indexName as string
            const contentKey = (nodeData.inputs?.contentKey as string) || 'content'
            const metadataKey = (nodeData.inputs?.metadataKey as string) || 'metadata'
            const vectorKey = (nodeData.inputs?.vectorKey as string) || 'content_vector'
            const embeddings = nodeData.inputs?.embeddings as Embeddings
            const recordManager = nodeData.inputs?.recordManager

            const redisClient = buildRedisClient(credentialData, nodeData)

            try {
                await redisClient.connect()

                const storeConfig: RedisVectorStoreConfig = {
                    redisClient: redisClient as any,
                    indexName,
                    contentKey,
                    metadataKey,
                    vectorKey
                }

                const vectorStore = new RedisVectorStore(embeddings, storeConfig)
                adaptVectorStore(vectorStore, redisClient)

                if (recordManager) {
                    const vectorStoreName = indexName
                    await recordManager.createSchema()
                    ;(recordManager as any).namespace = (recordManager as any).namespace + '_' + vectorStoreName
                    const filterKeys: ICommonObject = {}
                    if (options.docId) {
                        filterKeys.docId = options.docId
                    }
                    const keys: string[] = await recordManager.listKeys(filterKeys)

                    if (keys.length > 0) {
                        await vectorStore.delete({ ids: keys })
                        await recordManager.deleteKeys(keys)
                    }
                } else if (ids.length > 0) {
                    await vectorStore.delete({ ids })
                }
            } catch (e) {
                throw new Error(e)
            } finally {
                if (redisClient.isOpen) {
                    await redisClient.quit()
                }
            }
        }
    }

    async init(nodeData: INodeData, _: string, options: ICommonObject): Promise<any> {
        const credentialData = await getCredentialData(nodeData.credential ?? '', options)
        const indexName = nodeData.inputs?.indexName as string
        const contentKey = (nodeData.inputs?.contentKey as string) || 'content'
        const metadataKey = (nodeData.inputs?.metadataKey as string) || 'metadata'
        const vectorKey = (nodeData.inputs?.vectorKey as string) || 'content_vector'
        const embeddings = nodeData.inputs?.embeddings as Embeddings
        const topK = nodeData.inputs?.topK as string
        const k = topK ? parseFloat(topK) : 4
        const output = nodeData.outputs?.output as string

        const redisClient = buildRedisClient(credentialData, nodeData)

        const storeConfig: RedisVectorStoreConfig = {
            redisClient: redisClient as any,
            indexName,
            contentKey,
            metadataKey,
            vectorKey
        }

        const vectorStore = new RedisVectorStore(embeddings, storeConfig)

        // Avoid Illegal invocation error and create an isolated connection per search call
        vectorStore.similaritySearchVectorWithScore = async (query: number[], k: number, filter?: any) => {
            const queryClient = buildRedisClient(credentialData, nodeData)
            await queryClient.connect()
            try {
                const results = await similaritySearchVectorWithScore(
                    query,
                    k,
                    indexName,
                    metadataKey,
                    vectorKey,
                    contentKey,
                    queryClient,
                    filter
                )
                return results
            } finally {
                if (queryClient.isOpen) {
                    await queryClient.quit()
                }
            }
        }

        if (output === 'retriever') {
            return vectorStore.asRetriever(k)
        } else if (output === 'vectorStore') {
            ;(vectorStore as any).k = k
            return vectorStore
        }
        return vectorStore
    }
}

const buildRedisClient = (credentialData: ICommonObject, nodeData: INodeData) => {
    let redisUrl = getCredentialParam('redisUrl', credentialData, nodeData)
    if (!redisUrl || redisUrl === '') {
        const username = getCredentialParam('redisCacheUser', credentialData, nodeData)
        const password = getCredentialParam('redisCachePwd', credentialData, nodeData)
        const portStr = getCredentialParam('redisCachePort', credentialData, nodeData)
        const host = getCredentialParam('redisCacheHost', credentialData, nodeData)

        redisUrl = 'redis://' + username + ':' + password + '@' + host + ':' + portStr
    }

    const keepAlive =
        process.env.REDIS_KEEP_ALIVE && !isNaN(parseInt(process.env.REDIS_KEEP_ALIVE, 10))
            ? parseInt(process.env.REDIS_KEEP_ALIVE, 10)
            : undefined

    return createClient({
        url: redisUrl,
        socket: { keepAlive },
        pingInterval: keepAlive
    })
}

/**
 * Replaces @langchain/redis RedisVectorStore.addVectors and guards delete() to work around:
 * - node-redis v4 FT.INFO positional parsing bugs causing `lastKeyCount` to reset to 0 and overwrite keys
 * - @langchain/redis multi.exec() race condition (0 % batchSize === 0 firing inside Promise.all on reused multi)
 * - @langchain/redis ignoring `{ ids }` passed by Flowise's `index()` while delete() expects `ids`
 * - @langchain/redis throwing on empty `ids` arrays in `delete()`
 */
const adaptVectorStore = (vectorStore: RedisVectorStore, redisClient: ReturnType<typeof createClient>) => {
    vectorStore.addVectors = async (
        vectors: number[][],
        documents: Document[],
        documentOptions?: { ids?: string[]; keys?: string[]; batchSize?: number }
    ) => {
        if (!vectors.length || !vectors[0].length) {
            return
        }

        await vectorStore.createIndex(vectors[0].length)

        const batchSize = documentOptions?.batchSize ?? ADD_BATCH_SIZE
        const providedKeys = documentOptions?.keys
        const providedIds = documentOptions?.ids

        for (let batchStart = 0; batchStart < vectors.length; batchStart += batchSize) {
            const batchEnd = Math.min(batchStart + batchSize, vectors.length)
            const multi = redisClient.multi()

            for (let idx = batchStart; idx < batchEnd; idx += 1) {
                const key =
                    providedKeys && providedKeys.length > idx
                        ? providedKeys[idx]
                        : providedIds && providedIds.length > idx
                        ? `${vectorStore.keyPrefix}${providedIds[idx]}`
                        : `${vectorStore.keyPrefix}${randomUUID()}`

                const metadata = documents[idx]?.metadata ?? {}
                const hashFields: Record<string, string | Buffer> = {
                    [vectorStore.vectorKey]: Buffer.from(new Float32Array(vectors[idx]).buffer),
                    [vectorStore.contentKey]: documents[idx].pageContent,
                    [vectorStore.metadataKey]: escapeMetadataChars(JSON.stringify(metadata))
                }

                multi.hSet(key, hashFields)
                if (vectorStore.ttl) {
                    multi.expire(key, vectorStore.ttl)
                }
            }

            await multi.exec()
        }
    }

    const originalDelete = vectorStore.delete.bind(vectorStore)
    vectorStore.delete = async (params: { ids?: string[]; deleteAll?: boolean }) => {
        if (params && 'deleteAll' in params && params.deleteAll) {
            return originalDelete(params as any)
        }
        if (!params?.ids || params.ids.length === 0) {
            return
        }
        for (let i = 0; i < params.ids.length; i += DELETE_BATCH_SIZE) {
            await originalDelete({ ids: params.ids.slice(i, i + DELETE_BATCH_SIZE) })
        }
    }
}

const checkIndexExists = async (redisClient: ReturnType<typeof createClient>, indexName: string) => {
    try {
        await redisClient.ft.info(indexName)
    } catch (err: any) {
        if (err?.message.includes('unknown command')) {
            throw new Error(
                'Failed to run FT.INFO command. Please ensure that you are running a RediSearch-capable Redis instance: https://js.langchain.com/docs/modules/data_connection/vectorstores/integrations/redis#setup'
            )
        }
        // index doesn't exist
        return false
    }

    return true
}

const buildQuery = (
    query: number[],
    k: number,
    metadataKey: string,
    vectorKey: string,
    contentKey: string,
    filter?: string[]
): [string, SearchOptions] => {
    const vectorScoreField = 'vector_score'

    let hybridFields = '*'
    // if a filter is set, modify the hybrid query
    if (filter && filter.length) {
        // `filter` is a list of strings, then it's applied using the OR operator in the metadata key
        hybridFields = `@${metadataKey}:(${filter.map(escapeSpecialChars).join('|')})`
    }

    const baseQuery = `${hybridFields} => [KNN ${k} @${vectorKey} $vector AS ${vectorScoreField}]`
    const returnFields = [metadataKey, contentKey, vectorScoreField]

    const options: SearchOptions = {
        PARAMS: {
            vector: Buffer.from(new Float32Array(query).buffer)
        },
        RETURN: returnFields,
        SORTBY: vectorScoreField,
        DIALECT: 2,
        LIMIT: {
            from: 0,
            size: k
        }
    }

    return [baseQuery, options]
}

const similaritySearchVectorWithScore = async (
    query: number[],
    k: number,
    indexName: string,
    metadataKey: string,
    vectorKey: string,
    contentKey: string,
    redisClient: ReturnType<typeof createClient>,
    filter?: string[]
): Promise<[Document, number][]> => {
    const results = await redisClient.ft.search(indexName, ...buildQuery(query, k, metadataKey, vectorKey, contentKey, filter))
    const result: [Document, number][] = []

    if (results.total) {
        for (const res of results.documents) {
            if (res.value) {
                const document = res.value
                if (document.vector_score !== undefined && document.vector_score !== null) {
                    let parsedMetadata: Record<string, any> = {}
                    const rawMetadata = document[metadataKey]
                    if (typeof rawMetadata === 'string' && rawMetadata.length > 0) {
                        const metadataString = unEscapeSpecialChars(rawMetadata)
                        try {
                            parsedMetadata = JSON.parse(metadataString)
                        } catch {
                            parsedMetadata = {}
                        }
                    }
                    result.push([
                        new Document({
                            pageContent: (document[contentKey] as string) ?? '',
                            metadata: parsedMetadata
                        }),
                        Number(document.vector_score)
                    ])
                }
            }
        }
    }
    return result
}

module.exports = { nodeClass: Redis_VectorStores }
