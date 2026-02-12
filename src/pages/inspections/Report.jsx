import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Button,
  TextField,
  Paper,
  Typography,
  Grid,
  Divider,
  Radio,
  RadioGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Container,
  Stack,
  Chip,
  Card,
  CardContent,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  CheckCircleOutline as PassIcon,
  ErrorOutline as FailIcon,
  ArrowBack as BackIcon,
  Save as SaveIcon,
  InfoOutlined as InfoIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';

// Assuming these are your custom hooks
import useInspectionReport from '../../hooks/useInspectionReport';
import useFetchInspectionReport from '../../hooks/useFetchInspectionReport';
import useCreateFault from '../../hooks/useCreateFault';
import useCreateMaintenance from '../../hooks/useCreateMaintenance';

const A_ITEMS = [
  [1, '1', 'Registration/Licence/VIN'],
  [2, '2', 'Vehicle Weights & Dimensions Plate'],
  [3, '18', 'Warning Triangle'],
  [4, '9', 'Seats'],
  [5, '10', 'Seat belts'],
  [6, '8', 'Mirrors'],
  [7, '11', 'Windows, Glass & view of the road'],
  [8, '7', 'Windscreen wipers & washers'],
  [9, '16/69', 'Tachograph/Speedometer'],
  [10, '6', 'Horn'],
  [11, '29', 'Gauges, warning devices & malfunction indicators'],
  [12, '29', 'ABS warning'],
  [13, '53', 'Driving controls'],
  [14, '17/43', 'Steering control'],
  [15, '13', 'Service brake pedal'],
  [16, '14', 'Service Brake Operation (Inspection in Cab)'],
  [17, '4', 'Pressure/Air/Vacuum warnings'],
  [18, '5', 'Pressure/Air/Vacuum build-up'],
  [19, '12', 'Mechanical Brake Hand Levers'],
  [20, '15', 'Air/Vacuum Hand Control  Valves'],
  [21, '21/22', 'Cab mounting, floor, doors & steps'],
  [22, '19', 'Doors/Locks/Anti Theft Devices'],
];

const B_ITEMS = [
  [23, '22', 'Condition & Security of body'],
  [24, '3', 'Exhaust Smoke emission'],
  [25, '27', 'Road wheels & hubs'],
  [26, '25', 'Tyre Specification'],
  [27, '24', 'Tyre Condition'],
  [28, '26', 'Tyre Tread'],
  [29, '31', 'Sideguards, Rear under-run Protection & bumpers'],
  [30, '32', 'Spare wheel & carrier'],
  [31, '45', 'Chassis/Underbody'],
  [32, '35', 'Towing Coupling/Fifth Wheel'],
  [33, '33', 'Trailer parking, emergency brake & air connections'],
  [34, '45', 'Trailer landing legs'],
  [35, '68', 'Spray suppression, wings & wheel arches'],
  [36, '16/70', 'Speed limiter & Plate'],
  [37, '20', 'Electrical wiring, equipment, batteries & trailer connections'],
  [38, '53', 'Engine & transmission mountings'],
  [39, '34', 'Fuel tanks & system'],
  [40, '53', 'Oil leaks'],
  [41, '46', 'Exhaust System/Noise'],
  [42, '43', 'Steering Mechanism'],
  [43, '36', 'Steering Alignment'],
  [44, '50/51/54/55', 'Suspension Units'],
  [45, '50/51/54/55', 'Suspension Linkage & Pins/Bushes'],
  [46, '52', 'Shock Absorbers'],
  [47, '44', 'Axles, stub axles & wheel bearings'],
  [48, '53', 'Transmission & Final Drive'],
  [49, '49', 'Brake Lines & Hoses'],
  [50, '47', 'Brake Wheel Units'],
  [51, '33', 'Brake Reservoirs/Valves/Master Cylinders/Connections'],
  [52, '30', 'Brake Fluid'],
  [53, '48', 'Mechanical Brake Components'],
  [54, '48', 'Brake Drums/Discs & Linings/Pads'],
  [55, '56/59', 'Front & Rear lamps & No. Plate lamps'],
  [56, '57', 'Stop lamps'],
  [57, '', 'Fog lamps'],
  [58, '59', 'Marker Lamps'],
  [59, '60/61', 'Headlamps & Aim'],
  [60, '28', 'Reflectors and Rear & Side Markings'],
  [61, '58', 'Direction indicators & hazard warning lamps'],
  [62, '', 'Additional braking devices'],
  [63, '', 'Ancillary equipment'],
  [64, '', 'Other Items'],
];

const C_ITEMS = [
  [65, '37/38', 'Service Brake performance'],
  [66, '39/40', 'Emergency/Secondary brake performance'],
  [67, '41/42', 'Parking brake performance'],
];

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function Report() {
  const query = useQuery();
  const id = query.get('id');
  const year = query.get('y');
  const month = query.get('m');
  const useExisting = query.get('u') === 'true';
  const urlRegistration = query.get('reg') || '';
  const navigate = useNavigate();

  const { saveReport } = useInspectionReport();
  const { createFault } = useCreateFault();
  const { createMaintenance } = useCreateMaintenance();

  const [inspectionDate, setInspectionDate] = useState(new Date());
  const [odometer, setOdometer] = useState('');
  const [inspector, setInspector] = useState('');
  const [registration, setRegistration] = useState(urlRegistration);

  const initSectionState = (items) => {
    const s = {};
    items.forEach(([, , label]) => {
      s[label] = {
        condition: 'satisfactory',
        description: '',
        rectified: false,
        actionTaken: '',
        partsReplaced: '',
        notes: '',
      };
    });
    return s;
  };

  const [sectionA, setSectionA] = useState(initSectionState(A_ITEMS));
  const [sectionB, setSectionB] = useState(initSectionState(B_ITEMS));
  const [sectionC, setSectionC] = useState(initSectionState(C_ITEMS));
  const [rectifiedErrors, setRectifiedErrors] = useState([]);
  const [failErrors, setFailErrors] = useState([]);
  const [odometerError, setOdometerError] = useState(false);
  const [inspectorError, setInspectorError] = useState(false);

  const { data: existingData } = useFetchInspectionReport(year, month, id, useExisting);

  useEffect(() => {
    if (!useExisting || !existingData) return;
    if (existingData.odometer !== undefined) setOdometer(String(existingData.odometer));
    if (existingData.inspector !== undefined) setInspector(existingData.inspector);
    if (existingData.registration !== undefined) setRegistration(existingData.registration);
    if (existingData.inspectionDate) {
      try {
        const d = existingData.inspectionDate.toDate
          ? existingData.inspectionDate.toDate()
          : new Date(existingData.inspectionDate);
        setInspectionDate(d);
      } catch (e) {}
    }
    if (existingData.sectionA) setSectionA(existingData.sectionA);
    if (existingData.sectionB) setSectionB(existingData.sectionB);
    if (existingData.sectionC) setSectionC(existingData.sectionC);
  }, [useExisting, existingData]);

  const handleChange = (sectionSetter, sectionState, key, field, value) => {
    sectionSetter({ ...sectionState, [key]: { ...sectionState[key], [field]: value } });
    // Clear rectified error when actionTaken is provided or rectified is unchecked
    if (field === 'actionTaken') {
      if (value && value.toString().trim() !== '') {
        setRectifiedErrors((s) => s.filter((l) => l !== key));
      }
    }
    if (field === 'rectified' && value === false) {
      setRectifiedErrors((s) => s.filter((l) => l !== key));
    }
    // Clear fail error when description is provided or the condition is changed away from requires_action
    if (field === 'description') {
      if (value && value.toString().trim() !== '') {
        setFailErrors((s) => s.filter((l) => l !== key));
      }
    }
    if (field === 'condition' && value !== 'requires_action') {
      setFailErrors((s) => s.filter((l) => l !== key));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    // Validate required top-level fields: odometer and inspector
    let topFieldError = false;
    if (odometer === '' || Number.isNaN(Number(odometer))) {
      setOdometerError(true);
      topFieldError = true;
    }
    if (!inspector || inspector.toString().trim() === '') {
      setInspectorError(true);
      topFieldError = true;
    }
    if (topFieldError) return;
    // Validation: if an item is marked rectified, require Action Taken; if item is Fail, require Description
    const missingActions = [];
    const missingDescriptions = [];
    const collectMissing = (section) => {
      Object.keys(section).forEach((label) => {
        const item = section[label];
        if (item) {
          if (item.rectified && (!item.actionTaken || item.actionTaken.toString().trim() === '')) {
            missingActions.push(label);
          }
          if (
            item.condition === 'requires_action' &&
            (!item.description || item.description.toString().trim() === '')
          ) {
            missingDescriptions.push(label);
          }
        }
      });
    };
    collectMissing(sectionA);
    collectMissing(sectionB);
    collectMissing(sectionC);
    if (missingActions.length > 0 || missingDescriptions.length > 0) {
      // Use MUI field-level error labels: store missing labels and block save
      if (missingActions.length > 0) setRectifiedErrors(missingActions);
      if (missingDescriptions.length > 0) setFailErrors(missingDescriptions);
      return;
    }
    const payload = {
      id,
      registration,
      odometer: Number(odometer),
      inspector,
      inspectionDate,
      sectionA,
      sectionB,
      sectionC,
    };
    const result = await saveReport({ year, month, id, report: payload });
    if (result?.success) {
      // collect failed items across sections
      const failedItems = [];
      const collectFailed = (section) => {
        Object.keys(section).forEach((label) => {
          const item = section[label];
          if (item.condition === 'requires_action') {
            failedItems.push({ label, ...item });
          }
        });
      };
      collectFailed(sectionA);
      collectFailed(sectionB);
      collectFailed(sectionC);

      for (const fi of failedItems) {
        try {
          const faultRes = await createFault({
            inspectionPath: `inspections/${year}/${month}/${id}`,
            item: fi.label,
            description: fi.description || '',
            inspector: inspector || null,
            vehicle: registration || null,
            odometer: odometer !== '' ? Number(odometer) : null,
            inspectionDate: inspectionDate || null,
          });

          if (faultRes && faultRes.success) {
            // If an existing fault was returned and already has a maintenanceRef,
            // skip creating another maintenance record to avoid duplicates.
            const existingMaintenanceRef = faultRes.doc && faultRes.doc.maintenanceRef;
            if (fi.rectified) {
              if (existingMaintenanceRef) {
                // maintenance already linked to this fault; skip creating another
              } else {
                const job = {
                  workPerformed: fi.actionTaken || fi.description || 'Rectification',
                  partsReplaced: fi.partsReplaced || '',
                  linkedFaultId: faultRes.id,
                  faultStatus: 'resolved',
                  faultNote: fi.notes || '',
                };
                await createMaintenance({
                  registration: registration || '',
                  serviceDate: inspectionDate || new Date(),
                  technician: inspector || '',
                  odometer: odometer !== '' ? Number(odometer) : null,
                  jobs: [job],
                });
              }
            }
          }
        } catch (err) {
          console.error('Failed to create fault/maintenance for item', fi.label, err);
        }
      }

      navigate('/inspections');
    }
  };

  const renderSection = (title, items, state, setter) => (
    <Card variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: 'visible' }}>
      <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary', letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <CardContent sx={{ p: 0 }}>
        {items.map(([check, tm, label], idx) => {
          const item = state[label];
          const isFailed = item.condition === 'requires_action';

          return (
            <Box
              key={label}
              sx={{
                p: 3,
                borderBottom: idx === items.length - 1 ? 'none' : '1px solid',
                borderColor: 'grey.100',
                transition: 'background-color 0.2s',
                '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' },
              }}
            >
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={5}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {label}
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Chip
                      label={`Ref: ${check}`}
                      size="small"
                      variant="outlined"
                      sx={{ height: 20, fontSize: '0.65rem', borderRadius: 1 }}
                    />
                    {tm && (
                      <Chip
                        label={`TM: ${tm}`}
                        size="small"
                        variant="outlined"
                        sx={{ height: 20, fontSize: '0.65rem', borderRadius: 1 }}
                      />
                    )}
                  </Stack>
                </Grid>

                <Grid item xs={12} md={4}>
                  <RadioGroup
                    row
                    value={item.condition}
                    onChange={(e) => handleChange(setter, state, label, 'condition', e.target.value)}
                  >
                    <FormControlLabel
                      value="satisfactory"
                      control={<Radio color="success" size="small" />}
                      label={<Typography variant="body2">Pass</Typography>}
                    />
                    <FormControlLabel
                      value="requires_action"
                      control={<Radio color="error" size="small" />}
                      label={
                        <Typography variant="body2" sx={{ color: isFailed ? 'error.main' : 'inherit' }}>
                          Fail
                        </Typography>
                      }
                    />
                  </RadioGroup>
                </Grid>

                <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: { md: 'flex-end' } }}>
                  {isFailed && (
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={item.rectified}
                          onChange={(e) => handleChange(setter, state, label, 'rectified', e.target.checked)}
                          color="success"
                          size="small"
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1 }}>
                          RECTIFIED
                        </Typography>
                      }
                    />
                  )}
                </Grid>
              </Grid>

              {isFailed && (
                <Box
                  sx={{
                    mt: 2,
                    p: 2.5,
                    borderRadius: 0,
                    bgcolor: 'transparent',
                    borderLeft: 'none',
                  }}
                >
                  <TextField
                    label="Defect Description*"
                    placeholder="Describe the fault in detail..."
                    value={item.description}
                    onChange={(e) => handleChange(setter, state, label, 'description', e.target.value)}
                    fullWidth
                    multiline
                    variant="outlined"
                    size="small"
                    error={failErrors.includes(label)}
                    helperText={failErrors.includes(label) ? 'Required' : ''}
                    sx={{ mb: item.rectified ? 2 : 0, bgcolor: 'background.paper' }}
                  />

                  {item.rectified && (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Action Taken*"
                          value={item.actionTaken}
                          onChange={(e) => handleChange(setter, state, label, 'actionTaken', e.target.value)}
                          variant="outlined"
                          size="small"
                          fullWidth
                          error={rectifiedErrors.includes(label)}
                          helperText={rectifiedErrors.includes(label) ? 'Required' : ''}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          label="Parts Replaced"
                          value={item.partsReplaced}
                          onChange={(e) => handleChange(setter, state, label, 'partsReplaced', e.target.value)}
                          variant="outlined"
                          size="small"
                          fullWidth
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <TextField
                          label="Rectification Notes"
                          value={item.notes}
                          onChange={(e) => handleChange(setter, state, label, 'notes', e.target.value)}
                          variant="outlined"
                          size="small"
                          fullWidth
                          multiline
                          rows={2}
                          sx={{ bgcolor: 'background.paper' }}
                        />
                      </Grid>
                    </Grid>
                  )}
                </Box>
              )}
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ minHeight: '100vh', py: 4 }}>
        <Container maxWidth="lg">
          {/* Header Card */}
          <Paper
            elevation={0}
            sx={{
              p: 4,
              mb: 4,
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
              background: 'linear-gradient(to right, #ffffff, #fafafa)',
            }}
          >
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              justifyContent="space-between"
              alignItems={{ sm: 'flex-start' }}
              spacing={2}
            >
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  Inspection Report
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  Vehicle:{' '}
                  <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {registration || 'New Entry'}
                  </Box>
                </Typography>
              </Box>
              <Button
                startIcon={<BackIcon />}
                variant="outlined"
                color="inherit"
                onClick={() => navigate('/inspections')}
                sx={{ borderRadius: 2, textTransform: 'none' }}
              >
                Back to List
              </Button>
            </Stack>

            <Grid container spacing={3} sx={{ mt: 3 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Odometer*"
                  value={odometer}
                  onChange={(e) => {
                    setOdometer(e.target.value);
                    if (e.target.value && e.target.value.toString().trim() !== '') setOdometerError(false);
                  }}
                  type="number"
                  fullWidth
                  variant="outlined"
                  error={odometerError}
                  helperText={odometerError ? 'Required' : ''}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <DatePicker
                  label="Inspection Date"
                  value={inspectionDate}
                  onChange={(newValue) => setInspectionDate(newValue)}
                  slotProps={{ textField: { fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  label="Inspector Name*"
                  value={inspector}
                  onChange={(e) => {
                    setInspector(e.target.value);
                    if (e.target.value && e.target.value.toString().trim() !== '') setInspectorError(false);
                  }}
                  fullWidth
                  variant="outlined"
                  error={inspectorError}
                  helperText={inspectorError ? 'Required' : ''}
                />
              </Grid>
            </Grid>
          </Paper>

          <form onSubmit={handleSave}>
            {renderSection('1. CABIN & CONTROLS', A_ITEMS, sectionA, setSectionA)}
            {renderSection('2. EXTERIOR & CHASSIS', B_ITEMS, sectionB, setSectionB)}
            {renderSection('3. BRAKE PERFORMANCE', C_ITEMS, sectionC, setSectionC)}

            {/* Sticky Submit Bar */}
            <Box
              sx={{
                position: 'sticky',
                bottom: 24,
                mt: 6,
                display: 'flex',
                justifyContent: 'center',
                zIndex: 100,
              }}
            >
              <Button
                type="submit"
                variant="contained"
                size="large"
                startIcon={<SaveIcon />}
                sx={{
                  px: 8,
                  py: 1.8,
                  borderRadius: 10,
                  fontSize: '1rem',
                  fontWeight: 700,
                  textTransform: 'none',
                  boxShadow: '0 8px 16px rgba(25, 118, 210, 0.3)',
                  '&:hover': {
                    boxShadow: '0 12px 20px rgba(25, 118, 210, 0.4)',
                  },
                }}
              >
                Complete Inspection
              </Button>
            </Box>
          </form>
        </Container>
      </Box>
    </LocalizationProvider>
  );
}
