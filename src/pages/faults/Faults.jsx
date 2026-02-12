import React from 'react';
import GenericTable from '../../components/Tables/GenericTable';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { Button, IconButton, Tooltip } from '@material-ui/core';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { useReducer, useEffect, useState } from 'react';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import OKDialog from '../../components/Dialogs/OKDialog';
import { defaultDialogState } from '../../utils/defaultConfig';

export default function Faults() {
  const collection = 'faults'; // THIS IS WHERE THE TABLE NAME GOES
  const { user } = useAuthContext();
  const { documents, error } = useCollection(collection);
  const currentDate = new Date();
  const [dialogState, setDialogState] = useState(defaultDialogState);

  let props = {
    collection: collection,
    documents: documents,
    error: error,
    title: 'Faults',
    sortField: 1,
    sortAsc: false,
    inactiveLabel: 'Show resolved faults',
    inactiveFilter: (row, showResolved) => {
      if (!showResolved && row && row.status && row.status.toLowerCase() === 'resolved') return false;
      return true;
    },
    // disable add/edit for faults
    disableAdd: true,
    disableEdit: true,

    keyColumn: [
      {
        key: 'registration',
        name: 'Registration',
      },
    ],

    columns: [
      {
        name: 'Inspection Date',
        width: '200px',
        selector: (row) => {
          if (!row || !row.inspectionDate) return 0;
          try {
            if (row.inspectionDate.seconds !== undefined) return row.inspectionDate.seconds * 1000;
            if (row.inspectionDate.toDate) return row.inspectionDate.toDate().getTime();
            const d = new Date(row.inspectionDate);
            return d.getTime() || 0;
          } catch (err) {
            return 0;
          }
        },
        // display formatted date
        cell: (row) => {
          if (!row || !row.inspectionDate) return '—';
          try {
            let d;
            if (row.inspectionDate.seconds !== undefined) d = new Date(row.inspectionDate.seconds * 1000);
            else if (row.inspectionDate.toDate) d = row.inspectionDate.toDate();
            else d = new Date(row.inspectionDate);
            if (!d || Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              timeZone: 'UTC',
            });
          } catch (err) {
            return '—';
          }
        },
        sortable: true,
      },

      {
        name: 'Registration',
        selector: (row) => row.vehicle,
        sortable: true,
        width: '160px',
      },

      {
        name: 'Category',
        selector: (row) => row.item,
        sortable: false,
        width: '270px',
        cell: (row) =>
          row && row.item ? (
            <Tooltip title={row.item}>
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle',
                }}
              >
                {row.item}
              </span>
            </Tooltip>
          ) : (
            '—'
          ),
      },
      {
        name: 'Description',
        selector: (row) => row.description,
        sortable: false,
        cell: (row) =>
          row && row.description ? (
            <Tooltip title={row.description}>
              <span
                style={{
                  display: 'inline-block',
                  maxWidth: '100%',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  verticalAlign: 'middle',
                }}
              >
                {row.description}
              </span>
            </Tooltip>
          ) : (
            '—'
          ),
      },

      {
        name: 'Inspector',
        selector: (row) => row.inspector,
        sortable: false,
        width: '170px',
      },
      {
        name: 'Status',
        selector: (row) => row.status,
        sortable: false,
        width: '110px',
      },
      {
        name: 'Maintenance Date',
        width: '210px',
        selector: (row) => {
          if (!row || !row.maintenanceDate) return 0;
          try {
            if (row.maintenanceDate.seconds !== undefined) return row.maintenanceDate.seconds * 1000;
            if (row.maintenanceDate.toDate) return row.maintenanceDate.toDate().getTime();
            const d = new Date(row.maintenanceDate);
            return d.getTime() || 0;
          } catch (err) {
            return 0;
          }
        },
        cell: (row) => {
          if (!row || !row.maintenanceDate) return '—';
          try {
            let d;
            if (row.maintenanceDate.seconds !== undefined) d = new Date(row.maintenanceDate.seconds * 1000);
            else if (row.maintenanceDate.toDate) d = row.maintenanceDate.toDate();
            else d = new Date(row.maintenanceDate);
            if (!d || Number.isNaN(d.getTime())) return '—';
            return d.toLocaleDateString('en-GB', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
              timeZone: 'UTC',
            });
          } catch (err) {
            return '—';
          }
        },
        sortable: true,
      },
      {
        name: 'Technician',
        selector: (row) => row.maintenanceTechnician || '—',
        sortable: false,
        width: '170px',
      },

      // {
      //   name: '—',
      //   button: true,
      //   cell: (row) =>
      //     row.fileUrl ? (
      //       <a target="_blank" href={row.fileUrl} rel="noopener noreferrer">
      //         <Tooltip title="Open Document">
      //           <IconButton
      //             style={{
      //               borderRadius: '5px',
      //               padding: '5px',
      //             }}
      //           >
      //             <FilePresentIcon />
      //           </IconButton>
      //         </Tooltip>
      //       </a>
      //     ) : (
      //       '—'
      //     ),
      //   sortable: false,
      //   width: '10%',
      // },
      // {
      //   name: '—',
      //   button: true,
      //   cell: (row) =>
      //     row.comment ? (
      //       <Tooltip title="View Notes">
      //         <IconButton
      //           color="secondary"
      //           style={{
      //             borderRadius: '5px',
      //             padding: '5px',
      //           }}
      //           onClick={() =>
      //             setDialogState({
      //               shown: true,
      //               message: row.comment,
      //               title: row.registration,
      //             })
      //           }
      //         >
      //           <NoteAltOutlinedIcon />
      //         </IconButton>
      //       </Tooltip>
      //     ) : (
      //       '—'
      //     ),
      //   sortable: false,
      //   width: '10%',
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
