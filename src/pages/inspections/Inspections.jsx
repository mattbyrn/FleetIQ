import React, { useState } from 'react';
import InspectionsTable from '../../components/Tables/InspectionsTable';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { useFirestore } from '../../hooks/useFirestore';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { Box, Button, Tooltip, TextField } from '@material-ui/core';
import { useNavigate } from 'react-router-dom';
import CheckBoxOutlinedIcon from '@mui/icons-material/CheckBoxOutlined';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import InspectionDialog from '../../components/Dialogs/InspectionDialog';
import toast from 'react-hot-toast';

export default function Inspections() {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const { user } = useAuthContext();
  const navigate = useNavigate();
  const reportButtonStyle = { textTransform: 'none' };
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());
  const collection = 'inspections/' + datePickerValue.getFullYear() + '/' + months[datePickerValue.getMonth()];
  const { addDocument, updateDocument, response } = useFirestore(collection);

  const { documents, error } = useCollection(collection);

  const toggleComplete = async (row) => {
    const updatedRow = { ...row, complete: !row.complete };
    try {
      await updateDocument(row.id, updatedRow);
      toast.success(updatedRow.complete ? 'Marked complete' : 'Marked incomplete');
    } catch (err) {
      toast.error('Failed to update inspection');
    }
  };

  const [showInspectionDialog, setShowInspectionDialog] = useState(false);
  const [inspectionEditData, setInspectionEditData] = useState(null);

  const openInspectionDialog = (row) => {
    setInspectionEditData(row);
    setShowInspectionDialog(true);
  };

  const handleInspectionDialogClose = (result) => {
    setShowInspectionDialog(false);
    setInspectionEditData(null);
  };

  const props = {
    collection: collection,
    documents: documents,
    year: year,
    sortField: '2',
    sortAsc: true,
    error: error,
    title: 'Inspections | ' + months[datePickerValue.getMonth()] + ' ' + datePickerValue.getFullYear(),

    keyColumn: [
      {
        key: 'complete',
        name: 'Complete',
      },
    ],

    columns: [
      {
        name: 'Registration',
        selector: (row) => row.registration,
        sortable: true,
        // width: '200px',
      },
      {
        name: 'Inspection',
        selector: (row) => row.inspectionType,
        sortable: true,
      },
      {
        name: '',
        cell: (row) =>
          row.complete ? (
            <Button
              variant="contained"
              color="primary"
              size="small"
              style={reportButtonStyle}
              onClick={() =>
                navigate(
                  `/inspections/report?id=${row.id}&y=${year}&m=${
                    months[datePickerValue.getMonth()]
                  }&u=true&reg=${encodeURIComponent(row.registration || '')}`
                )
              }
            >
              View Report
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="small"
              style={reportButtonStyle}
              onClick={() =>
                navigate(
                  `/inspections/report?id=${row.id}&y=${year}&m=${
                    months[datePickerValue.getMonth()]
                  }&u=false&reg=${encodeURIComponent(row.registration || '')}`
                )
              }
            >
              Record Inspection
            </Button>
          ),
        sortable: false,
        width: '150px',
        ignoreRowClick: true,
        allowOverflow: true,
        button: true,
      },
    ],
  };

  const completedDocs = documents ? documents.filter((d) => d.complete) : [];
  const incompleteDocs = documents ? documents.filter((d) => !d.complete) : [];

  return (
    <div>
      {documents && (
        <>
          <div
            style={{
              maxWidth: '300px',
              marginBottom: '30px',
              marginTop: '30px',
              marginLeft: '10px',
              paddingLeft: '50px',
              paddingRight: '50px',
            }}
          >
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                views={['year', 'month']}
                openTo={'month'}
                label="Viewing Month"
                value={datePickerValue}
                style={{ maxWidth: '200px' }}
                onChange={(newValue) => {
                  setDatePickerValue(newValue);
                  setYear(newValue.getFullYear());
                  console.log(collection);
                }}
                renderInput={(params) => <TextField {...params} helperText={null} />}
              />
            </LocalizationProvider>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <InspectionsTable {...props} documents={incompleteDocs} title={'Incomplete Inspections'} />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <InspectionsTable {...props} documents={completedDocs} title={'Completed Inspections'} />
          </div>

          <InspectionDialog
            show={showInspectionDialog}
            edit={true}
            editData={inspectionEditData}
            collection={collection}
            tableRows={documents}
            callback={handleInspectionDialogClose}
            title="Inspection"
          />
        </>
      )}
    </div>
  );
}
