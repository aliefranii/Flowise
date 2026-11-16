import PropTypes from 'prop-types'
import Logo from '@/assets/images/animasi-rounded-jubir.svg'

// material-ui
import { Box, IconButton, Typography, useTheme } from '@mui/material'

// icons
import { IconChevronDown, IconLayoutSidebarLeftCollapse, IconSearch } from '@tabler/icons-react'

// ==============================|| SIDEBAR HEADER ||============================== //

const SidebarHeader = ({ onToggle, onSearch }) => {
    const theme = useTheme()

    return (
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1, px: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}>
                {/* Perbaikan: Menggunakan component="img" dengan ukuran yang proporsional */}
                <Box
                    component='img'
                    src={Logo}
                    alt='Jubir.ai Agents'
                    sx={{
                        width: 32,
                        height: 32,
                        objectFit: 'contain',
                        flexShrink: 0
                    }}
                />
                <Typography
                    sx={{
                        fontWeight: 700,
                        fontSize: '1rem',
                        color: theme.palette.text.primary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}
                >
                    Jubir.ai
                </Typography>
                <IconChevronDown stroke={1.5} size='1rem' color={theme.palette.grey[500]} style={{ flexShrink: 0 }} />
            </Box>
            <IconButton size='small' onClick={onSearch} sx={{ color: theme.palette.grey[600] }}>
                <IconSearch stroke={1.5} size='1.1rem' />
            </IconButton>
            <IconButton size='small' onClick={onToggle} sx={{ color: theme.palette.grey[600] }}>
                <IconLayoutSidebarLeftCollapse stroke={1.5} size='1.1rem' />
            </IconButton>
        </Box>
    )
}

SidebarHeader.propTypes = {
    onToggle: PropTypes.func,
    onSearch: PropTypes.func
}

export default SidebarHeader
