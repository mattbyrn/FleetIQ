import React from 'react';
import ReactDOM from 'react-dom';
import DataTable from 'react-data-table-component';
import Card from '@material-ui/core/Card';
import SortIcon from '@material-ui/icons/ArrowDownward';
import { Typography, Switch, FormControlLabel } from '@material-ui/core';
import { Box, Button, Tooltip, TextField } from '@material-ui/core';
import AddIcon from '@material-ui/icons/Add';
import { makeStyles } from '@material-ui/core/styles';
import { pink, yellow } from '@material-ui/core/colors';
import Paper from '@material-ui/core/Paper';
import { useState, useEffect, useContext } from 'react';
import EditIcon from '@material-ui/icons/Edit';
import DeleteIcon from '@material-ui/icons/Delete';
import FilterListIcon from '@material-ui/icons/FilterList';
import { useFirestore } from '../../hooks/useFirestore';
import { projectFirestore } from '../../firebase/config';
import VehicleDialog from '../Dialogs/VehicleDialog';
import GenericAdd from '../Dialogs/ComplianceDialog';
import MaintenanceDialog from '../Dialogs/MaintenanceDialog';
import DriverDialog from '../Dialogs/DriverDialog';
import { defaultDialogState } from '../../utils/defaultConfig';
import toast from 'react-hot-toast';
import TableHeader from './TableHeader';
import { renderExpiryDateCell } from '../../utils/DateCellRendering';
import { defaultDialogMapping } from '../../utils/defaultConfig';
import { useCollection } from '../../hooks/useCollection';

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

export default function GenericTable(props) {
  const classes = useStyles();
  const { documents: vehiclesCollection } = useCollection('vehicles');
  const [showInactive, setShowInactive] = useState(true);
  const [controlsDisabled, setControlsDisabled] = useState(false);
  const [clearRows, setClearRows] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [toggleCleared, setToggleCleared] = React.useState(false);
  const [columnFilters, setColumnFilters] = useState({});
  const [dialogState, setDialogState] = useState(defaultDialogState);
  const [dialogMapping] = useState(defaultDialogMapping);
  const { addDocument, deleteDocument, response } = useFirestore(
    props.collection
  );

  const dialogConfig = dialogMapping[props.collection];

  const closeDialog = () => {
    document.activeElement.blur();
    console.log('close dialog');
    setDialogState(defaultDialogState);
  };

  const filterTerm = (event) => setSearchTerm(event.target.value);

  const handleAdd = (event) => {
    console.log(props.title);
    event.currentTarget.blur(); // remove focus from add button to stop immediate reopening when using keyboard navigation

    if (dialogConfig) {
      console.log(dialogConfig);
      setDialogState({
        shown: true,
        edit: false,
        title: 'Record ' + dialogConfig.title,
        data: null,
        message: dialogConfig.message,
        flavour: dialogConfig.flavour,
        dialogType: dialogConfig.dialogType,
        collection: dialogConfig.collection,
      });
    } else {
      console.warn('No dialog configuration found for this title.');
    }
  };

  const handleEdit = (event) => {
    event.currentTarget.blur(); // remove focus from add button to stop immediate reopening when using keyboard navigation

    if (dialogConfig) {
      setDialogState({
        shown: true,
        edit: true,
        title: 'Update ' + dialogConfig.title,
        message: dialogConfig.message,
        flavour: dialogConfig.flavour,
        dialogType: dialogConfig.dialogType,
        collection: dialogConfig.collection,
      });
    } else {
      console.warn('No dialog configuration found for this title.');
    }
  };

  const clearSelectedRows = () => {
    setToggleCleared(!toggleCleared);
    selectedRows.length = 0;
  };

  const deleteRelatedComplianceRecords = async (registrations) => {
    const EXPIRY_COLLECTIONS = [
      'taxes',
      'cvrts',
      'psvs',
      'fireextinguishers',
      'firstaidkits',
      'tachocalibrations',
    ];

    const batch = projectFirestore.batch();
    let count = 0;

    for (const reg of registrations) {
      for (const col of EXPIRY_COLLECTIONS) {
        const snapshot = await projectFirestore
          .collection(col)
          .where('registration', '==', reg)
          .get();
        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          count++;
        });
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    return count;
  };

  const handleDelete = async () => {
    let deleted = false;

    if (selectedRows.length === 1) {
      if (window.confirm('Are you sure you want to delete this row?')) {
        try {
          await deleteDocument(selectedRows[0].id);
          toast.success('Record deleted');
          deleted = true;
        } catch (err) {
          toast.error('Failed to delete record');
        }
      }
    } else {
      var confirm = prompt(
        'Please enter "CONFIRM" to delete these rows. \nWARNING: This cannot be undone!'
      );
      if (confirm && confirm.toLowerCase() === 'confirm') {
        try {
          for (let i = 0; i < selectedRows.length; i++) {
            await deleteDocument(selectedRows[i].id);
          }
          toast.success(`${selectedRows.length} records deleted`);
          deleted = true;
        } catch (err) {
          toast.error('Failed to delete records');
        }
      }
    }

    if (deleted && props.collection === 'vehicles') {
      const regs = selectedRows.map((r) => r.registration);
      const regList = regs.join(', ');

      const wantCleanup = window.confirm(
        `Do you also want to delete all expiry records for ${regList}?\n\n` +
          `(Taxes, CVRT, PSV, Fire Extinguishers, First Aid, Tacho Calibrations)\n\n` +
          `Click Cancel to keep these records.`
      );

      if (wantCleanup) {
        const reallyConfirm = window.confirm(
          `Are you sure? This will permanently delete ALL expiry records for ${regList}. This cannot be undone.`
        );

        if (reallyConfirm) {
          try {
            const count = await deleteRelatedComplianceRecords(regs);
            if (count > 0) {
              toast.success(`${count} related compliance record(s) deleted`);
            } else {
              toast.success('No related compliance records found');
            }
          } catch (err) {
            toast.error('Failed to delete related compliance records');
          }
        }
      }
    }

    if (deleted) {
      clearSelectedRows();
    }
  };

  const handleFilter = () => {
    console.log(props.documents);
  };

  const selectedItemText = () => {
    if (selectedRows.length === 0) return '';
    if (selectedRows.length === 1) return '1 row selected';
    if (selectedRows.length > 1 && selectedRows.length < props.documents.length)
      return `${selectedRows.length} ${'rows selected'}`;
    if (selectedRows.length === props.documents.length)
      return 'All rows selected';

    return '';
  };

  const handleClearRows = () => {
    setClearRows(!clearRows);
  };

  const rangeFilter = (greaterThan, value, lessThan) => {
    if (value >= greaterThan && value <= lessThan) return true;

    return false;
  };

  const updatedColumns = props.columns.map((col) => {
    if (col.name === 'Expiration Date') {
      return {
        ...col,
        cell: renderExpiryDateCell, // Use the custom cell renderer ./utils/DateCellRendering.js
      };
    }
    return col;
  });

  const filterRows = () => {
    return props.documents.filter((row) => {
      // Allow callers to provide a custom inactive filter. Signature: (row, showInactive) => boolean
      if (props.inactiveFilter) {
        try {
          if (!props.inactiveFilter(row, showInactive)) return false;
        } catch (err) {
          // if the provided filter throws, fall back to default behavior
          console.warn('inactiveFilter threw an error', err);
        }
      }

      // Check if there's a matching vehicle document
      const matchingVehicle = vehiclesCollection?.find(
        (v) => v.registration === row.registration
      );

      // If showInactive is false, filter out documents with matching vehicle marked inactive
      if (!showInactive && matchingVehicle?.inactive) {
        return false;
      }

      // Match search term against key column
      const rowAlphanumeric = `${row[props.keyColumn[0].key]}`
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '');

      const searchAlphanumeric = searchTerm
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]/g, '');

      return rowAlphanumeric.includes(searchAlphanumeric);
    });
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
            disableAdd={props.disableAdd}
            disableEdit={props.disableEdit}
            selectedRows={selectedRows}
            classes={classes}
          />
          {!props.hideInactiveToggle && (
            <FormControlLabel
              control={
                <Switch
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  color="primary"
                />
              }
              label={props.inactiveLabel || 'Show Inactive Vehicles'}
              style={{ marginLeft: '20px', marginBottom: '10px' }}
            />
          )}
          <DataTable
            columns={updatedColumns}
            onSelectedRowsChange={(e) => setSelectedRows(e.selectedRows)}
            data={filterRows()}
            sortIcon={<SortIcon />}
            defaultSortFieldId={props.sortField}
            defaultSortAsc={props.sortAsc}
            pagination
            paginationRowsPerPageOptions={[10, 25, 50]}
            paginationPerPage={25}
            paginationComponentOptions={{
              selectAllRowsItem: true,
              selectAllRowsItemText: 'All',
            }}
            clearSelectedRows={toggleCleared}
            selectableRows
            striped
          />

          {dialogState.dialogType === 'vehicle' && (
            <VehicleDialog
              show={dialogState.shown}
              title={dialogState.title}
              collection={dialogState.collection}
              edit={dialogState.edit}
              editData={dialogState.edit ? selectedRows[0] : null}
              message={dialogState.message}
              flavour={dialogState.flavour}
              callback={(res) => {
                if (res === 'OK') {
                  clearSelectedRows();
                }
                closeDialog();
              }}
            />
          )}

          {dialogState.dialogType === 'generic' && (
            <GenericAdd
              show={dialogState.shown}
              collection={dialogState.collection} // Now includes collection
              tableRows={props.documents} // passing all documents just to remove registrations that are already on the table from the drop down? not ideal :/
              title={dialogState.title}
              edit={dialogState.edit}
              vehicles={vehiclesCollection} // Pass the vehicles collection to the dialog
              editData={dialogState.edit ? selectedRows[0] : null}
              message={dialogState.message}
              flavour={dialogState.flavour}
              callback={(res) => {
                if (res === 'OK') {
                  clearSelectedRows();
                }
                closeDialog();
              }}
            />
          )}

          {dialogState.dialogType === 'driver' && (
            <DriverDialog
              show={dialogState.shown}
              title={dialogState.title}
              collection={dialogState.collection}
              edit={dialogState.edit}
              editData={dialogState.edit ? selectedRows[0] : null}
              callback={(res) => {
                if (res === 'OK') {
                  clearSelectedRows();
                }
                closeDialog();
              }}
            />
          )}

          {dialogState.dialogType === 'maintenance' && (
            <MaintenanceDialog
              show={dialogState.shown}
              vehicles={vehiclesCollection}
              onClose={() => {
                closeDialog();
              }}
            />
          )}

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
