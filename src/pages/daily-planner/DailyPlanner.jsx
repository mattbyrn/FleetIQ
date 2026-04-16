import React, { useState, useMemo } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { DIARY_COLLECTION, MONTHS, resolveStopsDisplay } from '../../utils/diaryHelpers';
import GanttChart from '../../components/Charts/GanttChart';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { TextField, Typography, Paper } from '@material-ui/core';

function isSameDay(ts, targetDate) {
  if (!ts?.seconds) return false;
  const docDate = new Date(ts.seconds * 1000);
  return (
    docDate.getFullYear() === targetDate.getFullYear() &&
    docDate.getMonth() === targetDate.getMonth() &&
    docDate.getDate() === targetDate.getDate()
  );
}

export default function DailyPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());

  const constraints = useMemo(() => {
    const monthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const nextMonthStart = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
    return [['date', '>=', monthStart], ['date', '<', nextMonthStart]];
  }, [selectedDate]);

  const { documents, error } = useCollection(DIARY_COLLECTION, constraints);

  const filteredJobs = useMemo(() => {
    if (!documents) return [];
    return documents
      .filter((doc) => {
        const dateField = doc.date || doc.startDate;
        return isSameDay(dateField, selectedDate);
      })
      .map((doc) => {
        const display = resolveStopsDisplay(doc);
        return {
          ...doc,
          startTime: doc.startTime || display.startTime,
          endTime: doc.endTime || display.endTime,
        };
      });
  }, [documents, selectedDate]);

  const formattedDate = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(selectedDate);

  return (
    <div>
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
            label="Select Date"
            value={selectedDate}
            onChange={(newValue) => {
              if (newValue) setSelectedDate(newValue);
            }}
            renderInput={(params) => (
              <TextField {...params} helperText={null} />
            )}
          />
        </LocalizationProvider>
      </div>

      <Paper style={{ margin: '0 10px', padding: '16px' }}>
        <Typography
          variant="h6"
          style={{ fontWeight: 400, marginBottom: '8px' }}
        >
          Daily Planner &mdash; {formattedDate}
        </Typography>

        {error && (
          <Typography style={{ color: 'red' }}>{error}</Typography>
        )}

        <GanttChart jobs={filteredJobs} />
      </Paper>
    </div>
  );
}
