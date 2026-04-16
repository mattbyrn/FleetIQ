import React, { useState } from 'react';
import { useCollection } from '../../hooks/useCollection';
import { projectFirestore } from '../../firebase/config';
import Grid from '@mui/material/Grid';
import { Box, TextField, CircularProgress } from '@material-ui/core';
import Autocomplete from '@mui/material/Autocomplete';

const COMPLIANCE_TABLES = [
  { name: 'CVRT', collection: 'cvrts' },
  { name: 'Fire Extinguisher', collection: 'fireextinguishers' },
  { name: 'First Aid Kit', collection: 'firstaidkits' },
  { name: 'PSV', collection: 'psvs' },
  { name: 'Tacho Calibration', collection: 'tachocalibrations' },
  { name: 'Tax', collection: 'taxes' },
];

const toDate = (value) => {
  if (!value) return null;
  return value.toDate ? value.toDate() : new Date(value);
};

const getCellStyle = (expiryDate) => {
  if (!expiryDate || isNaN(new Date(expiryDate).getTime())) {
    return { backgroundColor: '#f0f0f0', color: 'black' };
  }
  const daysDifference = (expiryDate - new Date()) / (1000 * 60 * 60 * 24);
  if (daysDifference < 0) return { backgroundColor: 'red', color: 'white' };
  if (daysDifference <= 30) return { backgroundColor: 'orange', color: 'white' };
  return { backgroundColor: 'green', color: 'white' };
};

const formatDateToDDMMYY = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
};

export default function QuickAudit() {
  const { documents: vehicles } = useCollection('vehicles');
  const [expiryDates, setExpiryDates] = useState(Array(6).fill({ date: 'N/A', table: '' }));
  const [allSelected, setAllSelected] = useState(false);
  const [allVehicleData, setAllVehicleData] = useState([]);
  const [loading, setLoading] = useState(false);

  const filteredVehicles = vehicles
    ? vehicles.sort((a, b) => a.registration.localeCompare(b.registration))
    : [];

  const fetchForRegistration = async (registration) => {
    setLoading(true);
    const results = await Promise.all(
      COMPLIANCE_TABLES.map(async ({ name, collection }) => {
        const snapshot = await projectFirestore
          .collection(collection)
          .where('registration', '==', registration)
          .get();

        if (!snapshot.empty) {
          const doc = snapshot.docs[0].data();
          const date = toDate(doc.expiryDate);
          if (date) return { date, table: name };
        }
        return { date: 'Not Found', table: name };
      })
    );
    setExpiryDates(results);
    setLoading(false);
  };

  const fetchAll = async () => {
    setLoading(true);
    const collectionData = await Promise.all(
      COMPLIANCE_TABLES.map(async ({ name, collection }) => {
        const snapshot = await projectFirestore.collection(collection).get();
        const lookup = {};
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          if (data.registration) lookup[data.registration] = data;
        });
        return { name, lookup };
      })
    );

    const lookups = Object.fromEntries(collectionData.map(({ name, lookup }) => [name, lookup]));

    const vehicleResults = filteredVehicles.map((vehicle) => ({
      registration: vehicle.registration,
      expiries: COMPLIANCE_TABLES.map(({ name }) => {
        const doc = lookups[name]?.[vehicle.registration];
        return doc?.expiryDate ? toDate(doc.expiryDate) : 'N/A';
      }),
    }));

    setAllVehicleData(vehicleResults);
    setLoading(false);
  };

  const handleChange = (value) => {
    if (!value) {
      setExpiryDates(Array(6).fill({ date: 'N/A', table: '' }));
      setAllVehicleData([]);
      setAllSelected(false);
    } else if (value === 'All') {
      setAllSelected(true);
      setExpiryDates(Array(6).fill({ date: 'N/A', table: '' }));
      fetchAll();
    } else {
      setAllSelected(false);
      setAllVehicleData([]);
      fetchForRegistration(value);
    }
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
        onChange={(event, value) => handleChange(value)}
        clearOnEscape
        sx={{ width: 300 }}
        renderInput={(params) => <TextField {...params} label="Registration" />}
      />

      {loading && <CircularProgress size={32} />}

      {!loading && allSelected && allVehicleData.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ccc', padding: '8px', textAlign: 'left' }}>Registration</th>
                {COMPLIANCE_TABLES.map(({ name }) => (
                  <th key={name} style={{ border: '1px solid #ccc', padding: '8px' }}>{name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allVehicleData.map(({ registration, expiries }) => (
                <tr key={registration}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{registration}</td>
                  {expiries.map((date, i) => (
                    <td
                      key={i}
                      style={{
                        border: '1px solid #ccc',
                        padding: '8px',
                        textAlign: 'center',
                        ...getCellStyle(date === 'N/A' ? null : date),
                      }}
                    >
                      {date === 'N/A' || !date || isNaN(new Date(date).getTime())
                        ? 'No Record'
                        : formatDateToDDMMYY(new Date(date))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && !allSelected && expiryDates.some(({ date }) => date !== 'N/A') && (
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
                  ...getCellStyle(date === 'N/A' || isNaN(new Date(date).getTime()) ? null : new Date(date)),
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
      )}
    </Box>
  );
}
