import React from 'react';
import { useCollection } from '../../hooks/useCollection';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, Button } from '@material-ui/core';
import VisibilityIcon from '@mui/icons-material/Visibility';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import GenericTable from '../../components/Tables/GenericTable';

const formatDate = (timestamp) => {
  if (!timestamp) return '-';
  const date = new Date(timestamp.seconds * 1000);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export default function Walkarounds() {
  const { documents, error } = useCollection('walkarounds');
  const navigate = useNavigate();
  const reportButtonStyle = { textTransform: 'none' };
  const props = {
    collection: 'walkarounds',
    documents: documents || [],
    error: error,
    title: 'Driver Walkarounds',
    sortField: 3,
    sortAsc: false,
    disableAdd: true,
    disableEdit: true,
    inactiveLabel: 'Show Records for Inactive Vehicles',
    keyColumn: [{ key: 'registration', name: 'Registration' }],
    columns: [
      {
        name: 'Registration',
        selector: (row) => row.registration,

        sortable: true,
      },
      {
        name: 'Driver',
        selector: (row) => row.inspector || '-',

        sortable: true,
      },
      {
        name: 'Date',
        selector: (row) => row.inspectionDate?.seconds || 0,
        cell: (row) => formatDate(row.inspectionDate),

        sortable: true,
      },
      {
        name: 'Odometer',
        selector: (row) => row.odometer || '-',
        sortable: true,
      },

      {
        name: '',
        button: true,
        cell: (row) => (
          <Tooltip title="View Inspection">
            <Button
              variant="contained"
              color="primary"
              size="small"
              style={reportButtonStyle}
              onClick={() => navigate(`/walkaround/${row.id}`)}
            >
              View Report
            </Button>
          </Tooltip>
        ),
        sortable: false,
        width: '150px',
        ignoreRowClick: true,
        allowOverflow: true,
      },
    ],
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
        <Button
          variant="outlined"
          color="primary"
          startIcon={<QrCode2Icon />}
          onClick={() => navigate('/walkaround-qr')}
          style={{ textTransform: 'none' }}
        >
          Print QR Codes
        </Button>
      </div>
      {documents && <GenericTable {...props} />}
    </div>
  );
}
