import React, { useState } from 'react';
import { useAuthContext } from './hooks/useAuthContext';
import { makeStyles } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import AppBar from '@material-ui/core/AppBar';
import CssBaseline from '@material-ui/core/CssBaseline';
import Toolbar from '@material-ui/core/Toolbar';
import IconButton from '@material-ui/core/IconButton';
import Typography from '@material-ui/core/Typography';
import MenuIcon from '@material-ui/icons/Menu';
import { NavLink, useLocation, Link as RouterLink } from 'react-router-dom';
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import navLinks from './components/NavLinks';
import AccountButton from './components/AccountButton';
import { Accordion, AccordionSummary, AccordionDetails, Grid } from '@material-ui/core';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

const useStyles = makeStyles((theme) => ({
  root: {
    display: 'flex',
    width: '100vw',
    height: '100vh',
    fontFamily: "Inter, Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: '14px',
    '&$expanded': {
      margin: 'auto',
    },
  },
  appBar: {
    zIndex: theme.zIndex.drawer + 1,
  },
  drawer: {
    flexShrink: 0,
  },
  activeDrawerPaper: {
    width: 280,
  },
  inactiveDrawerPaper: {
    width: 0,
  },
  drawerContainer: {
    marginTop: '5px',
    overflow: 'auto',
    backgroundColor: '#ffffff',
  },
  mobileHidden: {
    [theme.breakpoints.down(750)]: {
      display: 'none',
    },
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3),
    marginTop: '4rem',
  },
  pointer: {
    cursor: 'pointer',
  },
  toolBar: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  accordionSummary: {
    backgroundColor: '#ffffff',
    padding: '10px 12px',
    borderBottom: '1px solid #e0e0e0',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
    '& .MuiAccordionSummary-content': {
      margin: 0,
      alignItems: 'center',
    },
    '& .MuiTypography-root': {
      fontSize: '15px',
      fontFamily: "Inter, Roboto, 'Helvetica Neue', Arial, sans-serif",
      fontWeight: 600,
      color: '#0f3550',
      lineHeight: '20px',
    },
  },
  accordionDetails: {
    padding: '1px 0',
    backgroundColor: '#fbfcfd',
    '& > div': {
      width: '100%',
    },
  },
  navItem: {
    padding: 0,
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#ffffff',
    transition: 'background-color 150ms ease, border-color 150ms ease',
    '&:hover': {
      backgroundColor: '#f5f5f5',
    },
    '&:last-child': {
      borderBottom: 'none',
    },
    '& $navLink.active': {
      backgroundColor: '#DCEFFD',
      fontWeight: 700,
      color: '#0b3d66',
      textDecoration: 'none',
      borderLeft: '4px solid #1976d2',
      paddingLeft: 8,
    },
  },
  navLink: {
    display: 'inline-block',
    width: '100%',
    marginBottom: 0,
    color: 'black',
    textDecoration: 'none',
    padding: '10px 12px',
    fontFamily: "Inter, Roboto, 'Helvetica Neue', Arial, sans-serif",
    fontSize: '1rem',
    lineHeight: '20px',
  },
  activeAccordionSummary: {
    fontWeight: 'bold',
    backgroundColor: '#DCEFFD',
    borderLeft: '4px solid #1976d2',
    '& .MuiTypography-root': {
      fontWeight: 700,
      color: '#0b3d66',
    },
  },
  accordion: {
    boxShadow: 'none',

    borderRadius: 0,
    margin: 0,
    overflow: 'hidden',
    '&.Mui-expanded': {
      borderBottom: '1px #52525277 solid',

      margin: 0,
    },
  },
  accordionExpandIcon: {
    color: '#666',
  },
  breadcrumbs: {
    color: theme.palette.common.white,
    textDecoration: 'none',
    fontSize: '1.5rem',
    fontFamily: "Inter, Roboto, 'Helvetica Neue', Arial, sans-serif",
    '& a': {
      color: theme.palette.common.white,
      textDecoration: 'none',
      '&:hover': {
        textDecoration: 'underline',
      },
    },
  },
}));

const generatePathNameMap = (navLinks) => {
  const pathNameMap = {};

  Object.values(navLinks).forEach((category) => {
    pathNameMap[category.heading] = {
      text: category.heading,
      links: {},
    };

    Object.values(category.links).forEach((link) => {
      pathNameMap[category.heading].links[link.path] = link.text;
    });
  });

  return pathNameMap;
};

export default function ClippedDrawer(props) {
  const classes = useStyles();
  const categories = navLinks();
  const { user } = useAuthContext();
  const [isActive, setIsActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const location = useLocation();
  const pathNameMap = generatePathNameMap(categories);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  function renderNavLink(link) {
    return (
      <div className={classes.navItem}>
        <NavLink to={link.path} exact={true} className={classes.navLink}>
          <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid item>{link.icon}</Grid>
            <Grid item>{link.text}</Grid>
          </Grid>
        </NavLink>
      </div>
    );
  }

  function renderAccordion(categoryKey, category) {
    const isActiveCategory = Object.values(category.links).some((link) => location.pathname.includes(link.path));
    return (
      <Accordion
        className={classes.accordion}
        key={categoryKey}
        expanded={expanded === categoryKey}
        onChange={handleChange(categoryKey)}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon className={classes.accordionExpandIcon} />}
          aria-controls="panel1a-content"
          id="panel1a-header"
          className={`${classes.accordionSummary} ${isActiveCategory ? classes.activeAccordionSummary : ''}`}
        >
          <Grid container direction="row" alignItems="center" spacing={2}>
            <Grid item>{category.icon}</Grid>
            <Grid item style={{ fontSize: '1rem' }}>
              {category.heading}
            </Grid>
          </Grid>
        </AccordionSummary>
        <AccordionDetails className={classes.accordionDetails}>
          <div>
            {Object.values(category.links).map((link, linkIndex) => (
              <React.Fragment key={linkIndex}>{renderNavLink(link)}</React.Fragment>
            ))}
          </div>
        </AccordionDetails>
      </Accordion>
    );
  }

  function renderCategory(categoryKey, category) {
    if (Object.keys(category.links).length === 1) {
      return renderNavLink(Object.values(category.links)[0]); // 1 child, don't use accordion menu
    } else {
      return renderAccordion(categoryKey, category); // > 1 child, use accordion menu
    }
  }

  function renderBreadcrumbs() {
    const pathnames = location.pathname.split('/').filter((x) => x);
    let breadcrumbs = [];

    Object.keys(categories).forEach((categoryKey) => {
      const category = categories[categoryKey];
      Object.values(category.links).forEach((link) => {
        if (location.pathname.includes(link.path)) {
          breadcrumbs.push(<Typography key={category.heading}>{category.heading}</Typography>);
          if (category.heading !== link.text) {
            breadcrumbs.push(<Typography key={link.path}>{link.text}</Typography>);
          }
        }
      });
    });

    return (
      <Breadcrumbs aria-label="breadcrumb" className={classes.breadcrumbs}>
        {breadcrumbs}
      </Breadcrumbs>
    );
  }

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar className={classes.toolBar}>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={() => setIsActive((current) => !current)}>
            <MenuIcon />
          </IconButton>
          <Typography
            variant="h6"
            noWrap
            className={[classes.pointer, classes.mobileHidden]}
            onClick={(event) => (window.location.href = '/')}
          >
            FleetIQ
          </Typography>
          <Typography
            style={{ marginLeft: 'auto', marginRight: 'auto' }}
            variant="h6"
            noWrap
            className={classes.pointer}
            onClick={(event) => (window.location.href = '/')}
          >
            {renderBreadcrumbs()}
          </Typography>
          {user && <h3 className={classes.mobileHidden}>{user.displayName}</h3>}
          {user && <AccountButton />}
        </Toolbar>
      </AppBar>
      {user && (
        <Drawer
          className={classes.drawer}
          style={{
            width: isActive ? 280 : 0,
            transition: 'width 0.1s',
          }}
          variant="permanent"
          classes={{
            paper: `${isActive ? classes.activeDrawerPaper : classes.inactiveDrawerPaper}`,
          }}
        >
          <Toolbar />
          <div className={classes.drawerContainer}>
            {Object.keys(categories).map((categoryKey, index) => (
              <React.Fragment key={index}>{renderCategory(categoryKey, categories[categoryKey])}</React.Fragment>
            ))}
          </div>
        </Drawer>
      )}
      <main className={classes.content}>{props.children}</main>
    </div>
  );
}
