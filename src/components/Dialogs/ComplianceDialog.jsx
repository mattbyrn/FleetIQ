import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  DialogContentText,
  TextField,
  Button,
  DialogContent,
  Tooltip,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useFirestore } from '../../hooks/useFirestore';

import { defaultComplianceState } from '../../utils/defaultConfig';
import { useInspectionScheduler } from '../../utils/InspectionsScheduler';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import { Stack, Input } from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { handleFileUpload } from '../../utils/fileHandler';
import Typography from '@material-ui/core/Typography';
import toast from 'react-hot-toast';

const useStyles = makeStyles((theme) => ({}));

const AddService = (props) => {
  const { addDocument, updateDocument } = useFirestore(props.collection + '/');
  const { scheduleInspections } = useInspectionScheduler();
  const classes = useStyles();
  const [tableRegistrations, setTableRegistrations] = useState([]);

  const [registrationInvalid, setRegistrationInvalid] = useState(false);
  const [registration, setRegistration] = useState(
    defaultComplianceState.registration
  );
  const [expiryDate, setExpiryDate] = useState(
    defaultComplianceState.expiryDate
  );
  const [comment, setComment] = useState(defaultComplianceState.comment);

  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (props.tableRows && props.tableRows.length > 0) {
      const registrations = props.tableRows.map((row) => row.registration);
      setTableRegistrations(registrations);
    }
  }, [props.tableRows]);

  // Detect if this is an edit dialog and populate form
  useEffect(() => {
    if (props.edit && props.editData) {
      const expiryDate = new Date(props.editData.expiryDate.seconds * 1000);

      // if this expects a service date rather than an expiry date
      if (props.collection === 'fireextinguishers') {
        expiryDate.setFullYear(expiryDate.getFullYear() - 1);
      } else if (props.collection === 'tachocalibrations') {
        expiryDate.setFullYear(expiryDate.getFullYear() - 2);
      }

      setRegistration(props.editData.registration || '');
      setExpiryDate(expiryDate || '');
      setComment(props.editData.comment || '');
      if (props.editData.fileUrl) {
        setFile({ name: props.editData.fileName, url: props.editData.fileUrl });
      }
    }
  }, [props.edit, props.editData]);

  const handleVehicleChange = (event) => {
    console.log(props);
    setRegistration(event.target.value);
  };

  const handleChangeDate = (newValue) => {
    setExpiryDate(newValue);
  };

  const validateForm = () => {
    const isVehicleSelected = registration !== '';
    setRegistrationInvalid(!isVehicleSelected);
    return isVehicleSelected;
  };

  const handleSave = async () => {
    if (validateForm()) {
      // fire extinguishers & tacho's are recorded by SERVICE date, not EXPIRY date, so we need to add the appropriate number of years to their service date to get their expiry date
      if (props.collection === 'fireextinguishers') {
        setExpiryDate(expiryDate.setFullYear(expiryDate.getFullYear() + 1));
      }

      if (props.collection === 'tachocalibrations') {
        setExpiryDate(expiryDate.setFullYear(expiryDate.getFullYear() + 2));
      }

      const recordData = {
        registration: registration,
        expiryDate: expiryDate,
        comment: comment,
        fileName: file ? file.name : '',
        fileUrl: file ? file.url : '',
      };

      try {
        if (props.edit) {
          await updateDocument(props.editData.id, recordData);
          toast.success('Record updated');
        } else {
          await addDocument(recordData);
          toast.success('Record added');
        }
      } catch (err) {
        toast.error('Failed to save record');
        return;
      }

      // if this is a record on the CVRT table, we need to update the inspections table too.
      // BUT only if it's not a non-service vehicle
      if (props.collection === 'cvrts') {
        const vehicle = props.vehicles?.find(
          (v) => v.registration === registration
        );
        if (vehicle && !vehicle.nonServiceVehicle) {
          scheduleInspections(recordData);
        }
      }

      setExpiryDate(new Date());
      setRegistration('');
      setFile(null);
      props.callback('OK');
    }
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setLoading(true);
      const uploadedFile = await handleFileUpload(selectedFile);
      setFile({
        name: uploadedFile.name,
        url: uploadedFile.url,
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleKeyPress = (event) => {
      if (event.key === 'Escape') {
        document.getElementById('cancelDialog').click();
      } else if (event.key === 'Enter') {
        document.getElementById('submitDialog').click();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, []);

  return (
    <Dialog open={props.show} onClose={() => props.callback('Cancel')}>
      <DialogTitle>{props.title}</DialogTitle>

      <div style={{ margin: '25px 50px' }}>
        <Stack direction="column" useFlexGap spacing={3}>
          <Stack
            direction="row"
            style={{ minWidth: '500px' }}
            useFlexGap
            spacing={2}
          >
            <FormControl fullWidth>
              <InputLabel id="vehicleSelectLabel">Vehicle</InputLabel>
              <Select
                labelId="vehicleSelectLabel"
                id="vehicleSelect"
                error={registrationInvalid}
                value={registration}
                label="Vehicle"
                onChange={handleVehicleChange}
              >
                {props.vehicles &&
                  (() => {
                    const filteredVehicles = props.vehicles
                      .sort((a, b) =>
                        a.registration.localeCompare(b.registration)
                      ) // Sort by registration
                      .filter((vehicle) => {
                        // If in edit mode, include the current registration
                        if (
                          props.edit &&
                          vehicle.registration === registration
                        ) {
                          return true;
                        }

                        // Apply filtering rules
                        if (
                          props.collection === 'taxes' ||
                          props.collection === 'cvrts'
                        ) {
                          // Current rules for taxes or cvrts
                          return !tableRegistrations.includes(
                            vehicle.registration
                          );
                        } else {
                          // Exclude non-service vehicles for other collections
                          return (
                            !vehicle.nonServiceVehicle &&
                            !tableRegistrations.includes(vehicle.registration)
                          );
                        }
                      });

                    return filteredVehicles.length > 0 ? (
                      filteredVehicles.map((vehicle, index) => (
                        <MenuItem key={index} value={vehicle.registration}>
                          {vehicle.registration}
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled>All registrations in use</MenuItem>
                    );
                  })()}
              </Select>
            </FormControl>

            <LocalizationProvider dateAdapter={AdapterDateFns} locale={enGB}>
              <DesktopDatePicker
                label={
                  props.collection === 'fireextinguishers' ||
                  props.collection === 'tachocalibrations'
                    ? 'Service Date'
                    : 'Expiration Date'
                }
                format="dd/MM/yyyy"
                value={expiryDate}
                onChange={handleChangeDate}
                renderInput={(params) => <TextField {...params} />}
              />
            </LocalizationProvider>
          </Stack>
          <TextField
            id="comments"
            label="Record Note"
            multiline
            margin="none"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxRows={6}
            variant="outlined"
          />
        </Stack>
      </div>

      <div style={{ margin: '5px 0 0 50px' }}>
        <Input
          type="file"
          inputProps={{ accept: '.pdf,.jpg,.jpeg,.png' }}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          id="file-upload-input"
        />

        <label htmlFor="file-upload-input">
          <Button
            color="primary"
            startIcon={<AttachFileIcon />}
            variant="outlined"
            component="span"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'DOCUMENT'}
          </Button>
        </label>

        {file && (
          <Typography variant="body2" style={{ marginTop: 10 }}>
            {file.name}
          </Typography>
        )}
      </div>
      <DialogActions style={{ margin: '20px 45px' }}>
        <Button
          id="submitDialog"
          color="primary"
          variant="contained"
          startIcon={props.edit ? <SaveAsIcon /> : <SaveIcon />}
          disabled={loading}
          onClick={handleSave}
        >
          {props.edit ? 'Update' : 'Save'}
        </Button>

        <Button
          id="cancelDialog"
          color="secondary"
          variant="outlined"
          onClick={() => props.callback('Cancel')}
        >
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddService;
