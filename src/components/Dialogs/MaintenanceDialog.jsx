import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Box,
  Typography,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import AttachFileIcon from '@mui/icons-material/AttachFile';

// Hooks
import { useCreateMaintenance } from '../../hooks/useCreateMaintenance';
import { useFirestore } from '../../hooks/useFirestore';
import useUpdateFault from '../../hooks/useUpdateFault';
import { useVehicleFaults } from '../../hooks/useVehicleFaults';
import { timestamp, projectStorage } from '../../firebase/config';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = [
  { value: 'resolved', label: 'Resolved' },
  { value: 'partially_resolved', label: 'Partially Resolved' },
  { value: 'deferred', label: 'Deferred' },
];

export default function MaintenanceDialog({
  show,
  onClose,
  vehicles,
  edit = false,
  editData = null,
}) {
  const [registration, setRegistration] = useState('');
  const [odometer, setOdometer] = useState('');
  const [technician, setTechnician] = useState('');
  const [serviceDate, setServiceDate] = useState(new Date());
  const [errors, setErrors] = useState({});
  const [jobs, setJobs] = useState([]);
  const [originalLinkedFaultIds, setOriginalLinkedFaultIds] = useState([]);

  // 1. Fetch only faults for the specific vehicle (Optimized)
  const { faults: availableFaults } = useVehicleFaults(
    registration,
    originalLinkedFaultIds
  );

  const { createMaintenance, state } = useCreateMaintenance();
  const { updateDocument } = useFirestore('maintenance');
  const { updateFault, reopenFault } = useUpdateFault();

  const sortedVehicles = useMemo(() => {
    return (vehicles || []).slice().sort((b, a) => {
      const ra = (a?.registration || '').toLowerCase();
      const rb = (b?.registration || '').toLowerCase();
      return ra.localeCompare(rb);
    });
  }, [vehicles]);

  // Handle Edit Data Population
  useEffect(() => {
    if (show && edit && editData) {
      setRegistration(editData.registration || '');
      setOdometer(editData.odometer != null ? String(editData.odometer) : '');
      setTechnician(editData.technician || '');

      try {
        if (editData.serviceDate?.toDate)
          setServiceDate(editData.serviceDate.toDate());
        else if (editData.serviceDate?.seconds)
          setServiceDate(new Date(editData.serviceDate.seconds * 1000));
        else
          setServiceDate(
            editData.serviceDate ? new Date(editData.serviceDate) : new Date()
          );
      } catch (err) {
        setServiceDate(new Date());
      }

      const existingJobs = (editData.jobs || []).map((j) => ({
        id: j.id || `${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        workPerformed: j.workPerformed || '',
        partsReplaced: j.partsReplaced || '',
        linkedFaultId: j.linkedFaultId || '',
        faultStatus: j.faultStatus || '',
        faultNote: j.faultNote || '',
        // preserve existing stored file URL/filename if present
        fileUrl: j.fileUrl || j.fileURL || '',
        fileName: j.fileName || '',
        file: null,
      }));

      setJobs(existingJobs);
      setOriginalLinkedFaultIds(
        existingJobs.map((j) => j.linkedFaultId).filter((id) => !!id)
      );
      setErrors({});
    }

    if (show && !edit) {
      setRegistration('');
      setOdometer('');
      setTechnician('');
      setServiceDate(new Date());
      setJobs([]);
      setOriginalLinkedFaultIds([]);
      setErrors({});
    }
  }, [show, edit, editData]);

  console.log(availableFaults);
  const addJob = () => {
    setJobs((s) => [
      ...s,
      {
        id: `${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        workPerformed: '',
        partsReplaced: '',
        linkedFaultId: '',
        faultStatus: '',
        faultNote: '',
        // transient File object when user selects a file
        file: null,
        // stored file URL (for existing jobs)
        fileUrl: '',
      },
    ]);
  };

  const updateJob = (id, patch) => {
    setJobs((s) => s.map((j) => (j.id === id ? { ...j, ...patch } : j)));
  };

  const removeJob = (id) => setJobs((s) => s.filter((j) => j.id !== id));

  const handleSave = async () => {
    const newErrors = {};
    if (!registration) newErrors.registration = 'Vehicle is required';
    if (!odometer && odometer !== 0)
      newErrors.odometer = 'Odometer is required';
    if (!serviceDate) newErrors.serviceDate = 'Service date is required';
    if (!technician) newErrors.technician = 'Technician is required';
    if (!jobs.length) newErrors.jobs = 'Add at least one job';

    const jobsById = {};
    jobs.forEach((j) => {
      if (!j.workPerformed?.trim())
        jobsById[j.id] = 'Work performed is required';
    });
    if (Object.keys(jobsById).length > 0) newErrors.jobsById = jobsById;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Upload any selected files for jobs and build final jobs payload
    const jobsPayload = [];
    for (const j of jobs) {
      let fileUrl = j.fileUrl || null;
      let fileName = j.fileName || null;
      if (j.file) {
        try {
          const file = j.file;
          const safeRegistration = (registration || 'unregistered').replace(
            /[^a-zA-Z0-9-_]/g,
            '_'
          );
          const path = `maintenance/${safeRegistration}/${Date.now()}_${
            file.name
          }`;
          const storageRef = projectStorage.ref().child(path);
          const uploadTask = await storageRef.put(file);
          fileUrl = await uploadTask.ref.getDownloadURL();
          fileName = file.name;
        } catch (err) {
          console.error('File upload failed for job', j.id, err);
        }
      }

      jobsPayload.push({
        workPerformed: j.workPerformed,
        partsReplaced: j.partsReplaced,
        linkedFaultId: j.linkedFaultId || null,
        faultStatus: j.faultStatus || null,
        faultNote: j.faultNote || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      });
    }

    const payload = {
      registration,
      serviceDate: timestamp.fromDate(new Date(serviceDate)),
      technician,
      odometer: Number(odometer),
      jobs: jobsPayload,
      faults: [],
    };

    try {
      if (edit && editData?.id) {
        const currentLinkedIds = jobs
          .map((j) => j.linkedFaultId)
          .filter(Boolean);
        const removedLinkedIds = originalLinkedFaultIds.filter(
          (id) => !currentLinkedIds.includes(id)
        );

        for (const rid of removedLinkedIds) {
          await reopenFault({ faultId: rid });
        }

        await updateDocument(editData.id, payload);

        for (const j of jobs) {
          if (j.linkedFaultId) {
            await updateFault({
              faultId: j.linkedFaultId,
              status: j.faultStatus || 'partially_resolved',
              note: j.faultNote || '',
              maintenanceRef: `maintenance/${editData.id}`,
              maintenanceDate: timestamp.fromDate(new Date(serviceDate)),
              maintenanceTechnician: technician,
              actionTaken: j.workPerformed || '',
              partsReplaced: j.partsReplaced || '',
            });
          }
        }
        toast.success('Maintenance record updated');
      } else {
        await createMaintenance(payload);
        toast.success('Maintenance record created');
      }
      onClose();
    } catch (err) {
      console.error('Save failed:', err);
      toast.error('Failed to save maintenance record');
    }
  };

  return (
    <Dialog open={show} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{edit ? 'Edit Maintenance' : 'Log Maintenance'}</DialogTitle>
      <DialogContent>
        <Box
          display="flex"
          flexDirection="column"
          style={{ gap: '16px', marginTop: '8px' }}
        >
          <Box display="flex" style={{ gap: '16px' }}>
            <Box style={{ flex: 1 }}>
              <Autocomplete
                options={sortedVehicles}
                getOptionLabel={(opt) => opt?.registration || ''}
                value={
                  vehicles?.find((v) => v.registration === registration) || null
                }
                onChange={(_, newVal) =>
                  setRegistration(newVal ? newVal.registration : '')
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Vehicle"
                    variant="outlined"
                    error={!!errors.registration}
                    helperText={errors.registration}
                    fullWidth
                  />
                )}
              />
            </Box>
            <TextField
              label="Odometer"
              type="number"
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              variant="outlined"
              style={{ flex: 1 }}
              error={!!errors.odometer}
            />
            <Box style={{ flex: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Service Date"
                  inputFormat="dd/MM/yyyy"
                  value={serviceDate}
                  onChange={setServiceDate}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      variant="outlined"
                      fullWidth
                      error={!!errors.serviceDate}
                    />
                  )}
                />
              </LocalizationProvider>
            </Box>
            <TextField
              label="Technician"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              variant="outlined"
              style={{ flex: 1 }}
              error={!!errors.technician}
            />
          </Box>

          {jobs.map((job) => (
            <Box
              key={job.id}
              border="1px solid #c6c6c6"
              borderRadius="4px"
              p={2}
            >
              <Box display="flex" style={{ gap: '8px' }}>
                <TextField
                  label="Work Performed"
                  value={job.workPerformed}
                  onChange={(e) =>
                    updateJob(job.id, { workPerformed: e.target.value })
                  }
                  fullWidth
                  error={!!errors.jobsById?.[job.id]}
                  helperText={errors.jobsById?.[job.id]}
                />
                <TextField
                  label="Parts Replaced"
                  value={job.partsReplaced}
                  onChange={(e) =>
                    updateJob(job.id, { partsReplaced: e.target.value })
                  }
                  fullWidth
                />
              </Box>
              <TextField
                label="Job Note (Optional)"
                value={job.faultNote}
                onChange={(e) =>
                  updateJob(job.id, { faultNote: e.target.value })
                }
                fullWidth
                multiline
                rows={2}
                style={{ marginTop: '12px' }}
              />
              <Box style={{ marginTop: '12px' }}>
                <Box display="flex" alignItems="center" style={{ gap: 8 }}>
                  <input
                    accept="*"
                    style={{ display: 'none' }}
                    id={`file-input-${job.id}`}
                    type="file"
                    onChange={(e) => {
                      const f =
                        e.target.files && e.target.files[0]
                          ? e.target.files[0]
                          : null;
                      updateJob(job.id, { file: f });
                    }}
                  />

                  <label htmlFor={`file-input-${job.id}`}>
                    <Button
                      variant="outlined"
                      size="small"
                      component="span"
                      startIcon={<AttachFileIcon />}
                    >
                      Attach contact
                    </Button>
                  </label>

                  <Typography variant="caption" style={{ marginLeft: 8 }}>
                    {job.file
                      ? `Selected: ${job.file.name}`
                      : job.fileUrl
                        ? `Attached: ${job.fileName || 'file'}`
                        : 'No file attached'}
                  </Typography>

                  {(job.file || job.fileUrl) && (
                    <Button
                      size="small"
                      onClick={() =>
                        updateJob(job.id, {
                          file: null,
                          fileUrl: '',
                          fileName: '',
                        })
                      }
                    >
                      Remove
                    </Button>
                  )}
                </Box>
              </Box>
              <Box display="flex" style={{ gap: '16px', marginTop: '16px' }}>
                <FormControl fullWidth variant="outlined">
                  <InputLabel>Associated Fault (Optional)</InputLabel>
                  <Select
                    value={job.linkedFaultId || ''}
                    label="Associated Fault (Optional)"
                    onChange={(e) => {
                      const newVal = e.target.value;
                      // default fault status to 'resolved' when a fault is linked
                      const newStatus = newVal
                        ? job.faultStatus || 'resolved'
                        : '';
                      updateJob(job.id, {
                        linkedFaultId: newVal,
                        faultStatus: newStatus,
                      });
                    }}
                  >
                    <MenuItem value="">None</MenuItem>
                    {availableFaults.map((f) => (
                      <MenuItem
                        key={f.id}
                        value={f.id}
                      >{`${f.item} — ${f.description}`}</MenuItem>
                    ))}
                  </Select>
                </FormControl>

                {job.linkedFaultId && (
                  <FormControl fullWidth variant="outlined">
                    <InputLabel>Fault Status</InputLabel>
                    <Select
                      value={job.faultStatus || ''}
                      label="Fault Status"
                      onChange={(e) =>
                        updateJob(job.id, { faultStatus: e.target.value })
                      }
                    >
                      {STATUS_OPTIONS.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>
              <Box display="flex" justifyContent="flex-end" mt={1}>
                <Button
                  size="small"
                  color="secondary"
                  onClick={() => removeJob(job.id)}
                >
                  Remove Job
                </Button>
              </Box>
            </Box>
          ))}

          <Button
            onClick={addJob}
            fullWidth
            variant="outlined"
            style={{ borderStyle: 'dashed' }}
          >
            + ADD JOB
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          color="primary"
          variant="contained"
          onClick={handleSave}
          disabled={state.isPending}
        >
          {state.isPending ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
