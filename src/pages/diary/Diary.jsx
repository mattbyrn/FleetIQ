import React from 'react';
import DiaryTable from '../../components/Tables/DiaryTable';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { useState, useMemo } from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import {
  Box,
  Tooltip,
  TextField,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Typography,
} from '@material-ui/core';
import LoopIcon from '@mui/icons-material/Loop';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { DIARY_COLLECTION, MONTHS, resolveStopsDisplay, resolveContactDisplay, deriveJobLabel } from '../../utils/diaryHelpers';
export default function Diary() {
  const { user } = useAuthContext();
  const [datePickerValue, setDatePickerValue] = useState(new Date());
  const [year, setYear] = useState(new Date().getFullYear());

  const constraints = useMemo(() => {
    const monthStart = new Date(datePickerValue.getFullYear(), datePickerValue.getMonth(), 1);
    const nextMonthStart = new Date(datePickerValue.getFullYear(), datePickerValue.getMonth() + 1, 1);
    return [['date', '>=', monthStart], ['date', '<', nextMonthStart]];
  }, [datePickerValue]);

  var { documents, error } = useCollection(DIARY_COLLECTION, constraints);

  let props = {
    documents: documents,
    year: year,
    error: error,
    title: 'Diary | ' + MONTHS[datePickerValue.getMonth()] + ' ' + datePickerValue.getFullYear(),

    keyColumn: [
      {
        key: 'client',
        name: 'Client',
      },
    ],

    columns: [
      {
        name: 'Date',
        selector: (row) => {
          const ts = row.date || row.startDate;
          if (ts?.seconds) {
            return new Intl.DateTimeFormat('en-GB').format(new Date(ts.seconds * 1000));
          }
          return '-';
        },
        sortable: true,
        sortFunction: (a, b) => {
          const aTs = a.date || a.startDate;
          const bTs = b.date || b.startDate;
          return (aTs?.seconds || 0) - (bTs?.seconds || 0);
        },
        maxWidth: '150px',
      },
      {
        name: 'Client',
        selector: (row) =>
          row.client ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {row.jobGroupId && row.isRepeating && (
                <Tooltip title="Repeating" placement="top">
                  <LoopIcon style={{ fontSize: '1rem', color: '#1976d2' }} />
                </Tooltip>
              )}
              {row.jobGroupId && !row.isRepeating && (
                <Tooltip title="Multi-Day" placement="top">
                  <DateRangeIcon style={{ fontSize: '1rem', color: '#7b1fa2' }} />
                </Tooltip>
              )}
              {row.individuallyEdited === true && (
                <span style={{ color: '#e65100', fontWeight: 700, fontSize: '0.85rem' }}>*</span>
              )}
              {row.client}
            </span>
          ) : (
            '-'
          ),
        sortable: true,
      },
      {
        name: 'Driver',
        selector: (row) => row.driverName || '-',
        sortable: true,
        maxWidth: '180px',
      },
      {
        name: 'Vehicle',
        selector: (row) => row.vehicleRegistration || '-',
        sortable: true,
        maxWidth: '180px',
      },
      {
        name: 'Start',
        selector: (row) => resolveStopsDisplay(row).start || '-',
        sortable: true,
        maxWidth: '180px',
      },
      {
        name: 'Stop',
        selector: (row) => resolveStopsDisplay(row).stop || '-',
        sortable: true,
        maxWidth: '180px',
      },
      {
        name: 'Start Time',
        selector: (row) => resolveStopsDisplay(row).startTime || '-',
        sortable: true,
        maxWidth: '150px',
      },
      {
        name: 'End Time',
        selector: (row) => resolveStopsDisplay(row).endTime || '-',
        sortable: true,
        maxWidth: '150px',
      },
      {
        name: 'PAX',
        selector: (row) => (row.pax ? row.pax : '-'),
        sortable: false,
        maxWidth: '60px',
      },
    ],

    expandedComponent: ({ data }) => {
      const display = resolveStopsDisplay(data);
      const contact = resolveContactDisplay(data);
      const rows = [
        { label: 'Job Type', value: deriveJobLabel(data) },
        { label: 'Contact Name', value: contact.contactName },
        { label: 'Contact Phone', value: contact.contactPhone },
        { label: 'Contact Email', value: contact.contactEmail },
        { label: 'Start', value: display.start },
        { label: 'Stop', value: display.stop },
        { label: 'Start Time', value: display.startTime },
        { label: 'End Time', value: display.endTime },
        { label: 'Quoted', value: data.quote },
        { label: 'Comments', value: data.comment },
        { label: 'Recorded By', value: data.addedBy },
        { label: 'Recorded At', value: data.recordedAt },
      ];

      const stopsArr = data.stops || [];

      return (
        <Box style={{ padding: '12px 24px' }}>
          <Table size="small" style={{ maxWidth: 500 }}>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.label}>
                  <TableCell style={{ fontWeight: 600, width: 140, border: 'none' }}>{r.label}</TableCell>
                  <TableCell style={{ border: 'none' }}>{r.value || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {stopsArr.length > 0 && (
            <Box style={{ marginTop: 16 }}>
              <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: 4 }}>
                Itinerary Stops
              </Typography>
              <Table size="small" style={{ maxWidth: 500 }}>
                <TableHead>
                  <TableRow>
                    <TableCell style={{ fontWeight: 600, width: 30, border: 'none' }}>#</TableCell>
                    <TableCell style={{ fontWeight: 600, border: 'none' }}>Location</TableCell>
                    <TableCell style={{ fontWeight: 600, width: 60, border: 'none' }}>Time</TableCell>
                    <TableCell style={{ fontWeight: 600, border: 'none' }}>Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {stopsArr.map((stop, i) => (
                    <TableRow key={i}>
                      <TableCell style={{ color: '#1976d2', fontWeight: 700, border: 'none' }}>{i + 1}</TableCell>
                      <TableCell style={{ border: 'none' }}>{stop.location || '-'}</TableCell>
                      <TableCell style={{ border: 'none' }}>{stop.time || '-'}</TableCell>
                      <TableCell style={{ border: 'none', fontStyle: 'italic', color: '#666' }}>
                        {stop.notes || ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Box>
      );
    },
  };

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
                }}
                renderInput={(params) => <TextField {...params} helperText={null} />}
              />
            </LocalizationProvider>
          </div>

          <DiaryTable {...props} />
        </>
      )}
    </div>
  );
}
