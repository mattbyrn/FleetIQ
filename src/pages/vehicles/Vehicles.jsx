import React from 'react';
import GenericTable from '../../components/Tables/GenericTable';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { Button, IconButton, Tooltip } from '@material-ui/core';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { useReducer, useEffect, useState } from 'react';
import OKDialog from '../../components/Dialogs/OKDialog';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import { defaultDialogState } from '../../utils/defaultConfig';

export default function Vehicles() {
  const collection = 'vehicles'; // THIS IS WHERE THE TABLE NAME GOES
  const { user } = useAuthContext();
  const { documents, error } = useCollection(collection);
  const [dialogState, setDialogState] = useState(defaultDialogState);

  let props = {
    collection: collection,
    documents: documents,
    error: error,
    title: 'Vehicles',
    sortField: 1,
    sortAsc: false,
    hideInactiveToggle: true,

    keyColumn: [
      {
        key: 'registration',
        name: 'Registration',
      },
    ],

    columns: [
      {
        name: 'Registration',
        selector: (row) => row.registration,
        maxWidth: '180px',
        sortable: true,
      },
      {
        name: 'Make',
        selector: (row) => row.make || '-',
        maxWidth: '180px',
        sortable: true,
      },
      {
        name: 'Model',
        selector: (row) => row.model || '-',
        maxWidth: '180px',
        sortable: true,
      },
      {
        name: 'Seats',
        selector: (row) => Number(row.capacity) || 0,
        cell: (row) => row.capacity || '-',
        maxWidth: '80px',
        sortable: true,
      },
      {
        name: 'VIN',
        selector: (row) => row.vin || '-',
        sortable: false,
      },
      {
        name: '',
        button: true,
        cell: (row) =>
          row.fileUrl ? (
            <a target="_blank" href={row.fileUrl} rel="noopener noreferrer">
              <Tooltip title="Open Document">
                <IconButton
                  style={{
                    borderRadius: '5px',
                    padding: '5px',
                  }}
                >
                  <FilePresentIcon />
                </IconButton>
              </Tooltip>
            </a>
          ) : (
            ''
          ),
        sortable: false,
        width: '10%',
      },
      {
        name: '',
        button: true,
        cell: (row) =>
          row.comment ? (
            <Tooltip title="View Notes">
              <IconButton
                color="secondary"
                style={{
                  borderRadius: '5px',
                  padding: '5px',
                }}
                onClick={() =>
                  setDialogState({
                    shown: true,
                    message: row.comment,
                    title: row.registration,
                  })
                }
              >
                <NoteAltOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            ''
          ),
        sortable: false,
        width: '10%',
      },

      // {
      //   name: "More Info",
      //   cell: (row) => (
      //       <Button
      //           variant="contained"
      //           size="small"
      //           color="primary"
      //           onClick={() => console.log("")}
      //           aria-label="add"
      //           startIcon={ <AssignmentIcon style={{marginLeft: "25%"}}/> }
      //           >
      //       </Button>
      //   ),
      //   sortable: false,
      // },
      // {
      //   name: "Time/Date Recorded",
      //   selector: (row) => row.recordedAt,
      //   sortable: true
      // },
    ],
  };
  return (
    <div>
      {' '}
      <OKDialog
        show={dialogState.shown}
        message={dialogState.message}
        title={dialogState.title}
        callback={(res) => {
          setDialogState({ shown: false });
        }}
      ></OKDialog>
      {documents && <GenericTable {...props} />}
    </div>
  );
}
