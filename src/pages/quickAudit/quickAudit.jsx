import React, { useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import Grid from '@mui/material/Grid';
import { Box, TextField } from '@material-ui/core';

import Autocomplete from '@mui/material/Autocomplete';
export default function QuickAudit() {
  const { documents: vehicles } = useCollection('vehicles');
  const { documents: cvrts } = useCollection('cvrts');
  const { documents: fireextinguishers } = useCollection('fireextinguishers');
  const { documents: firstaidkits } = useCollection('firstaidkits');
  const { documents: psvs } = useCollection('psvs');
  const { documents: tachocalibrations } = useCollection('tachocalibrations');
  const { documents: taxes } = useCollection('taxes');

  const [expiryDates, setExpiryDates] = useState(Array(6).fill({ date: 'N/A', table: '' })); // Array to store expiry dates and table names
  const [allSelected, setAllSelected] = useState(false); // whether 'All' is selected in autocomplete

  const filteredVehicles = vehicles ? vehicles.sort((a, b) => a.registration.localeCompare(b.registration)) : [];

  // Helper to get expiry dates for a given registration across the different tables
  const getExpiryForRegistration = (registration) => {
    const tables = [
      { name: 'CVRT', data: cvrts },
      { name: 'Fire Extinguisher', data: fireextinguishers },
      { name: 'First Aid Kit', data: firstaidkits },
      { name: 'PSV', data: psvs },
      { name: 'Tacho Calibration', data: tachocalibrations },
      { name: 'Tax', data: taxes },
    ];

    return tables.map(({ data }) => {
      const matchingDocument = data?.find((doc) => doc.registration === registration);
      if (matchingDocument?.expiryDate) {
        const expiryDate = matchingDocument.expiryDate.toDate
          ? matchingDocument.expiryDate.toDate()
          : new Date(matchingDocument.expiryDate);
        return expiryDate;
      }
      return 'N/A';
    });
  };

  const handleRegistrationSelect = (registration) => {
    if (!registration) return;

    const tables = [
      { name: 'CVRT', data: cvrts },
      { name: 'Fire Extinguisher', data: fireextinguishers },
      { name: 'First Aid Kit', data: firstaidkits },
      { name: 'PSV', data: psvs },
      { name: 'Tacho Calibration', data: tachocalibrations },
      { name: 'Tax', data: taxes },
    ];

    const results = tables.map(({ name, data }) => {
      const matchingDocument = data?.find((doc) => doc.registration === registration);
      if (matchingDocument?.expiryDate) {
        // Convert Firestore Timestamp to a readable date string
        const expiryDate = matchingDocument.expiryDate.toDate
          ? matchingDocument.expiryDate.toDate() // Firestore Timestamp
          : new Date(matchingDocument.expiryDate); // Regular Date object
        return { date: expiryDate, table: name };
      }
      return { date: 'Not Found', table: name }; // Default if no expiryDate is found
    });

    setExpiryDates(results); // Update the expiryDates state
  };

  const getCellStyle = (expiryDate) => {
    if (expiryDate === 'N/A' || isNaN(new Date(expiryDate).getTime())) {
      return { backgroundColor: '#f0f0f0', color: 'black' }; // Default style for N/A or invalid dates
    }

    const currentDate = new Date();
    const daysDifference = (expiryDate - currentDate) / (1000 * 60 * 60 * 24); // Difference in days

    if (daysDifference < 0) {
      return { backgroundColor: 'red', color: 'white' }; // Expired
    } else if (daysDifference <= 30) {
      return { backgroundColor: 'orange', color: 'white' }; // Expiring soon
    } else {
      return { backgroundColor: 'green', color: 'white' }; // Valid
    }
  };

  const formatDateToDDMMYY = (date) => {
    const day = String(date.getDate()).padStart(2, '0'); // Ensure 2-digit day
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Ensure 2-digit month
    const year = String(date.getFullYear()).slice(-2); // Get last 2 digits of the year
    return `${day}/${month}/${year}`;
  };

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'left',
        justifyContent: 'left',
        gap: '30px',
        padding: '30px',
      }}
    >
      <h3>Select a vehicle to query all associated compliance data.</h3>
      <Autocomplete
        disablePortal
        options={['All', ...filteredVehicles.map((vehicle) => vehicle.registration)]}
        onChange={(event, value) => {
          console.log('Selected vehicle:', value);
          if (!value) {
            // Reset the grid to default values when input is cleared
            setExpiryDates(Array(6).fill({ date: 'N/A', table: '' }));
            setAllSelected(false);
          } else if (value === 'All') {
            setAllSelected(true);
            setExpiryDates(Array(6).fill({ date: 'N/A', table: '' }));
          } else {
            setAllSelected(false);
            handleRegistrationSelect(value); // Trigger database queries
          }
        }}
        clearOnEscape // Ensures clearing works with the Escape key
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Registration" />}
      />

      {allSelected ? (
        // Render table for all vehicles with 7 columns
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Registration</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>CVRT</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Fire Extinguisher</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>First Aid Kit</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>PSV</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tacho Calibration</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tax</th>
              </tr>
            </thead>
            <tbody>
              {filteredVehicles.map((vehicle) => {
                const expiries = getExpiryForRegistration(vehicle.registration);
                return (
                  <tr key={vehicle.id || vehicle.registration}>
                    <td style={{ border: '1px solid #ccc', padding: '8px' }}>{vehicle.registration}</td>
                    {expiries.map((date, i) => (
                      <td
                        key={i}
                        style={{
                          border: '1px solid #ccc',
                          padding: '8px',
                          textAlign: 'center',
                          ...getCellStyle(date),
                        }}
                      >
                        {date === 'N/A' || isNaN(new Date(date).getTime())
                          ? 'No Record'
                          : formatDateToDDMMYY(new Date(date))}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        expiryDates.some(({ date }) => date !== 'N/A') && ( // Only render the grid if there is valid data
          <Grid container spacing={0.75}>
            {expiryDates.map(({ date, table }, index) => (
              <Grid item xs={4} key={index}>
                <Box
                  style={{
                    height: '100px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid #ccc',
                    ...getCellStyle(date === 'N/A' || isNaN(new Date(date).getTime()) ? date : new Date(date)), // Apply conditional styling
                  }}
                >
                  <div>{table}</div>
                  <div>
                    {date === 'N/A' || isNaN(new Date(date).getTime())
                      ? 'No Record'
                      : new Date(date).toLocaleDateString('en-GB')}
                  </div>
                </Box>
              </Grid>
            ))}
          </Grid>
        )
      )}
    </Box>
  );
}
