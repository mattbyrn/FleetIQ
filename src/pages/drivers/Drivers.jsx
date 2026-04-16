import React from 'react';
import GenericTable from '../../components/Tables/GenericTable';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { IconButton, Tooltip } from '@material-ui/core';
import { useState } from 'react';
import OKDialog from '../../components/Dialogs/OKDialog';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import { defaultDialogState } from '../../utils/defaultConfig';
import { useDocument } from '../../hooks/useDocument';

const currentDate = new Date();
const warningThreshold = new Date();
warningThreshold.setDate(currentDate.getDate() + 30);

const renderDateCell = (fieldName) => (row) => {
  const rawDate = row[fieldName];
  if (!rawDate) return <div>-</div>;

  let date;
  try {
    if (rawDate.toDate) date = rawDate.toDate();
    else if (rawDate.seconds) date = new Date(rawDate.seconds * 1000);
    else date = new Date(rawDate);
  } catch (e) {
    return <div>-</div>;
  }
  const isOverdue = date <= currentDate;
  const isWarning = date > currentDate && date <= warningThreshold;

  let className = '';
  if (isOverdue) {
    className = 'overdue';
  } else if (isWarning) {
    className = 'overdue-warning';
  }

  return <div className={className}>{new Intl.DateTimeFormat('en-GB').format(date)}</div>;
};

const renderVettingDateCell = (typeName) => (row) => {
  const rawDate = row.vettings?.[typeName]?.expiry;
  if (!rawDate) return <div>-</div>;

  let date;
  try {
    if (rawDate.toDate) date = rawDate.toDate();
    else if (rawDate.seconds) date = new Date(rawDate.seconds * 1000);
    else date = new Date(rawDate);
  } catch (e) {
    return <div>-</div>;
  }
  const isOverdue = date <= currentDate;
  const isWarning = date > currentDate && date <= warningThreshold;

  let className = '';
  if (isOverdue) {
    className = 'overdue';
  } else if (isWarning) {
    className = 'overdue-warning';
  }

  return <div className={className}>{new Intl.DateTimeFormat('en-GB').format(date)}</div>;
};

export default function Drivers() {
  const collection = 'drivers';
  const { user } = useAuthContext();
  const { documents, error } = useCollection(collection);
  const { document: vettingTypesDoc } = useDocument('settings', 'vettingTypes');
  const [dialogState, setDialogState] = useState(defaultDialogState);

  const vettingTypes = vettingTypesDoc?.types ?? [];

  let props = {
    collection: collection,
    documents: documents,
    error: error,
    title: 'Drivers',
    hideInactiveToggle: true,

    keyColumn: [
      {
        key: 'name',
        name: 'Name',
      },
    ],

    columns: [
      {
        name: 'Name',
        selector: (row) => row.name || '-',
        sortable: true,
      },
      {
        name: 'Licence Expiry',
        cell: renderDateCell('licenceExpiry'),
        sortable: false,
      },
      {
        name: 'CPC Expiry',
        cell: renderDateCell('cpcExpiry'),
        sortable: false,
      },
      {
        name: 'PSV Expiry',
        cell: renderDateCell('psvExpiry'),
        sortable: false,
      },
      {
        name: 'SPSV Expiry',
        cell: renderDateCell('spsvExpiry'),
        sortable: false,
      },
      ...vettingTypes.map((type) => ({
        name: `${type} Expiry`,
        cell: renderVettingDateCell(type),
        sortable: false,
      })),
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
            <div style={{ textAlign: 'center' }}>-</div>
          ),
        sortable: false,
        width: '60px',
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
                    title: row.name,
                  })
                }
              >
                <NoteAltOutlinedIcon />
              </IconButton>
            </Tooltip>
          ) : (
            <div style={{ textAlign: 'center' }}>-</div>
          ),
        sortable: false,
        width: '60px',
      },
    ],
  };
  return (
    <div>
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
