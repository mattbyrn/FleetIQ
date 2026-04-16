import React from 'react';
import DataTable from 'react-data-table-component';
import Card from '@material-ui/core/Card';
import SortIcon from '@material-ui/icons/ArrowDownward';
import { Typography } from '@material-ui/core';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { pink, yellow } from '@material-ui/core/colors';
import Paper from '@material-ui/core/Paper';
import { useState } from 'react';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { projectFirestore } from '../../firebase/config';
import { DIARY_COLLECTION, fetchJobGroup } from '../../utils/diaryHelpers';
import JobDialog from '../Dialogs/JobDialog';
import TableHeader from './TableHeader';
import toast from 'react-hot-toast';

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
    display: 'flex',
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

  editButton: {
    backgroundColor: yellow[800],
    borderColor: yellow[800],
    color: 'white',
    '&:hover': {
      backgroundColor: yellow[900],
    },
  },

  filterButton: {
    backgroundColor: pink[600],
    borderColor: pink[600],
    color: 'white',
    '&:hover': {
      backgroundColor: pink[700],
    },
  },

  searchBar: {
    flex: '1 1 35%',
    [theme.breakpoints.down(1100)]: {
      flex: '1 1 45%',
    },

    '& label': {
      paddingRight: '25px',
      [theme.breakpoints.down(1100)]: {
        fontSize: '0.75rem',
      },
    },
  },
}));

function sortByRecent(a, b) {
  const aSeconds = a.createdAt?.seconds || 0;
  const bSeconds = b.createdAt?.seconds || 0;
  if (aSeconds < bSeconds) return 1;
  if (aSeconds > bSeconds) return -1;
  return 0;
}

function toDateTime(secs) {
  var t = new Date(1970, 0, 1);
  var localOffset = t.getTimezoneOffset() * 1000;
  secs += localOffset / 1000;
  t.setSeconds(secs);
  var options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  var DateString = t.toLocaleDateString('en-GB', options);
  var TimeString = t.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return DateString + ' ' + TimeString;
}

export default function DiaryTable(props) {
  const classes = useStyles();
  const [controlsDisabled, setControlsDisabled] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toggleCleared, setToggleCleared] = React.useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const { user } = useAuthContext();
  const { deleteDocument } = useFirestore(DIARY_COLLECTION);

  const filterTerm = (event) => setSearchTerm(event.target.value);

  const [dialogState, setDialogState] = useState({
    open: false,
    mode: 'add',
    groupDocs: [],
    editData: null,
  });

  const handleDelete = async () => {
    if (selectedRows.length === 0) return;

    if (selectedRows.length === 1) {
      const row = selectedRows[0];
      const hasGroup = !!row.jobGroupId;

      if (hasGroup) {
        const deleteGroup = window.confirm(
          'This entry is part of a multi-day job.\n\n' +
            'Click OK to delete ALL days in this job group.\n' +
            'Click Cancel to delete only this single day.'
        );

        if (deleteGroup) {
          await deleteJobGroup(row.jobGroupId);
        } else {
          if (window.confirm('Delete this single day entry?')) {
            deleteDocument(row.id);
            toast.success('Entry deleted');
          }
        }
      } else {
        if (window.confirm('Are you sure you want to delete this row?')) {
          deleteDocument(row.id);
          toast.success('Entry deleted');
        }
      }
    } else {
      var confirm = prompt(
        'Please enter "CONFIRM" to delete these rows. \nWARNING: This cannot be undone!'
      );
      if (confirm && confirm.toLowerCase() === 'confirm') {
        for (let i = 0; i < selectedRows.length; i++) {
          deleteDocument(selectedRows[i].id);
        }
        toast.success(`${selectedRows.length} entries deleted`);
      }
    }
    setToggleCleared(!toggleCleared);
    setSelectedRows([]);
  };

  const deleteJobGroup = async (jobGroupId) => {
    const snapshot = await projectFirestore
      .collection(DIARY_COLLECTION)
      .where('jobGroupId', '==', jobGroupId)
      .get();
    if (!snapshot.empty) {
      const batch = projectFirestore.batch();
      snapshot.docs.forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
      toast.success(`Deleted ${snapshot.size} entries from job group`);
    }
  };

  const handleAdd = () => {
    setDialogState({
      open: true,
      mode: 'add',
      groupDocs: [],
      editData: null,
    });
  };

  const handleEdit = async () => {
    if (selectedRows.length !== 1) return;
    const selected = selectedRows[0];

    if (selected.jobGroupId) {
      // Auto-detect group → open JobDialog in editGroup mode
      setControlsDisabled(true);
      try {
        const docs = await fetchJobGroup(selected.jobGroupId);
        setDialogState({
          open: true,
          mode: 'editGroup',
          groupDocs: docs,
          editData: null,
        });
      } catch (err) {
        toast.error('Failed to fetch job group');
      } finally {
        setControlsDisabled(false);
      }
    } else {
      // Standalone → open JobDialog in editSingle mode
      setDialogState({
        open: true,
        mode: 'editSingle',
        groupDocs: [],
        editData: { ...selected, _collectionPath: DIARY_COLLECTION },
      });
    }
  };

  const handleFilter = () => {};

  const selectedItemText = () => {
    if (selectedRows.length === 0) return '';
    if (selectedRows.length === 1) return '1 row selected';
    if (selectedRows.length > 1 && selectedRows.length < props.documents.length)
      return `${selectedRows.length} rows selected`;
    if (selectedRows.length === props.documents.length)
      return 'All rows selected';
    return '';
  };

  const rangeFilter = (greaterThan, value, lessThan) => {
    if (value >= greaterThan && value <= lessThan) return true;
    return false;
  };

  const filterRows = () => {
    props.documents.sort(sortByRecent);

    for (let i = 0; i < props.documents.length; i++) {
      props.documents[i].recordedAt = props.documents[i].createdAt?.seconds
        ? toDateTime(props.documents[i].createdAt.seconds)
        : '-';
    }

    let res = props.documents.filter((row) => {
      if (
        !`${row[props.keyColumn[0].key]}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase())
      )
        return false;

      let isValid = true;

      Object.keys(columnFilters).forEach((filterKey) => {
        let filter = columnFilters[filterKey];
        if (!filter.enabled) return;

        if (filter.type === 'text') {
          if (
            !`${row[filterKey]}`
              .toLowerCase()
              .includes(filter.filterValue.includes.toLowerCase())
          ) {
            isValid = false;
          }
          return;
        } else if (filter.type === 'numeric') {
          if (
            !rangeFilter(
              filter.filterValue.greaterThan,
              row[filterKey],
              filter.filterValue.lessThan
            )
          )
            isValid = false;
          return;
        } else if (filter.type === 'date') {
          if (
            !rangeFilter(
              filter.filterValue.from,
              new Date(row[filterKey]),
              filter.filterValue.to
            )
          )
            isValid = false;
          return;
        }
      });

      return isValid;
    });
    return res;
  };

  return (
    <div className={classes.style}>
      <Card>
        <Paper>
          <TableHeader
            title={props.title}
            selectedItemText={selectedItemText}
            searchColumn={props.keyColumn[0].key}
            searchTerm={searchTerm}
            filterTerm={filterTerm}
            handleAdd={handleAdd}
            handleDelete={handleDelete}
            handleEdit={handleEdit}
            handleFilter={handleFilter}
            controlsDisabled={controlsDisabled}
            selectedRows={selectedRows}
            classes={classes}
          />

          <DataTable
            columns={props.columns}
            onSelectedRowsChange={(e) =>
              setSelectedRows(e.selectedRows)
            }
            data={filterRows()}
            sortIcon={<SortIcon />}
            clearSelectedRows={toggleCleared}
            selectableRows
            striped
            expandableRows
            expandableRowsComponent={props.expandedComponent}
          />

          <JobDialog
            open={dialogState.open}
            mode={dialogState.mode}
            groupDocs={dialogState.groupDocs}
            editData={dialogState.editData}
            onClose={() =>
              setDialogState({ open: false, mode: 'add', groupDocs: [], editData: null })
            }
            onSaved={() => {
              setDialogState({ open: false, mode: 'add', groupDocs: [], editData: null });
              setToggleCleared(!toggleCleared);
              setSelectedRows([]);
            }}
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
