import React from 'react';
import MaintenanceTable from '../../components/Tables/MaintenanceTable';
import { useFirestore } from '../../hooks/useFirestore';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { Button, IconButton, Tooltip, Box, Typography } from '@material-ui/core';
import MaintenanceDialog from '../../components/Dialogs/MaintenanceDialog';
import AssignmentIcon from '@material-ui/icons/Assignment';
import { useReducer, useEffect, useState } from 'react';
import NoteAltOutlinedIcon from '@mui/icons-material/NoteAltOutlined';
import FilePresentIcon from '@mui/icons-material/FilePresent';
import OKDialog from '../../components/Dialogs/OKDialog';
import { defaultDialogState } from '../../utils/defaultConfig';
import toast from 'react-hot-toast';

export default function Maintenance() {
  const collection = 'maintenance'; // THIS IS WHERE THE TABLE NAME GOES
  const { user } = useAuthContext();
  const { documents, error } = useCollection(collection);
  const { documents: vehiclesCollection } = useCollection('vehicles');
  const { deleteDocument } = useFirestore(collection);
  const currentDate = new Date();
  const [dialogState, setDialogState] = useState(defaultDialogState);

  const openAddDialog = () => setDialogState({ shown: true, edit: false, editData: null });
  const closeDialog = () => setDialogState({ shown: false, edit: false, editData: null });

  const handleDelete = async (selected) => {
    if (!selected || selected.length === 0) return;
    if (selected.length === 1) {
      if (window.confirm('Are you sure you want to delete this row?')) {
        try {
          await deleteDocument(selected[0].id);
          toast.success('Maintenance record deleted');
        } catch (err) {
          toast.error('Failed to delete record');
        }
      }
    } else {
      const confirm = prompt('Please enter "CONFIRM" to delete these rows.\nWARNING: This cannot be undone!');
      if (confirm && confirm.toLowerCase() === 'confirm') {
        try {
          for (const r of selected) await deleteDocument(r.id);
          toast.success(`${selected.length} records deleted`);
        } catch (err) {
          toast.error('Failed to delete records');
        }
      }
    }
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
      {documents && (
        <MaintenanceTable
          documents={documents}
          onAdd={openAddDialog}
          onEdit={(selected) => {
            if (selected && selected.length === 1) {
              setDialogState({ shown: true, edit: true, editData: selected[0] });
            }
          }}
          onDelete={handleDelete}
        />
      )}
      <MaintenanceDialog
        show={dialogState.shown}
        vehicles={vehiclesCollection}
        edit={dialogState.edit}
        editData={dialogState.editData}
        onClose={closeDialog}
      />
    </div>
  );
}
