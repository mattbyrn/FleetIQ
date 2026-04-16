import { IconButton, Menu, MenuItem } from '@material-ui/core';
import { Box } from '@material-ui/core';
import { AccountCircle } from '@material-ui/icons';
import { makeStyles } from '@material-ui/styles';
import { useAuthContext } from '../hooks/useAuthContext';
import { useLogout } from '../hooks/useLogout';
import React from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom'; // Import useNavigate

const useStyles = makeStyles({
  icon: {
    fontSize: 30,
    color: 'white',
  },
});

function AccountButton(props) {
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const { user } = useAuthContext();
  const { logout } = useLogout();
  const navigate = useNavigate();

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleAccountClose = async () => {
    setAnchorEl(null);
    try {
      await logout();
      toast.success('Logged out');
    } catch (err) {
      toast.error('Failed to log out');
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSettingsClick = () => {
    navigate('/user-settings');
  };

  return (
    <Box>
      <IconButton onClick={handleClick}>
        <AccountCircle className={classes.icon} />
      </IconButton>
      <Menu
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        <MenuItem onClick={handleSettingsClick}>User Settings</MenuItem>
        <MenuItem onClick={handleAccountClose}>Logout</MenuItem>
      </Menu>
    </Box>
  );
}

export default AccountButton;
