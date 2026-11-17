import { useDispatch } from 'react-redux'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

// material-ui
import { Button, Box, Stack } from '@mui/material'
import { IconX } from '@tabler/icons-react'

// Project import
import { StyledButton } from '@/ui-component/button/StyledButton'
import { SwitchInput } from '@/ui-component/switch/Switch'

// store
import { enqueueSnackbar as enqueueSnackbarAction, closeSnackbar as closeSnackbarAction, SET_CHATFLOW } from '@/store/actions'
import useNotifier from '@/utils/useNotifier'

// API
import chatflowsApi from '@/api/chatflows'

const ChatHistory = ({ dialogProps, onConfirm }) => {
    const dispatch = useDispatch()

    useNotifier()

    const enqueueSnackbar = (...args) => dispatch(enqueueSnackbarAction(...args))
    const closeSnackbar = (...args) => dispatch(closeSnackbarAction(...args))

    const [chatHistoryStatus, setChatHistoryStatus] = useState(false)
    const [chatbotConfig, setChatbotConfig] = useState({})

    const handleChange = (value) => {
        setChatHistoryStatus(value)
    }

    const onSave = async () => {
        try {
            chatbotConfig.chatHistory = { status: chatHistoryStatus }
            const saveResp = await chatflowsApi.updateChatflow(dialogProps.chatflow.id, {
                chatbotConfig: JSON.stringify(chatbotConfig)
            })
            if (saveResp.data) {
                enqueueSnackbar({
                    message: 'Chat History Settings Saved',
                    options: {
                        key: new Date().getTime() + Math.random(),
                        variant: 'success',
                        action: (key) => (
                            <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                                <IconX />
                            </Button>
                        )
                    }
                })
                dispatch({ type: SET_CHATFLOW, chatflow: saveResp.data })
                onConfirm?.()
            }
        } catch (error) {
            enqueueSnackbar({
                message: `Failed to save Chat History Settings: ${
                    typeof error.response.data === 'object' ? error.response.data.message : error.response.data
                }`,
                options: {
                    key: new Date().getTime() + Math.random(),
                    variant: 'error',
                    persist: true,
                    action: (key) => (
                        <Button style={{ color: 'white' }} onClick={() => closeSnackbar(key)}>
                            <IconX />
                        </Button>
                    )
                }
            })
        }
    }

    useEffect(() => {
        if (dialogProps.chatflow && dialogProps.chatflow.chatbotConfig) {
            let parsedConfig = {}
            try {
                parsedConfig = JSON.parse(dialogProps.chatflow.chatbotConfig)
            } catch (e) {
                parsedConfig = {}
            }
            setChatbotConfig(parsedConfig || {})
            if (parsedConfig.chatHistory) {
                setChatHistoryStatus(parsedConfig.chatHistory.status)
            }
        }

        return () => {}
    }, [dialogProps])

    return (
        <Stack direction='column' spacing={2} sx={{ width: '100%' }}>
            <SwitchInput label='Enable chat history (session list)' onChange={handleChange} value={chatHistoryStatus} />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', width: '100%', mt: 2 }}>
                <StyledButton variant='contained' onClick={onSave} sx={{ minWidth: 100 }}>
                    Save
                </StyledButton>
            </Box>
        </Stack>
    )
}

ChatHistory.propTypes = {
    dialogProps: PropTypes.object,
    onConfirm: PropTypes.func
}

export default ChatHistory
