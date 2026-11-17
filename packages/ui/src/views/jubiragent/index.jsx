import { useEffect, useRef, useState } from 'react'
import { alpha, keyframes } from '@mui/system'
import { motion } from 'framer-motion'
import { v4 as uuidv4 } from 'uuid'
import AnimasiLogoJubir from '@/assets/images/animasi-rounded-jubir.svg'

// material-ui
import {
    Box,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    InputBase,
    MenuItem,
    Select,
    Typography,
    useTheme
} from '@mui/material'

// icons
import {
    IconArrowForwardUp,
    IconArrowUp,
    IconChevronDown,
    IconClockHour4,
    IconMessage,
    IconPlus,
    IconTrash,
    IconWaveSine,
    IconX
} from '@tabler/icons-react'

// project imports
import ChatMessageV2 from '@/views/chatmessage/ChatMessageV2'

// API
import chatflowsApi from '@/api/chatflows'
import chatmessagesApi from '@/api/chatmessage'
import useApi from '@/hooks/useApi'
import { useError } from '@/store/context/ErrorContext'
import { getLocalStorageChatflow } from '@/utils/genericHelper'

const orbPulseGlow = keyframes`
    0%, 100% {
        box-shadow:
            0 10px 35px 8px rgba(74, 133, 246, 0.35),
            0 0 60px 15px rgba(130, 177, 255, 0.2),
            inset 0 -10px 20px rgba(66, 126, 245, 0.65),
            inset 0 8px 16px rgba(255, 255, 255, 0.9);
        transform: scale(1);
    }
    50% {
        box-shadow:
            0 12px 50px 16px rgba(74, 133, 246, 0.6),
            0 0 85px 28px rgba(130, 177, 255, 0.4),
            inset 0 -14px 24px rgba(50, 115, 245, 0.8),
            inset 0 10px 20px rgba(255, 255, 255, 1);
        transform: scale(1.04);
    }
`

const FAQ_LIST = [
    'Jelaskan Visi, misi, tujuan, sasaran, & program prioritas',
    'Struktur tujuan daerah dan sasaran strategisnya',
    'Rangkum dokumen utama secara menyeluruh',
    'Apa saja indikator kinerja utama daerah?'
]

const JubirAgent = () => {
    const theme = useTheme()
    const inputRef = useRef(null)
    const chatRef = useRef(null)

    const [selectedAgentId, setSelectedAgentId] = useState('')
    const [started, setStarted] = useState(false)
    const [inputMessage, setInputMessage] = useState('')
    const [pendingMessage, setPendingMessage] = useState('')
    const [activeChatId, setActiveChatId] = useState('')
    const [saveHistory, setSaveHistory] = useState(false)
    const [sessionToDelete, setSessionToDelete] = useState(null)
    const [isDeletingSession, setIsDeletingSession] = useState(false)
    const { setError } = useError()

    const getAllAgentflows = useApi(chatflowsApi.getAllAgentflows)
    const getChatflowConfig = useApi(chatflowsApi.getSpecificChatflow)
    const getSessionsApi = useApi(chatmessagesApi.getInternalChatSessions)

    const sessions = getSessionsApi.data || []
    const historyEnabled = saveHistory && !!selectedAgentId

    const handleStartChat = () => {
        if (!selectedAgentId) return
        const msg = inputMessage.trim()
        if (!msg) return
        if (!started) {
            setStarted(true)
            setActiveChatId(uuidv4())
            setInputMessage('')
            setPendingMessage(msg)
        } else {
            chatRef.current?.send(msg)
            setInputMessage('')
        }
    }

    useEffect(() => {
        if (started && pendingMessage) {
            const t = setTimeout(() => {
                chatRef.current?.send(pendingMessage)
                setPendingMessage('')
            }, 150)
            return () => clearTimeout(t)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [started, pendingMessage])

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleStartChat()
        }
    }

    const handleSelectFaq = (faqText) => {
        setInputMessage(faqText)
        inputRef.current?.focus()
    }

    const refreshSessions = () => {
        if (selectedAgentId) getSessionsApi.request(selectedAgentId)
    }

    useEffect(() => {
        getAllAgentflows.request('AGENTFLOW', {})
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        if (getAllAgentflows.error) setError(getAllAgentflows.error)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getAllAgentflows.error])

    useEffect(() => {
        if (getSessionsApi.error) setError(getSessionsApi.error)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [getSessionsApi.error])

    useEffect(() => {
        if (!selectedAgentId) return
        getChatflowConfig.request(selectedAgentId)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAgentId])

    useEffect(() => {
        const config = getChatflowConfig.data
        if (!config) {
            setSaveHistory(false)
            return
        }
        let chatbotConfig = {}
        try {
            chatbotConfig = config.chatbotConfig ? JSON.parse(config.chatbotConfig) : {}
        } catch (e) {
            chatbotConfig = {}
        }
        setSaveHistory(chatbotConfig?.chatHistory?.status === true)
    }, [getChatflowConfig.data])

    const handleNewChat = () => {
        if (!selectedAgentId) return
        chatRef.current?.reset()
        setInputMessage('')
        setPendingMessage('')
        setActiveChatId(uuidv4())
    }

    const handleSelectSession = (chatId) => {
        if (!chatId || chatId === activeChatId) return
        setActiveChatId(chatId)
    }

    const handleConfirmDeleteSession = async () => {
        if (!sessionToDelete || !selectedAgentId) return
        setIsDeletingSession(true)
        try {
            await chatmessagesApi.deleteInternalChatSession(selectedAgentId, sessionToDelete.chatId)
            if (sessionToDelete.chatId === activeChatId) {
                chatRef.current?.reset()
                setActiveChatId(uuidv4())
            }
            setSessionToDelete(null)
            refreshSessions()
        } catch (error) {
            setError(error)
        } finally {
            setIsDeletingSession(false)
        }
    }

    const agentOptions = getAllAgentflows.data || []
    const agentName = agentOptions.find((a) => a.id === selectedAgentId)?.name

    useEffect(() => {
        if (!selectedAgentId) return
        const storedChatId = getLocalStorageChatflow(selectedAgentId)?.chatId
        if (storedChatId && !started) {
            setActiveChatId(storedChatId)
            setStarted(true)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAgentId])

    useEffect(() => {
        if (historyEnabled && started) refreshSessions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyEnabled, started, selectedAgentId])

    const agentSelect = (
        <Select
            variant='standard'
            disableUnderline
            displayEmpty
            value={selectedAgentId}
            onChange={(e) => setSelectedAgentId(e.target.value)}
            IconComponent={(props) => (
                <IconChevronDown {...props} size='1rem' style={{ color: theme.palette.text.secondary, marginLeft: 4 }} />
            )}
            renderValue={(selected) => (selected ? agentOptions.find((a) => a.id === selected)?.name || 'Pilih Agent' : 'Pilih Agent')}
            sx={{
                fontSize: '0.875rem',
                fontWeight: 500,
                color: theme.palette.text.primary,
                '& .MuiSelect-select': { py: 0.5, pr: '20px !important', display: 'flex', alignItems: 'center' }
            }}
        >
            <MenuItem value='' disabled>
                Pilih Agent
            </MenuItem>
            {agentOptions.map((agent) => (
                <MenuItem key={agent.id} value={agent.id}>
                    {agent.name}
                </MenuItem>
            ))}
        </Select>
    )

    const inputBox = (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                width: '100%',
                maxWidth: 780,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: '16px',
                px: 2,
                py: 1.5,
                backgroundColor: theme.palette.background.paper,
                boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                transition: 'border-color 0.2s, box-shadow 0.2s',
                '&:focus-within': {
                    borderColor: alpha('#2391FF', 0.6),
                    boxShadow: '0 6px 30px rgba(0, 0, 0, 0.07)'
                }
            }}
            onClick={() => inputRef.current?.focus()}
        >
            <InputBase
                inputRef={inputRef}
                fullWidth
                multiline
                maxRows={4}
                placeholder='Tuliskan pesan anda...'
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleInputKeyDown}
                sx={{
                    fontSize: '0.95rem',
                    color: theme.palette.text.primary,
                    '& .MuiInputBase-input::placeholder': { color: theme.palette.text.secondary, opacity: 0.75 }
                }}
            />
            <Box
                sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
                onClick={(e) => e.stopPropagation()}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', minWidth: 0 }}>{agentSelect}</Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <IconButton
                        onClick={handleStartChat}
                        disabled={!selectedAgentId}
                        size='small'
                        sx={{
                            width: 38,
                            height: 38,
                            color: theme.palette.text.secondary,
                            '&:hover': { backgroundColor: theme.palette.action.hover }
                        }}
                    >
                        <IconWaveSine size='1.2rem' stroke={2} />
                    </IconButton>
                    <IconButton
                        onClick={handleStartChat}
                        disabled={!selectedAgentId || !inputMessage.trim()}
                        sx={{
                            width: 38,
                            height: 38,
                            backgroundColor: '#2391FF',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#1a7ee6' },
                            '&.Mui-disabled': {
                                backgroundColor: theme.palette.action.disabledBackground,
                                color: theme.palette.action.disabled
                            }
                        }}
                    >
                        <IconArrowUp size='1.2rem' stroke={2} />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    )

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: 'calc(100vh - 40px)',
                mt: -2.5,
                mx: -2.5,
                backgroundColor: theme.palette.background.paper
            }}
        >
            {started && selectedAgentId ? (
                <>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: 1,
                            px: 2.5,
                            py: 1.25,
                            borderBottom: `1px solid ${theme.palette.divider}`
                        }}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                            <Box
                                component='img'
                                src={AnimasiLogoJubir}
                                alt='Jubir.ai Agents'
                                sx={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'contain' }}
                            />
                            <Typography variant='subtitle1' sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
                                {agentName || 'Jubir Agent'}
                            </Typography>
                        </Box>
                        {agentSelect}
                    </Box>

                    <Box sx={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
                        {historyEnabled && (
                            <Box
                                sx={{
                                    width: 260,
                                    minWidth: 260,
                                    display: 'flex',
                                    flexDirection: 'column',
                                    borderRight: `1px solid ${theme.palette.divider}`,
                                    backgroundColor: theme.palette.background.paper
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5 }}>
                                    <Typography
                                        variant='caption'
                                        sx={{
                                            fontWeight: 700,
                                            letterSpacing: '0.05em',
                                            textTransform: 'uppercase',
                                            color: theme.palette.text.secondary
                                        }}
                                    >
                                        Riwayat
                                    </Typography>
                                    <IconButton size='small' onClick={handleNewChat} title='Sesi baru'>
                                        <IconPlus size='1.1rem' />
                                    </IconButton>
                                </Box>
                                <Divider />
                                <Box sx={{ flex: 1, overflowY: 'auto', py: 1 }}>
                                    {sessions.length === 0 ? (
                                        <Box sx={{ px: 2, py: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                                            <IconClockHour4 size='1.4rem' style={{ color: theme.palette.text.secondary, opacity: 0.6 }} />
                                            <Typography variant='body2' sx={{ color: theme.palette.text.secondary, textAlign: 'center' }}>
                                                Belum ada riwayat sesi
                                            </Typography>
                                        </Box>
                                    ) : (
                                        sessions.map((session) => {
                                            const isActive = session.chatId === activeChatId
                                            return (
                                                <Box
                                                    key={session.chatId}
                                                    onClick={() => handleSelectSession(session.chatId)}
                                                    sx={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 1,
                                                        mx: 1,
                                                        px: 1.5,
                                                        py: 1,
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        backgroundColor: isActive ? alpha('#2391FF', 0.1) : 'transparent',
                                                        '&:hover': {
                                                            backgroundColor: isActive ? alpha('#2391FF', 0.14) : theme.palette.action.hover
                                                        },
                                                        '&:hover .session-delete': { opacity: 1 }
                                                    }}
                                                >
                                                    <IconMessage
                                                        size='1rem'
                                                        style={{ flexShrink: 0, color: theme.palette.text.secondary }}
                                                    />
                                                    <Typography
                                                        variant='body2'
                                                        sx={{
                                                            flex: 1,
                                                            minWidth: 0,
                                                            whiteSpace: 'nowrap',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            fontSize: '0.8125rem',
                                                            color: isActive ? theme.palette.text.primary : theme.palette.text.secondary
                                                        }}
                                                    >
                                                        {session.title}
                                                    </Typography>
                                                    <IconButton
                                                        className='session-delete'
                                                        size='small'
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            setSessionToDelete(session)
                                                        }}
                                                        sx={{
                                                            opacity: 0,
                                                            transition: 'opacity 0.15s',
                                                            color: theme.palette.text.secondary
                                                        }}
                                                        title='Hapus sesi'
                                                    >
                                                        <IconTrash size='0.95rem' />
                                                    </IconButton>
                                                </Box>
                                            )
                                        })
                                    )}
                                </Box>
                            </Box>
                        )}

                        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, overflow: 'hidden' }}>
                            <ChatMessageV2
                                ref={chatRef}
                                open={true}
                                chatflowid={selectedAgentId}
                                chatId={activeChatId}
                                isAgentCanvas={false}
                                isDialog={false}
                                previews={[]}
                                setPreviews={() => {}}
                                greeting='Halo! Ada yang bisa Jubir bantu?'
                                onMessageSent={refreshSessions}
                            />
                        </Box>
                    </Box>
                </>
            ) : (
                <Box
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 2,
                        py: 4
                    }}
                >
                    <Box
                        sx={{
                            position: 'relative',
                            width: 96,
                            height: 96,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 3.5,
                            background: 'radial-gradient(circle at 42% 38%, #FFFFFF 0%, #F2F7FF 28%, #BDD7FF 62%, #6398F7 100%)',
                            border: '2px solid rgba(255, 255, 255, 0.92)',
                            animation: `${orbPulseGlow} 2.8s infinite ease-in-out`
                        }}
                    >
                        <Box
                            component='img'
                            src={AnimasiLogoJubir}
                            alt='Jubir.ai Agents'
                            sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '50%', zIndex: 1 }}
                        />
                    </Box>

                    <Typography
                        variant='h2'
                        sx={{
                            fontWeight: 700,
                            fontSize: { xs: '1.75rem', md: '2.125rem' },
                            mb: 1.5,
                            textAlign: 'center',
                            color: theme.palette.text.primary
                        }}
                    >
                        Chat dengan agent
                    </Typography>
                    <Typography
                        variant='body1'
                        sx={{ mb: 4.5, maxWidth: 420, textAlign: 'center', color: theme.palette.text.secondary, lineHeight: 1.6 }}
                    >
                        Mulai chat dengan agent, tanyakan apapun mengenai daerah anda
                    </Typography>

                    {inputBox}

                    <Typography variant='body2' sx={{ mt: 4, mb: 2, color: theme.palette.text.secondary, fontWeight: 500 }}>
                        Sering ditanyakan
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
                            gap: 1.5,
                            width: '100%',
                            maxWidth: 780
                        }}
                    >
                        {FAQ_LIST.map((faq) => (
                            <Box
                                key={faq}
                                onClick={() => handleSelectFaq(faq)}
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1.25,
                                    px: 2.5,
                                    py: 1.25,
                                    fontSize: '0.875rem',
                                    borderRadius: '999px',
                                    border: `1px solid ${theme.palette.divider}`,
                                    color: theme.palette.text.secondary,
                                    cursor: 'pointer',
                                    backgroundColor: theme.palette.background.paper,
                                    transition: 'all 0.2s',
                                    '&:hover': {
                                        borderColor: '#2391FF',
                                        color: theme.palette.text.primary,
                                        backgroundColor: alpha('#2391FF', 0.04)
                                    }
                                }}
                            >
                                <IconArrowForwardUp
                                    size='1.1rem'
                                    stroke={1.75}
                                    style={{ flexShrink: 0, color: theme.palette.text.secondary }}
                                />
                                <Typography
                                    variant='body2'
                                    sx={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'inherit' }}
                                >
                                    {faq}
                                </Typography>
                            </Box>
                        ))}
                    </Box>
                </Box>
            )}

            {started && selectedAgentId && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    fullWidth
                    style={{
                        padding: '12px 20px',
                        borderTop: `1px solid ${theme.palette.divider}`,
                        backgroundColor: theme.palette.background.paper
                    }}
                >
                    <Box
                        sx={{
                            mx: 'auto',
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center'
                        }}
                    >
                        {inputBox}
                    </Box>
                </motion.div>
            )}

            <Dialog open={!!sessionToDelete} onClose={() => (isDeletingSession ? null : setSessionToDelete(null))} maxWidth='xs' fullWidth>
                <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
                    <Typography variant='h4'>Hapus riwayat sesi</Typography>
                    <IconButton size='small' onClick={() => setSessionToDelete(null)} disabled={isDeletingSession}>
                        <IconX size='1rem' />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Typography variant='body1' sx={{ color: theme.palette.text.secondary }}>
                        Hapus sesi &quot;{sessionToDelete?.title}&quot;? Tindakan ini tidak dapat dibatalkan.
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                        <IconButton
                            onClick={() => setSessionToDelete(null)}
                            disabled={isDeletingSession}
                            sx={{ borderRadius: '8px', px: 2, fontSize: '0.875rem' }}
                        >
                            Batal
                        </IconButton>
                        <IconButton
                            onClick={handleConfirmDeleteSession}
                            disabled={isDeletingSession}
                            sx={{
                                borderRadius: '8px',
                                px: 2,
                                fontSize: '0.875rem',
                                backgroundColor: theme.palette.error.main,
                                color: '#fff',
                                '&:hover': { backgroundColor: theme.palette.error.dark }
                            }}
                        >
                            Hapus
                        </IconButton>
                    </Box>
                </DialogContent>
            </Dialog>
        </Box>
    )
}

export default JubirAgent
