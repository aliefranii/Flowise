import PropTypes from 'prop-types'
import { useSelector } from 'react-redux'

// material-ui
import { useTheme } from '@mui/material/styles'
import { Box, Drawer, useMediaQuery, Toolbar } from '@mui/material'

// third-party
import PerfectScrollbar from 'react-perfect-scrollbar'
import { BrowserView, MobileView } from 'react-device-detect'

// project imports
import MenuList from './MenuList'
import CloudMenuList from '@/layout/MainLayout/Sidebar/CloudMenuList'

// store
import { drawerWidth, headerHeight } from '@/store/constant'

// component
import SidebarHeader from './SidebarHeader'

// ==============================|| SIDEBAR DRAWER ||============================== //

const Sidebar = ({ drawerOpen, drawerToggle, window, bannerOffset = 0 }) => {
    const theme = useTheme()
    const matchUpMd = useMediaQuery(theme.breakpoints.up('md'))
    const isAuthenticated = useSelector((state) => state.auth.isAuthenticated)

    const drawer = (
        <>
            <Toolbar
                sx={{
                    height: `${headerHeight}px`,
                    minHeight: `${headerHeight}px !important`,
                    px: 1,
                    borderBottom: '1px solid',
                    borderColor: theme.palette.grey[900] + 25
                }}
            >
                <SidebarHeader onToggle={drawerToggle} />
            </Toolbar>
            <BrowserView>
                <PerfectScrollbar
                    component='div'
                    style={{
                        height: !matchUpMd ? '0px' : `calc(100vh - ${headerHeight + bannerOffset}px)`,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <MenuList />
                    <CloudMenuList />
                </PerfectScrollbar>
            </BrowserView>
            <MobileView>
                <Box sx={{ height: `calc(100vh - ${headerHeight}px)`, overflowY: 'auto', px: 1 }}>
                    <MenuList />
                    <CloudMenuList />
                </Box>
            </MobileView>
        </>
    )

    const container = window !== undefined ? () => window.document.body : undefined

    return (
        <Box
            component='nav'
            sx={{
                flexShrink: { md: 0 },
                width: matchUpMd ? drawerWidth : 'auto'
            }}
            aria-label='mailbox folders'
        >
            {isAuthenticated && (
                <Drawer
                    container={container}
                    variant={matchUpMd ? 'persistent' : 'temporary'}
                    anchor='left'
                    open={drawerOpen}
                    onClose={drawerToggle}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            background: theme.palette.background.default,
                            color: theme.palette.text.primary,
                            borderRight: drawerOpen ? '1px solid' : 'none',
                            borderColor: drawerOpen ? theme.palette.grey[900] + 25 : 'transparent'
                        }
                    }}
                    ModalProps={{ keepMounted: true }}
                    color='inherit'
                >
                    {drawer}
                </Drawer>
            )}
        </Box>
    )
}

Sidebar.propTypes = {
    drawerOpen: PropTypes.bool,
    drawerToggle: PropTypes.func,
    window: PropTypes.object,
    bannerOffset: PropTypes.number
}

export default Sidebar
