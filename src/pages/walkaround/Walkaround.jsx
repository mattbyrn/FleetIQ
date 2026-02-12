import React, { useState, useEffect } from 'react';
import { useSearchParams, useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Alert,
  CircularProgress,
  Stack,
  Paper,
  Grid,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  ErrorOutline as FailIcon,
  CheckCircleOutline as PassIcon,
} from '@mui/icons-material';
import { useWalkaroundInspection } from '../../hooks/useWalkaroundInspection';
import { useCreateFault } from '../../hooks/useCreateFault';
import { timestamp } from '../../firebase/config';

const WALKAROUND_ITEMS = [
  {
    label: 'Lights & Indicators',
    description: 'All lights functioning (headlights, brake lights, indicators, hazards)',
  },
  { label: 'Tyres', description: 'Condition, tread depth, pressure, no damage or bulges' },
  { label: 'Mirrors', description: 'Clean, properly adjusted, not damaged or missing' },
  { label: 'Glass & Visibility', description: 'Windscreen/windows clean, no cracks or damage affecting visibility' },
  { label: 'Fluid Leaks', description: 'No visible oil, coolant, or fuel leaks underneath vehicle' },
  { label: 'Body & Security', description: 'No damage, doors/hatches secure, load properly secured' },
  {
    label: 'Emergency Equipment',
    description: 'Warning triangle, fire extinguisher, first aid kit present and accessible',
  },
  { label: 'Interior Condition', description: 'Cab clean, seats secure, seatbelts functional, controls operational' },
];

export default function Walkaround() {
  const [searchParams] = useSearchParams();
  const { id } = useParams(); // Get ID from URL for edit mode
  const navigate = useNavigate();
  const { saveWalkaround, loadWalkaround, updateWalkaround } = useWalkaroundInspection();
  const { createFault } = useCreateFault();

  // Determine mode
  const isEditMode = !!id;
  const isCreateMode = !id && !!searchParams.get('reg');

  // Form state
  const [walkaroundId, setWalkaroundId] = useState(id || null);
  const [registration, setRegistration] = useState(searchParams.get('reg') || '');
  const [driverName, setDriverName] = useState('');
  const [odometer, setOdometer] = useState('');
  const [inspectionDate, setInspectionDate] = useState(new Date());
  const [items, setItems] = useState(() =>
    Object.fromEntries(WALKAROUND_ITEMS.map((item) => [item.label, { condition: 'satisfactory', description: '' }]))
  );
  const [initialItems, setInitialItems] = useState({}); // Track initial state for fault creation

  // Validation state
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [faultsCreated, setFaultsCreated] = useState(0);

  // Load existing walkaround in edit mode
  useEffect(() => {
    const loadExisting = async () => {
      if (isEditMode && id) {
        setLoading(true);
        setSubmitSuccess(false); // Reset success state when entering edit mode
        const result = await loadWalkaround(id);
        if (result.success && result.data) {
          const data = result.data;
          setRegistration(data.registration);
          setDriverName(data.inspector);
          setOdometer(data.odometer.toString());
          if (data.inspectionDate && data.inspectionDate.toDate) {
            setInspectionDate(data.inspectionDate.toDate());
          }
          setItems(data.items);
          setInitialItems(JSON.parse(JSON.stringify(data.items))); // Deep copy for comparison
          setWalkaroundId(data.id);
        } else {
          setErrors({ submit: result.error || 'Failed to load walkaround' });
        }
        setLoading(false);
      }
    };
    loadExisting();
  }, [id, isEditMode]);

  // Handle item condition change
  const handleConditionChange = (itemLabel, condition) => {
    setItems((prev) => ({
      ...prev,
      [itemLabel]: {
        ...prev[itemLabel],
        condition,
        description: condition === 'satisfactory' ? '' : prev[itemLabel].description,
      },
    }));

    // Clear error for this item if it exists
    if (errors[itemLabel]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[itemLabel];
        return newErrors;
      });
    }
  };

  // Handle description change
  const handleDescriptionChange = (itemLabel, description) => {
    setItems((prev) => ({
      ...prev,
      [itemLabel]: {
        ...prev[itemLabel],
        description,
      },
    }));

    // Clear error for this item if description is provided
    if (description.trim() && errors[itemLabel]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[itemLabel];
        return newErrors;
      });
    }
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!registration.trim()) {
      newErrors.registration = 'Vehicle registration is required';
    }

    if (!driverName.trim()) {
      newErrors.driverName = 'Driver name is required';
    }

    if (!odometer || Number(odometer) <= 0) {
      newErrors.odometer = 'Valid odometer reading is required';
    }

    // Check for failed items without descriptions
    Object.entries(items).forEach(([label, data]) => {
      if (data.condition === 'requires_action' && !data.description.trim()) {
        newErrors[label] = 'Description required for failed items';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!validateForm()) {
      // Scroll to first error
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);

    try {
      if (isCreateMode) {
        // CREATE NEW WALKAROUND
        const inspectionResult = await saveWalkaround({
          registration,
          driverName,
          odometer,
          inspectionDate,
          items,
        });

        if (!inspectionResult.success) {
          setErrors({ submit: inspectionResult.error || 'Failed to save inspection' });
          setSubmitting(false);
          return;
        }

        // Create faults for failed items
        const failedItems = Object.entries(items).filter(([label, data]) => data.condition === 'requires_action');

        let faultCount = 0;
        for (const [label, data] of failedItems) {
          const result = await createFault({
            inspectionPath: inspectionResult.path,
            item: label,
            description: data.description,
            inspector: driverName,
            vehicle: registration,
            odometer: Number(odometer),
            inspectionDate: timestamp.fromDate(inspectionDate),
            priority: 'normal',
            status: 'open',
          });
          if (result.success) faultCount++;
        }

        // Store the ID and show success screen
        setWalkaroundId(inspectionResult.id);
        setFaultsCreated(faultCount);
        setSubmitSuccess(true);
      } else if (isEditMode) {
        // UPDATE EXISTING WALKAROUND
        const updateResult = await updateWalkaround(walkaroundId, {
          inspector: driverName,
          odometer: Number(odometer),
          items,
        });

        if (!updateResult.success) {
          setErrors({ submit: updateResult.error || 'Failed to update inspection' });
          setSubmitting(false);
          return;
        }

        // Create NEW faults for newly failed items
        const newlyFailedItems = Object.entries(items).filter(([label, data]) => {
          const wasNotFailed = !initialItems[label] || initialItems[label].condition !== 'requires_action';
          const isNowFailed = data.condition === 'requires_action';
          return wasNotFailed && isNowFailed;
        });

        let newFaultCount = 0;
        for (const [label, data] of newlyFailedItems) {
          const result = await createFault({
            inspectionPath: `walkarounds/${walkaroundId}`,
            item: label,
            description: data.description,
            inspector: driverName,
            vehicle: registration,
            odometer: Number(odometer),
            inspectionDate: timestamp.fromDate(inspectionDate),
            priority: 'normal',
            status: 'open',
          });
          if (result.success) newFaultCount++;
        }

        // Update initial items to current state
        setInitialItems(JSON.parse(JSON.stringify(items)));

        // Show success screen
        setFaultsCreated(newFaultCount);
        setSubmitSuccess(true);
      }
    } catch (err) {
      console.error('Error submitting walkaround:', err);
      setErrors({ submit: 'An error occurred while submitting the inspection' });
    } finally {
      setSubmitting(false);
    }
  };

  // Show loading state while loading existing walkaround
  if (loading) {
    return (
      <Box sx={{ minHeight: '100vh', py: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <CircularProgress size={60} />
      </Box>
    );
  }

  // Success screen (shown after initial submission or after editing)
  if (submitSuccess) {
    return (
      <Box sx={{ minHeight: '100vh', py: 1 }}>
        <Container maxWidth="md">
          <Paper elevation={0} sx={{ backgroundColor: '#fafafa', p: 0, borderRadius: 3, textAlign: 'center' }}>
            <CheckCircleIcon sx={{ fontSize: 100, color: 'success.main', mb: 3 }} />
            <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
              {isEditMode ? 'Changes Saved' : 'Inspection Complete'}
            </Typography>
            <Typography variant="h6" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
              Vehicle: <strong>{registration}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom sx={{ mb: 1 }}>
              Inspection Date:{' '}
              <strong>
                {inspectionDate
                  ? inspectionDate.toDate
                    ? inspectionDate.toDate().toLocaleString()
                    : inspectionDate.toLocaleString()
                  : ''}
              </strong>
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {faultsCreated === 0
                ? isEditMode
                  ? 'Changes saved successfully.'
                  : 'No faults reported. Vehicle passed all checks.'
                : isEditMode
                  ? `${faultsCreated} new fault${faultsCreated > 1 ? 's' : ''} reported.`
                  : `${faultsCreated} fault${faultsCreated > 1 ? 's' : ''} reported and logged in the system.`}
            </Typography>
            <Box
              sx={{
                mb: 4,
                p: 2,
                bgcolor: 'info.lighter',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'info.light',
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, color: 'info.dark' }}>
                ⚠️ Keep this page open until your journey is complete
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                You can edit this inspection at any time to see your walkaround check, or update it if something changes
                during your journey.
              </Typography>
            </Box>
            <Stack direction="column" spacing={2} sx={{ maxWidth: 300, mx: 'auto' }}>
              <Button
                variant="contained"
                size="large"
                onClick={() => {
                  const target = `/walkaround/${walkaroundId}`;
                  if (window.location.pathname === target) {
                    window.location.reload();
                  } else {
                    navigate(target);
                  }
                }}
              >
                View / Amend Inspection
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => (window.location.href = `/walkaround?reg=${registration}`)}
              >
                Start New Inspection
              </Button>
            </Stack>
          </Paper>
        </Container>
      </Box>
    );
  }

  // Main form
  return (
    <Box sx={{ minHeight: '100vh', py: { xs: 0, sm: 4 } }}>
      <Container maxWidth="md">
        {/* Header */}

        {/* Error Alert */}
        {errors.submit && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {errors.submit}
          </Alert>
        )}

        {/* Vehicle Info Card */}
        <Card variant="outlined" sx={{ mb: 4, borderRadius: 2 }}>
          <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Driver Walkaround Inspection {isEditMode && '(Editing)'}
            </Typography>
          </Box>
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Vehicle Registration"
                  value={registration}
                  fullWidth
                  required
                  disabled
                  error={!!errors.registration}
                  InputProps={{
                    readOnly: true,
                  }}
                  sx={{
                    '& .MuiInputBase-input.Mui-disabled': {
                      WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                      fontWeight: 600,
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Driver Name"
                  value={driverName}
                  onChange={(e) => setDriverName(e.target.value)}
                  error={!!errors.driverName}
                  helperText={errors.driverName}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Odometer Reading"
                  type="number"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  error={!!errors.odometer}
                  helperText={errors.odometer}
                  fullWidth
                  required
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Inspection Items */}
        <Card variant="outlined" sx={{ mb: 4, borderRadius: 2, overflow: 'visible' }}>
          <Box sx={{ p: 2.5, bgcolor: 'grey.50', borderBottom: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Inspection Checklist
            </Typography>
          </Box>
          <CardContent sx={{ p: 0 }}>
            {WALKAROUND_ITEMS.map((item, idx) => {
              const itemData = items[item.label];
              const isFailed = itemData.condition === 'requires_action';

              return (
                <Box
                  key={item.label}
                  sx={{
                    p: { xs: 2, sm: 3 },
                    borderBottom: idx === WALKAROUND_ITEMS.length - 1 ? 'none' : '1px solid',
                    borderColor: 'grey.100',
                    transition: 'background-color 0.2s',
                    '&:hover': { bgcolor: 'rgba(0,0,0,0.01)' },
                  }}
                >
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 0.5 }}>
                        {item.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {item.description}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} md={6}>
                      <RadioGroup
                        row
                        value={itemData.condition}
                        onChange={(e) => handleConditionChange(item.label, e.target.value)}
                        sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}
                      >
                        <FormControlLabel
                          value="satisfactory"
                          control={<Radio color="success" />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2">Pass</Typography>
                            </Box>
                          }
                          sx={{ mr: 3 }}
                        />
                        <FormControlLabel
                          value="requires_action"
                          control={<Radio color="error" />}
                          label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <Typography variant="body2" sx={{ color: isFailed ? 'error.main' : 'inherit' }}>
                                Fail
                              </Typography>
                            </Box>
                          }
                        />
                      </RadioGroup>
                    </Grid>
                  </Grid>

                  {isFailed && (
                    <Box sx={{ mt: 2 }}>
                      <TextField
                        label="Defect Description*"
                        placeholder="Describe the fault in detail..."
                        value={itemData.description}
                        onChange={(e) => handleDescriptionChange(item.label, e.target.value)}
                        fullWidth
                        multiline
                        rows={2}
                        variant="outlined"
                        size="small"
                        error={!!errors[item.label]}
                        helperText={errors[item.label] || ''}
                        sx={{ bgcolor: 'background.paper' }}
                      />
                    </Box>
                  )}
                </Box>
              );
            })}
          </CardContent>
        </Card>

        {/* Submit Button */}
        <Box sx={{ position: 'sticky', bottom: 16, zIndex: 10 }}>
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            onClick={handleSubmit}
            disabled={submitting}
            sx={{
              py: 2,
              fontSize: '1.1rem',
              fontWeight: 700,
              boxShadow: 4,
              '&:hover': {
                boxShadow: 6,
              },
            }}
          >
            {submitting ? (
              <CircularProgress size={28} color="inherit" />
            ) : isEditMode ? (
              'Save Changes'
            ) : (
              'Complete Inspection'
            )}
          </Button>
        </Box>
      </Container>
    </Box>
  );
}
