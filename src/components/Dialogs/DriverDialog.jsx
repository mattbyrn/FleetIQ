import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Checkbox,
} from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enGB } from 'date-fns/locale';
import { useFirestore } from '../../hooks/useFirestore';
import { useDocument } from '../../hooks/useDocument';
import { defaultDriverState } from '../../utils/defaultConfig';
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
}));

const DriverDialog = (props) => {
  const { addDocument, updateDocument } = useFirestore(props.collection);
  const { document: vettingTypesDoc } = useDocument('settings', 'vettingTypes');
  const classes = useStyles();

  const vettingTypes = vettingTypesDoc?.types ?? [];

  const [nameInvalid, setNameInvalid] = useState(false);

  // Personal
  const [name, setName] = useState(defaultDriverState.name);
  const [phone, setPhone] = useState(defaultDriverState.phone);

  // Driving Licence
  const [licenceNumber, setLicenceNumber] = useState(
    defaultDriverState.licenceNumber
  );
  const [hasD1, setHasD1] = useState(defaultDriverState.hasD1);
  const [hasD, setHasD] = useState(defaultDriverState.hasD);
  const [licenceExpiry, setLicenceExpiry] = useState(
    defaultDriverState.licenceExpiry
  );

  // Driver CPC
  const [cpcNumber, setCpcNumber] = useState(defaultDriverState.cpcNumber);
  const [cpcExpiry, setCpcExpiry] = useState(defaultDriverState.cpcExpiry);

  // PSV Licence
  const [hasPsvLicence, setHasPsvLicence] = useState(
    defaultDriverState.hasPsvLicence
  );
  const [psvLicenceNumber, setPsvLicenceNumber] = useState(
    defaultDriverState.psvLicenceNumber
  );
  const [psvExpiry, setPsvExpiry] = useState(defaultDriverState.psvExpiry);

  // SPSV Licence
  const [hasSpsvLicence, setHasSpsvLicence] = useState(
    defaultDriverState.hasSpsvLicence
  );
  const [spsvLicenceNumber, setSpsvLicenceNumber] = useState(
    defaultDriverState.spsvLicenceNumber
  );
  const [spsvExpiry, setSpsvExpiry] = useState(defaultDriverState.spsvExpiry);

  // Vettings
  const [vettings, setVettings] = useState(defaultDriverState.vettings);

  // Notes & File
  const [comment, setComment] = useState(defaultDriverState.comment);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  // Populate form in edit mode
  useEffect(() => {
    if (props.edit && props.editData) {
      setName(props.editData.name || '');
      setPhone(props.editData.phone || '');
      setLicenceNumber(props.editData.licenceNumber || '');
      setHasD1(props.editData.hasD1 || false);
      setHasD(props.editData.hasD || false);
      setLicenceExpiry(
        props.editData.licenceExpiry
          ? new Date(props.editData.licenceExpiry.seconds * 1000)
          : null
      );
      setCpcNumber(props.editData.cpcNumber || '');
      setCpcExpiry(
        props.editData.cpcExpiry
          ? new Date(props.editData.cpcExpiry.seconds * 1000)
          : null
      );
      setHasPsvLicence(props.editData.hasPsvLicence || false);
      setPsvLicenceNumber(props.editData.psvLicenceNumber || '');
      setPsvExpiry(
        props.editData.psvExpiry
          ? new Date(props.editData.psvExpiry.seconds * 1000)
          : null
      );
      setHasSpsvLicence(props.editData.hasSpsvLicence || false);
      setSpsvLicenceNumber(props.editData.spsvLicenceNumber || '');
      setSpsvExpiry(
        props.editData.spsvExpiry
          ? new Date(props.editData.spsvExpiry.seconds * 1000)
          : null
      );
      // Populate vettings with backward compatibility
      if (props.editData.vettings) {
        const parsed = {};
        for (const [key, val] of Object.entries(props.editData.vettings)) {
          parsed[key] = {
            vetted: val.vetted || false,
            expiry: val.expiry ? new Date(val.expiry.seconds * 1000) : null,
          };
        }
        setVettings(parsed);
      } else {
        setVettings({});
      }
      setComment(props.editData.comment || '');
      if (props.editData.fileUrl) {
        setFile({ name: props.editData.fileName, url: props.editData.fileUrl });
      }
    }
  }, [props.edit, props.editData]);

  const validateForm = () => {
    const isNameValid = name.trim().length > 0;
    setNameInvalid(!isNameValid);
    return isNameValid;
  };

  const handleSave = async () => {
    if (validateForm()) {
      const recordData = {
        name,
        phone,
        licenceNumber,
        hasD1,
        hasD,
        licenceExpiry,
        cpcNumber,
        cpcExpiry,
        hasPsvLicence,
        psvLicenceNumber: hasPsvLicence ? psvLicenceNumber : '',
        psvExpiry: hasPsvLicence ? psvExpiry : null,
        hasSpsvLicence,
        spsvLicenceNumber: hasSpsvLicence ? spsvLicenceNumber : '',
        spsvExpiry: hasSpsvLicence ? spsvExpiry : null,
        vettings,
        comment,
        fileName: file ? file.name : '',
        fileUrl: file ? file.url : '',
      };

      try {
        if (props.edit) {
          await updateDocument(props.editData.id, recordData);
          toast.success('Driver updated');
        } else {
          await addDocument(recordData);
          toast.success('Driver added');
        }
      } catch (err) {
        toast.error('Failed to save driver');
        return;
      }

      // Reset form
      setName('');
      setPhone('');
      setLicenceNumber('');
      setHasD1(false);
      setHasD(false);
      setLicenceExpiry(null);
      setCpcNumber('');
      setCpcExpiry(null);
      setHasPsvLicence(false);
      setPsvLicenceNumber('');
      setPsvExpiry(null);
      setHasSpsvLicence(false);
      setSpsvLicenceNumber('');
      setSpsvExpiry(null);
      setVettings({});
      setComment('');
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

  return (
    <Dialog
      open={props.show}
      onClose={() => props.callback('Cancel')}
      aria-labelledby="driver-dialog-title"
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle
        id="driver-dialog-title"
        style={{ margin: '10px', marginTop: '10px' }}
      >
        {props.title}
      </DialogTitle>
      <div style={{ margin: '0px 50px' }}>
        {/* Personal */}
        <Typography variant="subtitle2" style={{ marginTop: '10px' }}>
          Personal
        </Typography>
        <Stack direction="row" useFlexGap spacing={2}>
          <TextField
            error={nameInvalid}
            value={name}
            onChange={(e) => setName(e.target.value)}
            margin="normal"
            id="name"
            label="Name*"
            fullWidth
            variant="outlined"
          />
          <TextField
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            margin="normal"
            id="phone"
            label="Phone"
            fullWidth
            variant="outlined"
          />
        </Stack>

        {/* Driving Licence */}
        <Typography variant="subtitle2" style={{ marginTop: '20px' }}>
          Driving Licence
        </Typography>
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          style={{ marginTop: '8px' }}
        >
          <TextField
            value={licenceNumber}
            onChange={(e) => setLicenceNumber(e.target.value)}
            id="licenceNumber"
            label="Licence Number"
            fullWidth
            variant="outlined"
          />
        </Stack>
        <Stack
          direction="row"
          useFlexGap
          spacing={2}
          style={{ marginTop: '8px' }}
        >
          <FormControlLabel
            control={
              <Checkbox
                checked={hasD1}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasD1(checked);
                  if (!checked) setHasD(false);
                }}
                color="primary"
              />
            }
            label="D1"
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={hasD}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasD(checked);
                  if (checked) setHasD1(true);
                }}
                color="primary"
              />
            }
            label="D"
          />
        </Stack>
        <LocalizationProvider dateAdapter={AdapterDateFns} locale={enGB}>
          <Stack
            direction="row"
            useFlexGap
            spacing={2}
            style={{ marginTop: '8px' }}
          >
            <DesktopDatePicker
              label="Licence Expiry"
              format="dd/MM/yyyy"
              value={licenceExpiry}
              onChange={(val) => setLicenceExpiry(val)}
              slotProps={{
                textField: { fullWidth: true, variant: 'outlined' },
              }}
            />
          </Stack>

          {/* Driver CPC */}
          <Typography variant="subtitle2" style={{ marginTop: '20px' }}>
            Driver CPC
          </Typography>
          <Stack
            direction="row"
            useFlexGap
            spacing={2}
            style={{ marginTop: '8px' }}
          >
            <TextField
              value={cpcNumber}
              onChange={(e) => setCpcNumber(e.target.value)}
              id="cpcNumber"
              label="CPC Number"
              fullWidth
              variant="outlined"
            />
            <DesktopDatePicker
              label="CPC Expiry"
              format="dd/MM/yyyy"
              value={cpcExpiry}
              onChange={(val) => setCpcExpiry(val)}
              slotProps={{
                textField: { fullWidth: true, variant: 'outlined' },
              }}
            />
          </Stack>

          {/* PSV Licence */}
          <Typography variant="subtitle2" style={{ marginTop: '20px' }}>
            PSV Licence
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={hasPsvLicence}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasPsvLicence(checked);
                  if (!checked) {
                    setPsvLicenceNumber('');
                    setPsvExpiry(null);
                  }
                }}
                color="primary"
              />
            }
            label="Does this driver hold a PSV licence?"
            style={{ marginTop: '8px', marginLeft: '2px' }}
          />
          {hasPsvLicence && (
            <Stack
              direction="row"
              useFlexGap
              spacing={2}
              style={{ marginTop: '8px' }}
            >
              <TextField
                value={psvLicenceNumber}
                onChange={(e) => setPsvLicenceNumber(e.target.value)}
                id="psvLicenceNumber"
                label="PSV Licence Number"
                fullWidth
                variant="outlined"
              />
              <DesktopDatePicker
                label="PSV Expiry"
                format="dd/MM/yyyy"
                value={psvExpiry}
                onChange={(val) => setPsvExpiry(val)}
                slotProps={{
                  textField: { fullWidth: true, variant: 'outlined' },
                }}
              />
            </Stack>
          )}

          {/* SPSV Licence */}
          <Typography variant="subtitle2" style={{ marginTop: '20px' }}>
            SPSV Licence
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={hasSpsvLicence}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setHasSpsvLicence(checked);
                  if (!checked) {
                    setSpsvLicenceNumber('');
                    setSpsvExpiry(null);
                  }
                }}
                color="primary"
              />
            }
            label="Does this driver hold an SPSV licence?"
            style={{ marginTop: '8px', marginLeft: '2px' }}
          />
          {hasSpsvLicence && (
            <Stack
              direction="row"
              useFlexGap
              spacing={2}
              style={{ marginTop: '8px' }}
            >
              <TextField
                value={spsvLicenceNumber}
                onChange={(e) => setSpsvLicenceNumber(e.target.value)}
                id="spsvLicenceNumber"
                label="SPSV Licence Number"
                fullWidth
                variant="outlined"
              />
              <DesktopDatePicker
                label="SPSV Expiry"
                format="dd/MM/yyyy"
                value={spsvExpiry}
                onChange={(val) => setSpsvExpiry(val)}
                slotProps={{
                  textField: { fullWidth: true, variant: 'outlined' },
                }}
              />
            </Stack>
          )}

          {/* Vettings */}
          {vettingTypes.length > 0 && (
            <>
              <Typography variant="subtitle2" style={{ marginTop: '20px' }}>
                Garda Vetting
              </Typography>
              {vettingTypes.map((type) => (
                <div key={type}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={vettings[type]?.vetted || false}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setVettings((prev) => ({
                            ...prev,
                            [type]: {
                              vetted: checked,
                              expiry: checked
                                ? prev[type]?.expiry || null
                                : null,
                            },
                          }));
                        }}
                        color="primary"
                      />
                    }
                    label={type}
                    style={{ marginTop: '8px', marginLeft: '2px' }}
                  />
                  {vettings[type]?.vetted && (
                    <Stack
                      direction="row"
                      useFlexGap
                      spacing={2}
                      style={{ marginTop: '8px' }}
                    >
                      <DesktopDatePicker
                        label={`${type} Expiry`}
                        format="dd/MM/yyyy"
                        value={vettings[type]?.expiry || null}
                        onChange={(val) => {
                          setVettings((prev) => ({
                            ...prev,
                            [type]: { ...prev[type], expiry: val },
                          }));
                        }}
                        slotProps={{
                          textField: { fullWidth: true, variant: 'outlined' },
                        }}
                      />
                    </Stack>
                  )}
                </div>
              ))}
            </>
          )}
        </LocalizationProvider>

        {/* Notes */}
        <TextField
          style={{ marginTop: '20px' }}
          id="comments"
          label="Notes"
          multiline
          margin="none"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={2}
          maxRows={6}
          fullWidth
          variant="outlined"
        />
      </div>

      {/* File Upload */}
      <div style={{ margin: '25px 0 0 50px' }}>
        <Input
          type="file"
          inputProps={{ accept: '.pdf,.jpg,.jpeg,.png' }}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          id="driver-file-upload-input"
        />

        <label htmlFor="driver-file-upload-input">
          <Button
            color="primary"
            startIcon={<AttachFileIcon />}
            variant="outlined"
            component="span"
            disabled={loading}
          >
            {loading ? 'Uploading...' : 'UPLOAD DOCUMENT'}
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

export default DriverDialog;
