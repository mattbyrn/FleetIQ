import React from 'react';
import DataTable from 'react-data-table-component';
import Card from '@material-ui/core/Card';
import SortIcon from '@material-ui/icons/ArrowDownward';
import { Typography } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import { useState } from 'react';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useFirestore } from '../../hooks/useFirestore';

const useStyles = makeStyles((theme) => ({
  style: {
    background: '#fafafa',
    fontSize: '1rem',
    width: '100%',
    height: '100%',
    fontFamily: 'Roboto, sans-serif',
    fontWeight: 400,
    lineHeight: 1.42857,
    textRendering: 'optimizeLegibility',
    width: '100%',
    height: '100%',
    display: 'flex',
    paddingBottom: '30px',
    flexDirection: 'column',
  },

  root: {
    width: '100%',
    marginBottom: theme.spacing(2),
  },

  paper: {
    marginBottom: theme.spacing(2),
  },

  table: {
    minWidth: 750,
  },

  visuallyHidden: {
    border: 0,
    clip: 'rect(0 0 0 0)',
    height: 1,
    margin: -1,
    overflow: 'hidden',
    padding: 0,
    position: 'absolute',
    top: 20,
    width: 1,
  },

  tableHeader: {
    display: 'flex',
    alignItems: 'center',
    columnGap: '1rem',
    paddingTop: '1rem',
    overflow: 'visible',
    marginBottom: '0.3rem',
    [theme.breakpoints.down(750)]: {
      display: 'none',
    },
  },

  selectedCount: {
    flex: '2 2 90%',
  },

  title: {
    flex: '1 1',
    whiteSpace: 'nowrap',
  },
}));

export default function InspectionsTable(props) {
  const classes = useStyles();

  return (
    <div className={classes.style}>
      <Card>
        <Paper>
          <DataTable
            title={props.title}
            columns={props.columns}
            defaultSortFieldId={props.sortField}
            defaultSortAsc={props.sortAsc}
            data={props.documents}
            sortIcon={<SortIcon />}
            striped
          />

          <Typography
            className={classes.title}
            style={{ color: 'Red', fontSize: '1.25rem', marginLeft: '20px' }}
          >
            {props.error}
          </Typography>
        </Paper>
      </Card>
    </div>
  );
}
