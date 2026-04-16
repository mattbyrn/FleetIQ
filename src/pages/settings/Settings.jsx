import React, { useState } from 'react';
import { useDocument } from '../../hooks/useDocument';
import { projectFirestore } from '../../firebase/config';
import {
  Switch,
  TextField,
  Button,
  IconButton,
  Typography,
  Paper,
  FormControlLabel,
  Radio,
  RadioGroup,
  InputAdornment,
  Select,
  MenuItem,
} from '@material-ui/core';
import DeleteIcon from '@mui/icons-material/Delete';
import toast from 'react-hot-toast';

const sectionStyle = {
  padding: '20px',
  borderBottom: '1px solid #e0e0e0',
};

const sectionLastStyle = {
  padding: '20px',
};

const disabledOverlay = {
  opacity: 0.45,
  pointerEvents: 'none',
};

export default function Settings() {
  const { document: notifSettings } = useDocument('settings', 'notifications');

  const { document: vettingTypesDoc } = useDocument('settings', 'vettingTypes');

  const [newEmail, setNewEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [newVettingType, setNewVettingType] = useState('');

  const enabled = notifSettings?.enabled ?? false;
  const recipients = notifSettings?.recipients ?? [];
  const expiryThreshold = notifSettings?.expiryThreshold ?? 30;
  const expirySchedule = notifSettings?.expirySchedule ?? 'daily';

  const vettingTypes = vettingTypesDoc?.types ?? [];
  const vettingTypesRef = projectFirestore.collection('settings').doc('vettingTypes');

  const settingsRef = projectFirestore.collection('settings').doc('notifications');

  const saveRecipients = (updated) => {
    return settingsRef.set({ enabled, recipients: updated }, { merge: true });
  };

  const handleToggle = async () => {
    try {
      await settingsRef.set({ enabled: !enabled, recipients }, { merge: true });
      toast.success(!enabled ? 'Notifications enabled' : 'Notifications disabled');
    } catch (err) {
      toast.error('Failed to update notifications');
    }
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleAddEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    if (!isValidEmail(trimmed)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    if (recipients.some((r) => r.email === trimmed)) {
      setEmailError('This email is already added');
      return;
    }

    setEmailError('');
    const updated = [...recipients, { email: trimmed, category: 'both' }];
    try {
      await saveRecipients(updated);
      toast.success(`Added ${trimmed}`);
      setNewEmail('');
    } catch (err) {
      toast.error('Failed to add recipient');
    }
  };

  const handleRemoveEmail = async (email) => {
    const updated = recipients.filter((r) => r.email !== email);
    try {
      await saveRecipients(updated);
      toast.success(`Removed ${email}`);
    } catch (err) {
      toast.error('Failed to remove recipient');
    }
  };

  const handleCategoryChange = async (email, category) => {
    const updated = recipients.map((r) => (r.email === email ? { ...r, category } : r));
    try {
      await saveRecipients(updated);
    } catch (err) {
      toast.error('Failed to update preference');
    }
  };

  const handleThresholdChange = async (e) => {
    const num = parseInt(e.target.value, 10);
    if (isNaN(num) || num < 1 || num > 365) {
      toast.error('Threshold must be between 1 and 365 days');
      e.target.value = expiryThreshold;
      return;
    }
    try {
      await settingsRef.set({ expiryThreshold: num }, { merge: true });
      toast.success(`Expiry threshold set to ${num} days`);
    } catch (err) {
      toast.error('Failed to update threshold');
    }
  };

  const handleScheduleChange = async (e) => {
    try {
      await settingsRef.set({ expirySchedule: e.target.value }, { merge: true });
      toast.success('Expiry schedule updated');
    } catch (err) {
      toast.error('Failed to update schedule');
    }
  };

  const handleAddVettingType = async () => {
    const trimmed = newVettingType.trim();
    if (!trimmed) return;
    if (vettingTypes.includes(trimmed)) {
      toast.error('This vetting type already exists');
      return;
    }
    try {
      await vettingTypesRef.set({ types: [...vettingTypes, trimmed] }, { merge: true });
      toast.success(`Added "${trimmed}"`);
      setNewVettingType('');
    } catch (err) {
      toast.error('Failed to add vetting type');
    }
  };

  const handleRemoveVettingType = async (type) => {
    const updated = vettingTypes.filter((t) => t !== type);
    try {
      await vettingTypesRef.set({ types: updated }, { merge: true });
      toast.success(`Removed "${type}"`);
    } catch (err) {
      toast.error('Failed to remove vetting type');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px' }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>

      <Paper style={{ marginTop: '16px', overflow: 'hidden' }}>
        {/* ── Enable / Disable ── */}
        <div style={sectionStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                Email Notifications
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Send alerts for faults and upcoming compliance expiries.
              </Typography>
            </div>
            <Switch checked={enabled} onChange={handleToggle} color="primary" />
          </div>
        </div>

        {/* ── Expiry Settings ── */}
        <div style={{ ...sectionStyle, ...(enabled ? {} : disabledOverlay) }}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: '4px' }}>
            Expiry Alerts
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: '12px' }}>
            Configure how far in advance to warn and how often to send reminders.
          </Typography>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '4px' }}>
                Alert window
              </Typography>
              <TextField
                key={expiryThreshold}
                type="number"
                size="small"
                variant="outlined"
                defaultValue={expiryThreshold}
                inputProps={{ min: 1, max: 365 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">days</InputAdornment>,
                }}
                onBlur={handleThresholdChange}
                style={{ width: '140px' }}
              />
            </div>
            <div>
              <Typography variant="caption" color="textSecondary" style={{ display: 'block', marginBottom: '4px' }}>
                Send frequency
              </Typography>
              <Select
                value={expirySchedule}
                onChange={handleScheduleChange}
                variant="outlined"
                style={{ height: '40px', minWidth: '160px' }}
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="every-3-days">Every 3 days</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="fortnightly">Fortnightly</MenuItem>
              </Select>
            </div>
          </div>
        </div>

        {/* ── Recipients ── */}
        <div style={{ ...sectionLastStyle, ...(enabled ? {} : disabledOverlay) }}>
          <Typography variant="subtitle2" style={{ fontWeight: 600, marginBottom: '4px' }}>
            Recipients
          </Typography>
          <Typography variant="body2" color="textSecondary" style={{ marginBottom: '16px' }}>
            Manage who receives notification emails and what they receive.
          </Typography>

          {recipients.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {recipients.map((r) => (
                <div
                  key={r.email}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" style={{ fontWeight: 500 }}>
                      {r.email}
                    </Typography>
                    <RadioGroup
                      row
                      value={r.category || 'both'}
                      onChange={(e) => handleCategoryChange(r.email, e.target.value)}
                      style={{ marginTop: '2px' }}
                    >
                      <FormControlLabel
                        value="faults"
                        control={<Radio size="small" color="primary" />}
                        label={<Typography variant="body2">Faults</Typography>}
                      />
                      <FormControlLabel
                        value="expiry"
                        control={<Radio size="small" color="primary" />}
                        label={<Typography variant="body2">Expiry</Typography>}
                      />
                      <FormControlLabel
                        value="both"
                        control={<Radio size="small" color="primary" />}
                        label={<Typography variant="body2">Both</Typography>}
                      />
                    </RadioGroup>
                  </div>
                  <IconButton size="small" onClick={() => handleRemoveEmail(r.email)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          {recipients.length === 0 && (
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: '16px' }}>
              No recipients added yet.
            </Typography>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="email@example.com"
              value={newEmail}
              onChange={(e) => {
                setNewEmail(e.target.value);
                setEmailError('');
              }}
              onKeyDown={handleKeyDown}
              error={!!emailError}
              helperText={emailError}
              style={{ flex: 1 }}
            />
            <Button variant="contained" color="primary" onClick={handleAddEmail} style={{ height: '40px' }}>
              Add
            </Button>
          </div>
        </div>
      </Paper>

      {/* ── Vetting Types ── */}
      <Paper style={{ marginTop: '16px', overflow: 'hidden' }}>
        <div style={sectionStyle}>
          <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
            Garda Vetting
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Define the vetting types available when adding or editing drivers.
          </Typography>
        </div>

        <div style={sectionLastStyle}>
          {vettingTypes.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {vettingTypes.map((type) => (
                <div
                  key={type}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    border: '1px solid #e0e0e0',
                    backgroundColor: '#fafafa',
                  }}
                >
                  <Typography variant="body2" style={{ flex: 1, fontWeight: 500 }}>
                    {type}
                  </Typography>
                  <IconButton size="small" onClick={() => handleRemoveVettingType(type)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </div>
              ))}
            </div>
          )}

          {vettingTypes.length === 0 && (
            <Typography variant="body2" color="textSecondary" style={{ marginBottom: '16px' }}>
              No vetting types added yet.
            </Typography>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            <TextField
              size="small"
              variant="outlined"
              placeholder="e.g. Garda Vetting"
              value={newVettingType}
              onChange={(e) => setNewVettingType(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddVettingType();
                }
              }}
              style={{ flex: 1 }}
            />
            <Button variant="contained" color="primary" onClick={handleAddVettingType} style={{ height: '40px' }}>
              Add
            </Button>
          </div>
        </div>
      </Paper>
    </div>
  );
}
