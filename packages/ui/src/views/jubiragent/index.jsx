import { useEffect, useRef, useState } from 'react'
import AnimasiLogoJubir from '@/assets/images/animasi-rounded-jubir.svg'

// material-ui
import { Box, IconButton, InputBase, MenuItem, Select, Typography, useTheme } from '@mui/material'
import { alpha, keyframes } from '@mui/material/styles'

// icons
import { IconArrowForwardUp, IconArrowUp, IconBulb, IconChevronDown, IconWaveSine } from '@tabler/icons-react'

// project imports
import ChatMessage from '@/views/chatmessage/ChatMessage'

// API
import chatflowsApi from '@/api/chatflows'

// ==============================|| ANIMASI KEYFRAMES ||============================== //

// Animasi pendaran cahaya luar + pantulan 3D di dalam bola
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

// ==============================|| JUBIR AGENT ||============================== //

const FAQ_LIST = [
    'Jelaskan Visi, misi, tujuan, sasaran, & program prioritas',
    'Struktur tujuan daerah dan sasaran strategisnya',
    'Rangkum dokumen utama secara menyeluruh',
    'Apa saja indikator kinerja utama daerah?'
]

const JubirAgent = () => {
    const theme = useTheme()
    const inputRef = useRef(null)

    const [agents, setAgents] = useState([])
    const [selectedAgentId, setSelectedAgentId] = useState('')
    const [started, setStarted] = useState(false)
    const [inputMessage, setInputMessage] = useState('')

    useEffect(() => {
        chatflowsApi.getAllAgentflows('AGENTFLOW', { limit: 100 }).then((res) => {
            const list = res.data?.data || []
            setAgents(list)
            if (list.length > 0) setSelectedAgentId(list[0].id)
        })
    }, [])

    const handleStartChat = () => {
        if (selectedAgentId) {
            setStarted(true)
        }
    }

    // Fungsi untuk memasukkan teks FAQ ke dalam input dan memfokuskan kursor
    const handleSelectFaq = (faqText) => {
        setInputMessage(faqText)
        if (inputRef.current) {
            inputRef.current.focus()
        }
    }

    if (started && selectedAgentId) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 40px)', mt: -2.5, mx: -2.5 }}>
                <ChatMessage
                    open={true}
                    chatflowid={selectedAgentId}
                    isAgentCanvas={false}
                    isDialog={false}
                    previews={[]}
                    setPreviews={() => {}}
                />
            </Box>
        )
    }

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 'calc(100vh - 40px)',
                px: 2,
                py: 4
            }}
        >
            {/* Logo Bola 3D (Glossy Blue Orb) dengan Efek Glowing */}
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
                    sx={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain',
                        borderRadius: '50%',
                        zIndex: 1
                    }}
                />
            </Box>

            {/* Judul & Subjudul */}
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
                sx={{
                    mb: 4.5,
                    maxWidth: 420,
                    textAlign: 'center',
                    color: theme.palette.text.secondary,
                    lineHeight: 1.6
                }}
            >
                Mulai chat dengan agent, tanyakan apapun mengenai daerah anda
            </Typography>

            {/* Kotak Input Utama */}
            <Box
                onClick={() => inputRef.current?.focus()}
                sx={{
                    width: '100%',
                    maxWidth: 780,
                    minHeight: 155,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: '16px',
                    p: 2.5,
                    cursor: 'text',
                    backgroundColor: theme.palette.background.paper,
                    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.04)',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                    '&:hover': {
                        borderColor: alpha('#2391FF', 0.4),
                        boxShadow: '0 6px 30px rgba(0, 0, 0, 0.07)'
                    }
                }}
            >
                {/* Area Teks / Placeholder */}
                <InputBase
                    inputRef={inputRef}
                    fullWidth
                    multiline
                    maxRows={3}
                    placeholder='Tuliskan pesan anda atau klik Sering ditanyakan dibawah...'
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault()
                            handleStartChat()
                        }
                    }}
                    sx={{
                        fontSize: '0.95rem',
                        color: theme.palette.text.primary,
                        '& .MuiInputBase-input::placeholder': {
                            color: theme.palette.text.secondary,
                            opacity: 0.75
                        }
                    }}
                />

                {/* Baris Bawah: Dropdown Dokumen & Tombol Aksi */}
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 1.5,
                        mt: 2
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Pemilih Dokumen dengan Ikon Bohlam Ungu */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                            sx={{
                                width: 26,
                                height: 26,
                                borderRadius: '6px',
                                backgroundColor: '#F3E8FF',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#7C3AED'
                            }}
                        >
                            <IconBulb size='1rem' stroke={2} />
                        </Box>
                        <Select
                            variant='standard'
                            disableUnderline
                            displayEmpty
                            value={selectedAgentId}
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            IconComponent={(props) => (
                                <IconChevronDown
                                    {...props}
                                    size='1rem'
                                    style={{ color: theme.palette.text.secondary, marginLeft: 4, cursor: 'pointer' }}
                                />
                            )}
                            renderValue={(selected) => {
                                if (!selected || agents.length === 0) {
                                    return 'Pilih Agent'
                                }
                                return agents.find((a) => a.id === selected)?.name || 'Pilih Agent'
                            }}
                            sx={{
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: theme.palette.text.primary,
                                '& .MuiSelect-select': {
                                    py: 0.5,
                                    pr: '20px !important',
                                    display: 'flex',
                                    alignItems: 'center'
                                }
                            }}
                        >
                            <MenuItem value='' disabled>
                                Pilih Agent
                            </MenuItem>
                            {agents.map((agent) => (
                                <MenuItem key={agent.id} value={agent.id}>
                                    {agent.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {/* Tombol Suara / Audio */}
                    <IconButton
                        onClick={handleStartChat}
                        disabled={!selectedAgentId}
                        sx={{
                            width: 38,
                            height: 38,
                            backgroundColor: '#2391FF',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#2391FF' },
                            '&.Mui-disabled': {
                                backgroundColor: theme.palette.action.disabledBackground,
                                color: theme.palette.action.disabled
                            }
                        }}
                    >
                        <IconWaveSine size='1.2rem' stroke={2} />
                    </IconButton>

                    {/* Tombol Kirim (Panah Atas) */}
                    <IconButton
                        onClick={handleStartChat}
                        disabled={!selectedAgentId}
                        sx={{
                            width: 38,
                            height: 38,
                            backgroundColor: '#2391FF',
                            color: '#fff',
                            '&:hover': { backgroundColor: '#2391FF' },
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

            {/* Bagian "Sering ditanyakan" */}
            <Typography
                variant='body2'
                sx={{
                    mt: 4,
                    mb: 2,
                    color: theme.palette.text.secondary,
                    fontWeight: 500
                }}
            >
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
                        <IconArrowForwardUp size='1.1rem' stroke={1.75} style={{ flexShrink: 0, color: theme.palette.text.secondary }} />
                        <Typography
                            variant='body2'
                            sx={{
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                color: 'inherit'
                            }}
                        >
                            {faq}
                        </Typography>
                    </Box>
                ))}
            </Box>
        </Box>
    )
}

export default JubirAgent
