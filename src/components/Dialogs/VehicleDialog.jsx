import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Tooltip,
  Switch,
  FormControlLabel,
  Checkbox,
  MenuItem,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useFirestore } from '../../hooks/useFirestore';
import { useCollection } from '../../hooks/useCollection';
import { defaultVehicleState } from '../../utils/defaultConfig';
import { Stack, Input } from '@mui/material';
import Typography from '@material-ui/core/Typography';
import SaveIcon from '@mui/icons-material/Save';
import SaveAsIcon from '@mui/icons-material/SaveAs';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { handleFileUpload } from '../../utils/fileHandler';
import toast from 'react-hot-toast';

const useStyles = makeStyles((theme) => ({
  root: {
    flex: 1,
    backgroundColor: 'paper',
  },
  dialogBox: {
    display: 'flex',
    alignItems: 'center',
  },
}));

const AddVehicleService = (props) => {
  const { user } = useAuthContext();
  const { addDocument, updateDocument } = useFirestore(props.collection);

  const classes = useStyles();

  const [registrationInvalid, setRegistrationInvalid] = useState(false);
  const [capacityInvalid, setCapacityInvalid] = useState(false);

  // States for form fields
  const [registration, setRegistration] = useState(
    defaultVehicleState.registration
  );
  const [make, setMake] = useState(defaultVehicleState.make);
  const [model, setModel] = useState(defaultVehicleState.model);
  const [capacity, setCapacity] = useState(defaultVehicleState.capacity);
  const [vin, setVIN] = useState(defaultVehicleState.vin);
  const [licenceRequired, setLicenceRequired] = useState(defaultVehicleState.licenceRequired);
  const [comment, setComment] = useState(defaultVehicleState.comment);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // New states for 'Inactive' and 'Non-Service Vehicle'
  const [inactive, setInactive] = useState(false);
  const [nonServiceVehicle, setNonServiceVehicle] = useState(false);

  // Check if in edit mode and populate form
  useEffect(() => {
    if (props.edit && props.editData) {
      setRegistration(props.editData.registration || '');
      setMake(props.editData.make || '');
      setModel(props.editData.model || '');
      setCapacity(props.editData.capacity || '');
      setVIN(props.editData.vin || '');
      setLicenceRequired(props.editData.licenceRequired || 'B');
      setComment(props.editData.comment || '');
      setFile(
        { name: props.editData.fileName, url: props.editData.fileUrl } || null
      );
      setInactive(props.editData.inactive || false); // Populate 'Inactive' state
      setNonServiceVehicle(props.editData.nonServiceVehicle || false); // Populate 'Non-Service Vehicle' state
    }
  }, [props.edit, props.editData]);

  // Form validation
  const validateForm = () => {
    const isRegistrationValid = registration.trim().length > 0;
    const isCapacityValid = capacity.trim().length > 0;

    setRegistrationInvalid(!isRegistrationValid);
    setCapacityInvalid(!isCapacityValid);

    return isRegistrationValid && isCapacityValid;
  };

  const handleSave = async () => {
    if (validateForm()) {
      const recordData = {
        registration,
        make,
        model,
        capacity,
        vin,
        licenceRequired,
        comment,
        fileName: file ? file.name : '',
        fileUrl: file ? file.url : '',
        inactive, // Include 'Inactive' state
        nonServiceVehicle, // Include 'Non-Service Vehicle' state
      };

      try {
        if (props.edit) {
          await updateDocument(props.editData.id, recordData);
          toast.success('Vehicle updated');
        } else {
          await addDocument(recordData);
          toast.success('Vehicle added');
        }
      } catch (err) {
        toast.error('Failed to save vehicle');
        return;
      }

      // Reset form
      setRegistration('');
      setMake('');
      setModel('');
      setCapacity('');
      setVIN('');
      setLicenceRequired('B');
      setFile(null);
      setInactive(false);
      setNonServiceVehicle(false);
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

  return (
    <Dialog
      open={props.show}
      onClose={() => props.callback('Cancel')}
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
    >
      <DialogTitle
        id="alert-dialog-title"
        style={{ margin: '10px', marginTop: '10px' }}
      >
        {props.title}
      </DialogTitle>
      <div style={{ margin: '0px 50px' }}>
        <Stack direction="row" useFlexGap spacing={2}>
          <TextField
            error={registrationInvalid}
            value={registration}
            onChange={(e) => {
              let input = e.target.value.toUpperCase();
              input = input.replace(/-/g, '');
              input = input.replace(/^(\d{1,3})([A-Z]+)(\d{1,9})$/, '$1-$2-$3');
              setRegistration(input);
            }}
            margin="normal"
            id="registration"
            label="Registration"
            fullWidth
            variant="outlined"
          />

          <TextField
            type="number"
            error={capacityInvalid}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            margin="normal"
            id="seats"
            label="Seating Capacity"
            fullWidth
            variant="outlined"
          />
        </Stack>
        <Stack direction="row" useFlexGap spacing={2}>
          <TextField
            value={make}
            onChange={(e) => setMake(e.target.value)}
            margin="normal"
            id="make"
            label="Make"
            fullWidth
            variant="outlined"
          />

          <TextField
            value={model}
            onChange={(e) => setModel(e.target.value)}
            margin="normal"
            id="model"
            label="Model"
            fullWidth
            variant="outlined"
          />
        </Stack>

        <TextField
          value={vin}
          onChange={(e) => setVIN(e.target.value.toUpperCase())}
          margin="normal"
          id="vin"
          label="VIN"
          fullWidth
          variant="outlined"
        />

        <TextField
          select
          value={licenceRequired}
          onChange={(e) => setLicenceRequired(e.target.value)}
          margin="normal"
          id="licenceRequired"
          label="Licence Required"
          fullWidth
          variant="outlined"
        >
          <MenuItem value="B">B</MenuItem>
          <MenuItem value="D1">D1</MenuItem>
          <MenuItem value="D">D</MenuItem>
        </TextField>

        <TextField
          style={{ marginTop: '15px' }}
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

        {/* New Inputs */}
        <FormControlLabel
          control={
            <Switch
              checked={inactive}
              onChange={(e) => setInactive(e.target.checked)}
              color="primary"
            />
          }
          label="Inactive"
          style={{ marginTop: '25px', marginLeft: '2px' }}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={nonServiceVehicle}
              onChange={(e) => setNonServiceVehicle(e.target.checked)}
              color="primary"
            />
          }
          label="Non-Service Vehicle"
          style={{ marginTop: '25px' }}
        />
      </div>
      <div style={{ margin: '25px 0 0 50px' }}>
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
            {loading ? 'Uploading...' : 'UPLOAD VRC'}
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
          color="primary"
          variant="contained"
          startIcon={props.edit ? <SaveAsIcon /> : <SaveIcon />}
          disabled={loading}
          onClick={handleSave}
        >
          {props.edit ? 'Update' : 'Save'}
        </Button>

        <Button
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

export default AddVehicleService;
