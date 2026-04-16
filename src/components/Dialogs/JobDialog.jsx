import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogActions,
  TextField,
  Button,
  Typography,
  FormControlLabel,
  Radio,
  RadioGroup,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  AppBar,
  Toolbar,
  IconButton,
  Slide,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { Stack } from '@mui/material';
import { makeStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@material-ui/icons/Edit';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';
import AddCircleOutlineIcon from '@material-ui/icons/AddCircleOutline';
import RemoveCircleOutlineIcon from '@material-ui/icons/RemoveCircleOutline';
import { useAuthContext } from '../../hooks/useAuthContext';
import { useCollection } from '../../hooks/useCollection';
import { useFirestore } from '../../hooks/useFirestore';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import { v4 as uuidv4 } from 'uuid';
import { projectFirestore, timestamp } from '../../firebase/config';
import {
  DIARY_COLLECTION,
  filterByScope,
  enumerateRepeatingDays,
  buildJobDocuments,
} from '../../utils/diaryHelpers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker';
import toast from 'react-hot-toast';

const useStyles = makeStyles((theme) => ({
  appBar: {
    position: 'relative',
    backgroundColor: '#1976d2',
  },
  title: {
    marginLeft: theme.spacing(2),
    flex: 1,
  },
  section: {
    padding: '16px 32px',
  },
  dayTable: {
    marginTop: '16px',
    '& .MuiTableCell-root': {
      padding: '4px 8px',
    },
  },
  editedRow: {
    backgroundColor: '#fff3e0',
  },
  accordion: {
    '&.MuiAccordion-root': {
      marginBottom: 4,
      '&:before': { display: 'none' },
    },
  },
  accordionEdited: {
    backgroundColor: '#fff3e0',
  },
  stopRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '4px 0',
  },
  stopsTimeline: {
    borderLeft: '3px solid #1976d2',
    marginLeft: 16,
    paddingLeft: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
}));

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const JobDialog = ({
  open,
  mode = 'editGroup',
  groupDocs,
  editData,
  onClose,
  onSaved,
}) => {
  const classes = useStyles();
  const { user } = useAuthContext();
  const { documents: drivers } = useCollection('drivers');
  const { documents: vehicles } = useCollection('vehicles');
  const { addDocumentBatch } = useFirestore(DIARY_COLLECTION);

  const isAdd = mode === 'add';
  const isEditSingle = mode === 'editSingle';
  const isEditGroup = mode === 'editGroup';

  // Derive isRepeating label from data (editGroup only)
  const isRepeatingGroup =
    isEditGroup &&
    (groupDocs?.[0]?.isRepeating === true ||
      groupDocs?.[0]?.jobType === 'repeating');

  // --- Shared fields ---
  const [client, setClient] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const [pax, setPax] = useState('');
  const [quote, setQuote] = useState('');
  const [comment, setComment] = useState('');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [licenceError, setLicenceError] = useState('');

  // --- Per-day entries ---
  const [dayEntries, setDayEntries] = useState([]);

  // --- Scope (editGroup only) ---
  const [scopeMode, setScopeMode] = useState('all');
  const [futureOnly, setFutureOnly] = useState(false);
  const [rangeFrom, setRangeFrom] = useState(null);
  const [rangeTo, setRangeTo] = useState(null);

  // --- Repeating (add mode only) ---
  const [isRepeating, setIsRepeating] = useState(false);
  const [endDate, setEndDate] = useState(new Date());
  const [repeatDays, setRepeatDays] = useState([]);

  // --- UI ---
  const [saving, setSaving] = useState(false);

  // --- Computed ---
  const driverOptions = useMemo(() => {
    if (!drivers) return [];
    return [...drivers].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '')
    );
  }, [drivers]);

  const vehicleOptions = useMemo(() => {
    if (!vehicles) return [];
    return vehicles
      .filter((v) => !v.inactive)
      .sort((a, b) =>
        (a.registration || '').localeCompare(b.registration || '')
      );
  }, [vehicles]);

  const isDriverDoc = selectedDriver && typeof selectedDriver === 'object';
  const isVehicleDoc = selectedVehicle && typeof selectedVehicle === 'object';

  // Start date for repeating (from first day entry)
  const startDate = useMemo(() => {
    if (dayEntries.length > 0 && dayEntries[0].date?.seconds) {
      return new Date(dayEntries[0].date.seconds * 1000);
    }
    return new Date();
  }, [dayEntries]);

  // Computed repeating days count
  const computedDays = useMemo(() => {
    if (!isAdd || !isRepeating) return 0;
    return enumerateRepeatingDays(startDate, endDate, repeatDays).length;
  }, [isAdd, isRepeating, startDate, endDate, repeatDays]);

  // Keep endDate >= startDate
  useEffect(() => {
    if (isAdd && isRepeating && startDate > endDate) {
      setEndDate(startDate);
    }
  }, [startDate, isAdd, isRepeating]);

  // --- Init from props on open ---
  useEffect(() => {
    if (!open) return;

    if (isAdd) {
      // Reset all fields for add mode
      setClient('');
      setContactName('');
      setContactPhone('');
      setContactEmail('');
      setPax('');
      setQuote('');
      setComment('');
      setSelectedDriver(null);
      setSelectedVehicle(null);
      setLicenceError('');
      setIsRepeating(false);
      setEndDate(new Date());
      setRepeatDays([]);
      setScopeMode('all');
      setFutureOnly(false);
      setRangeFrom(null);
      setRangeTo(null);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setDayEntries([
        {
          id: uuidv4(),
          date: { seconds: Math.floor(today.getTime() / 1000) },
          stops: [
            { location: '', time: '', notes: '' },
            { location: '', time: '', notes: '' },
            { location: '', time: '', notes: '' },
          ],
          individuallyEdited: false,
          _dirty: true,
          _isNew: true,
        },
      ]);
      return;
    }

    if (isEditSingle && editData) {
      const d = editData;
      setClient(d.client || '');
      setContactName(d.contactName || d.contactDetails || '');
      setContactPhone(d.contactPhone || '');
      setContactEmail(d.contactEmail || '');
      setPax(d.pax ? String(d.pax) : '');
      setQuote(d.quote ? String(d.quote) : '');
      setComment(d.comment || '');

      // Restore driver
      if (d.driverId && drivers) {
        const found = drivers.find((dr) => dr.id === d.driverId);
        setSelectedDriver(found || d.driverName || null);
      } else if (d.driverName) {
        setSelectedDriver(d.driverName);
      } else {
        setSelectedDriver(null);
      }

      // Restore vehicle
      if (d.vehicleId && vehicles) {
        const found = vehicles.find((v) => v.id === d.vehicleId);
        setSelectedVehicle(found || d.vehicleRegistration || null);
      } else if (d.vehicleRegistration) {
        setSelectedVehicle(d.vehicleRegistration);
      } else {
        setSelectedVehicle(null);
      }

      // Build stops from existing data
      let docStops = d.stops || [];
      if (docStops.length === 0 && (d.departing || d.stop)) {
        const synthetic = [];
        if (d.departing) {
          synthetic.push({
            location: d.departing,
            time: d.startTime || d.departTime || '',
            notes: '',
          });
        }
        if (d.stop) {
          synthetic.push({
            location: d.stop,
            time: d.endTime || d.returnTime || '',
            notes: '',
          });
        }
        docStops = synthetic;
      }
      // Pad to at least 3 stops
      while (docStops.length < 3) {
        docStops.push({ location: '', time: '', notes: '' });
      }

      const docDate = d.date || d.startDate;
      setDayEntries([
        {
          id: d.id,
          _collectionPath: d._collectionPath,
          date: docDate,
          stops: docStops.map((s) => ({ ...s })),
          individuallyEdited: d.individuallyEdited === true,
          _dirty: false,
        },
      ]);

      setIsRepeating(false);
      setRepeatDays([]);
      setScopeMode('all');
      setFutureOnly(false);
      setRangeFrom(null);
      setRangeTo(null);
      return;
    }

    if (isEditGroup && groupDocs && groupDocs.length > 0) {
      const first = groupDocs[0];
      setClient(first.client || '');
      setContactName(first.contactName || first.contactDetails || '');
      setContactPhone(first.contactPhone || '');
      setContactEmail(first.contactEmail || '');
      setPax(first.pax ? String(first.pax) : '');
      setQuote(first.quote ? String(first.quote) : '');
      setComment(first.comment || '');

      // Restore driver
      if (first.driverId && drivers) {
        const found = drivers.find((dr) => dr.id === first.driverId);
        setSelectedDriver(found || first.driverName || null);
      } else if (first.driverName) {
        setSelectedDriver(first.driverName);
      } else {
        setSelectedDriver(null);
      }

      // Restore vehicle
      if (first.vehicleId && vehicles) {
        const found = vehicles.find((v) => v.id === first.vehicleId);
        setSelectedVehicle(found || first.vehicleRegistration || null);
      } else if (first.vehicleRegistration) {
        setSelectedVehicle(first.vehicleRegistration);
      } else {
        setSelectedVehicle(null);
      }

      // Populate per-day entries
      const isRepeatingJob =
        first.isRepeating === true || first.jobType === 'repeating';

      if (isRepeatingJob) {
        // Repeating: load only the first doc's itinerary as a template
        let docStops = first.stops || [];
        if (docStops.length === 0 && (first.departing || first.stop)) {
          const synthetic = [];
          if (first.departing) {
            synthetic.push({
              location: first.departing,
              time: first.startTime || first.departTime || '',
              notes: '',
            });
          }
          if (first.stop) {
            synthetic.push({
              location: first.stop,
              time: first.endTime || first.returnTime || '',
              notes: '',
            });
          }
          docStops = synthetic;
        }
        while (docStops.length < 3) {
          docStops.push({ location: '', time: '', notes: '' });
        }
        setDayEntries([
          {
            id: first.id,
            _collectionPath: first._collectionPath,
            date: first.date || first.startDate,
            stops: docStops.map((s) => ({ ...s })),
            individuallyEdited: false,
            _dirty: false,
          },
        ]);
      } else {
        // Multi-day: load all docs as individual day entries
        setDayEntries(
          groupDocs.map((doc) => {
            let docStops = doc.stops || [];
            if (docStops.length === 0 && (doc.departing || doc.stop)) {
              const synthetic = [];
              if (doc.departing) {
                synthetic.push({
                  location: doc.departing,
                  time: doc.startTime || doc.departTime || '',
                  notes: '',
                });
              }
              if (doc.stop) {
                synthetic.push({
                  location: doc.stop,
                  time: doc.endTime || doc.returnTime || '',
                  notes: '',
                });
              }
              docStops = synthetic;
            }

            return {
              id: doc.id,
              _collectionPath: doc._collectionPath,
              date: doc.date || doc.startDate,
              stops: docStops,
              individuallyEdited: doc.individuallyEdited === true,
              _dirty: false,
            };
          })
        );
      }

      setIsRepeating(false);
      setRepeatDays([]);
      setScopeMode('all');
      setFutureOnly(false);
      setRangeFrom(null);
      setRangeTo(null);
    }
  }, [open, mode, groupDocs, editData, drivers, vehicles]);

  // --- Licence check ---
  useEffect(() => {
    if (!isDriverDoc || !isVehicleDoc) {
      setLicenceError('');
      return;
    }
    const required = selectedVehicle.licenceRequired;
    if (required === 'D' && !selectedDriver.hasD) {
      setLicenceError(
        `${selectedDriver.name} does not hold a D licence required for ${selectedVehicle.registration}`
      );
    } else if (
      required === 'D1' &&
      !selectedDriver.hasD1 &&
      !selectedDriver.hasD
    ) {
      setLicenceError(
        `${selectedDriver.name} does not hold a D1 or D licence required for ${selectedVehicle.registration}`
      );
    } else {
      setLicenceError('');
    }
  }, [selectedDriver, selectedVehicle]);

  // --- Scope preview (repeating editGroup only) ---
  const affectedDocs = useMemo(
    () =>
      isRepeatingGroup
        ? filterByScope(groupDocs || [], {
            scopeMode,
            futureOnly,
            rangeFrom,
            rangeTo,
          })
        : [],
    [isRepeatingGroup, groupDocs, scopeMode, futureOnly, rangeFrom, rangeTo]
  );

  // --- Stop helpers ---
  const addStop = (dayIndex) => {
    setDayEntries((prev) =>
      prev.map((entry, i) =>
        i === dayIndex
          ? {
              ...entry,
              stops: [...entry.stops, { location: '', time: '', notes: '' }],
              _dirty: true,
            }
          : entry
      )
    );
  };

  const removeStop = (dayIndex, stopIndex) => {
    setDayEntries((prev) =>
      prev.map((entry, i) =>
        i === dayIndex
          ? {
              ...entry,
              stops: entry.stops.filter((_, si) => si !== stopIndex),
              _dirty: true,
            }
          : entry
      )
    );
  };

  const updateStop = (dayIndex, stopIndex, field, value) => {
    setDayEntries((prev) =>
      prev.map((entry, i) =>
        i === dayIndex
          ? {
              ...entry,
              stops: entry.stops.map((s, si) =>
                si === stopIndex ? { ...s, [field]: value } : s
              ),
              _dirty: true,
            }
          : entry
      )
    );
  };

  const updateEntryDate = (dayIndex, newDate) => {
    setDayEntries((prev) =>
      prev.map((entry, i) =>
        i === dayIndex
          ? { ...entry, date: { seconds: Math.floor(newDate.getTime() / 1000) }, _dirty: true }
          : entry
      )
    );
  };

  const addDayEntry = () => {
    const lastEntry = dayEntries[dayEntries.length - 1];
    let newDate = new Date();
    if (lastEntry?.date?.seconds) {
      newDate = new Date(lastEntry.date.seconds * 1000);
      newDate.setDate(newDate.getDate() + 1);
    }
    setDayEntries((prev) => [
      ...prev,
      {
        id: uuidv4(),
        date: { seconds: Math.floor(newDate.getTime() / 1000) },
        stops: [
          { location: '', time: '', notes: '' },
          { location: '', time: '', notes: '' },
          { location: '', time: '', notes: '' },
        ],
        individuallyEdited: false,
        _dirty: true,
        _isNew: true,
      },
    ]);
  };

  const removeDayEntry = (dayIndex) => {
    setDayEntries((prev) => {
      const entry = prev[dayIndex];
      if (entry._isNew) {
        return prev.filter((_, i) => i !== dayIndex);
      }
      return prev.map((e, i) =>
        i === dayIndex ? { ...e, _deleted: true, _dirty: true } : e
      );
    });
  };

  // --- Format date from Firestore timestamp ---
  const formatDate = (ts) => {
    if (!ts?.seconds) return '-';
    return new Intl.DateTimeFormat('en-GB').format(new Date(ts.seconds * 1000));
  };

  // --- Derive accordion summary from stops ---
  const stopsLabel = (entry) => {
    const s = entry.stops || [];
    if (s.length === 0) return 'No stops';
    const first = s[0]?.location || '?';
    const last = s.length > 1 ? s[s.length - 1]?.location || '?' : '';
    const middle = s.length > 2 ? s.length - 2 : 0;
    if (s.length === 1) return first;
    if (middle > 0)
      return `${first} \u2192 ${middle} stop${middle !== 1 ? 's' : ''} \u2192 ${last}`;
    return `${first} \u2192 ${last}`;
  };

  // --- Resolve driver/vehicle ---
  const resolveDriverFields = () => ({
    driverId: isDriverDoc ? selectedDriver.id : null,
    driverName: isDriverDoc
      ? selectedDriver.name
      : typeof selectedDriver === 'string' && selectedDriver
        ? selectedDriver
        : null,
  });

  const resolveVehicleFields = () => ({
    vehicleId: isVehicleDoc ? selectedVehicle.id : null,
    vehicleRegistration: isVehicleDoc
      ? selectedVehicle.registration
      : typeof selectedVehicle === 'string' && selectedVehicle
        ? selectedVehicle
        : null,
  });

  // --- Repeating helpers ---
  const toggleRepeatDay = (dayIdx) => {
    setRepeatDays((prev) =>
      prev.includes(dayIdx)
        ? prev.filter((d) => d !== dayIdx)
        : [...prev, dayIdx]
    );
  };

  // --- Availability check (add mode) ---
  const getTimeRange = (stops) => {
    if (!stops || stops.length === 0) return null;
    const times = stops.map((s) => s.time).filter((t) => t && t.includes(':'));
    if (times.length === 0) return null;
    times.sort();
    return { start: times[0], end: times[times.length - 1] };
  };

  const timesOverlap = (rangeA, rangeB) => {
    if (!rangeA || !rangeB) return true;
    if (rangeA.start === rangeA.end || rangeB.start === rangeB.end) {
      return rangeA.start <= rangeB.end && rangeB.start <= rangeA.end;
    }
    return rangeA.start < rangeB.end && rangeB.start < rangeA.end;
  };

  const checkAvailability = async (dates, stopsForDates, excludeIds = []) => {
    const conflicts = [];
    if (!isDriverDoc && !isVehicleDoc) return conflicts;

    const dateTimes = dates.map((d) => {
      const normalized = new Date(d);
      normalized.setHours(0, 0, 0, 0);
      return normalized.getTime();
    });

    const minDate = new Date(Math.min(...dateTimes));
    const maxDate = new Date(Math.max(...dateTimes));
    maxDate.setDate(maxDate.getDate() + 1);

    const snapshot = await projectFirestore
      .collection(DIARY_COLLECTION)
      .where('date', '>=', minDate)
      .where('date', '<', maxDate)
      .get();

    // Build a lookup for the new job's stops per date
    const getNewJobStops = (dateKey) => {
      if (Array.isArray(stopsForDates)) return stopsForDates;
      if (stopsForDates && typeof stopsForDates === 'object') return stopsForDates[dateKey];
      return null;
    };

    snapshot.docs.forEach((doc) => {
      if (excludeIds.includes(doc.id)) return;
      const entry = doc.data();

      let entryDate;
      if (entry.date?.seconds) {
        entryDate = new Date(entry.date.seconds * 1000);
      } else if (entry.startDate?.seconds) {
        entryDate = new Date(entry.startDate.seconds * 1000);
      } else {
        return;
      }
      entryDate.setHours(0, 0, 0, 0);

      if (!dateTimes.includes(entryDate.getTime())) return;

      const dateKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, '0')}-${String(entryDate.getDate()).padStart(2, '0')}`;
      const existingRange = getTimeRange(entry.stops);
      const newRange = getTimeRange(getNewJobStops(dateKey));

      if (!timesOverlap(newRange, existingRange)) return;

      const formatted = new Intl.DateTimeFormat('en-GB').format(entryDate);
      const timeInfo = existingRange ? ` (${existingRange.start}–${existingRange.end})` : '';
      if (isDriverDoc && entry.driverId === selectedDriver.id) {
        conflicts.push(
          `Driver ${selectedDriver.name} is already booked on ${formatted}${timeInfo} for "${entry.client}"`
        );
      }
      if (isVehicleDoc && entry.vehicleId === selectedVehicle.id) {
        conflicts.push(
          `Vehicle ${selectedVehicle.registration} is already booked on ${formatted}${timeInfo} for "${entry.client}"`
        );
      }
    });

    return conflicts;
  };

  // --- Dialog title ---
  const dialogTitle = useMemo(() => {
    if (isAdd) return 'Add Job To Diary';
    if (isEditSingle) return 'Edit Diary Entry';
    if (isRepeatingGroup) return 'Edit Repeating Job';
    return 'Edit Multi-Day Job';
  }, [isAdd, isEditSingle, isRepeatingGroup]);

  // --- Validation ---
  const validate = () => {
    if (isAdd) {
      // Require at least one stop with a location
      const hasLocation = dayEntries.some((entry) =>
        entry.stops.some((s) => (s.location || '').trim().length > 0)
      );
      if (!hasLocation) {
        toast.error('At least one stop with a location is required');
        return false;
      }
      return true;
    }
    // editSingle / editGroup: require client
    if (!client) {
      toast.error('Client is required');
      return false;
    }
    return true;
  };

  // --- Save: Add mode ---
  const handleSaveAdd = async () => {
    setSaving(true);
    try {
      let dates;
      let stopsForDates;

      if (isRepeating) {
        // Repeating: enumerate dates, use first day's stops as template
        dates = enumerateRepeatingDays(startDate, endDate, repeatDays);
        stopsForDates = dayEntries[0].stops.map(({ location, time, notes }) => ({
          location,
          time,
          notes,
        }));
      } else {
        // Use day entries directly
        const activeEntries = dayEntries.filter((e) => !e._deleted);
        dates = activeEntries.map((e) =>
          e.date?.seconds ? new Date(e.date.seconds * 1000) : new Date()
        );
        // For multi-day, build a grouped stopsPerDate map
        if (activeEntries.length > 1) {
          const grouped = {};
          for (const entry of activeEntries) {
            const d = entry.date?.seconds
              ? new Date(entry.date.seconds * 1000)
              : new Date();
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            grouped[key] = entry.stops.map(({ location, time, notes }) => ({
              location,
              time,
              notes,
            }));
          }
          stopsForDates = grouped;
          dates = Object.keys(grouped)
            .sort()
            .map((key) => {
              const [y, m, d] = key.split('-').map(Number);
              return new Date(y, m - 1, d);
            });
        } else {
          stopsForDates = activeEntries[0].stops.map(
            ({ location, time, notes }) => ({ location, time, notes })
          );
        }
      }

      if (dates.length === 0) {
        toast.error('No days match the selected criteria');
        setSaving(false);
        return;
      }

      // Availability check
      const conflicts = await checkAvailability(dates, stopsForDates);
      if (conflicts.length > 0) {
        conflicts.forEach((c) => toast.error(c));
        setSaving(false);
        return;
      }

      const items = buildJobDocuments({
        dates,
        stopsPerDate: stopsForDates,
        isRepeating,
        client,
        contactName,
        contactPhone,
        contactEmail,
        pax,
        quote,
        comment,
        ...resolveDriverFields(),
        ...resolveVehicleFields(),
        addedBy: user.displayName,
      });

      await addDocumentBatch(items);
      toast.success(
        `${dates.length} diary ${dates.length === 1 ? 'entry' : 'entries'} added`
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to add diary entries');
    } finally {
      setSaving(false);
    }
  };

  // --- Save: Edit single mode ---
  const handleSaveEditSingle = async () => {
    setSaving(true);
    try {
      const batch = projectFirestore.batch();
      const lastModified = timestamp.fromDate(new Date());
      const modifiedBy = user.displayName;

      const sharedUpdates = {
        client,
        contactName,
        contactPhone,
        contactEmail,
        pax,
        quote,
        comment,
        ...resolveDriverFields(),
        ...resolveVehicleFields(),
        lastModified,
        modifiedBy,
      };

      // Check if user added extra days — if so, generate a jobGroupId
      const activeEntries = dayEntries.filter((e) => !e._deleted);
      const hasNewDays = activeEntries.some((e) => e._isNew);
      const needsGroupId = hasNewDays && activeEntries.length > 1;
      const jobGroupId = needsGroupId
        ? editData?.jobGroupId || uuidv4()
        : editData?.jobGroupId || null;

      for (const entry of dayEntries) {
        if (!entry._dirty && !needsGroupId) continue;

        if (entry._deleted) {
          const ref = projectFirestore
            .collection(DIARY_COLLECTION)
            .doc(entry.id);
          batch.delete(ref);
          continue;
        }

        if (entry._isNew) {
          const ref = projectFirestore.collection(DIARY_COLLECTION).doc();
          batch.set(ref, {
            ...sharedUpdates,
            jobGroupId,
            isRepeating: false,
            individuallyEdited: false,
            date: timestamp.fromDate(new Date(entry.date.seconds * 1000)),
            stops: entry.stops,
            createdAt: lastModified,
            addedBy: modifiedBy,
          });
          continue;
        }

        // Update original entry
        const perDayUpdates = {
          ...sharedUpdates,
          stops: entry.stops,
          date: entry.date?.seconds
            ? timestamp.fromDate(new Date(entry.date.seconds * 1000))
            : entry.date,
        };
        // Assign jobGroupId if we created one
        if (needsGroupId) {
          perDayUpdates.jobGroupId = jobGroupId;
        }
        const ref = projectFirestore
          .collection(DIARY_COLLECTION)
          .doc(entry.id);
        batch.update(ref, perDayUpdates);
      }

      await batch.commit();

      const totalUpdated = dayEntries.filter(
        (e) => e._dirty || needsGroupId
      ).length;
      toast.success(
        `${totalUpdated} diary ${totalUpdated === 1 ? 'entry' : 'entries'} updated`
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update diary entry');
    } finally {
      setSaving(false);
    }
  };

  // --- Save: Edit group mode ---
  const handleSaveEditGroup = async () => {
    setSaving(true);
    try {
      const batch = projectFirestore.batch();
      const lastModified = timestamp.fromDate(new Date());
      const modifiedBy = user.displayName;

      const sharedUpdates = {
        client,
        contactName,
        contactPhone,
        contactEmail,
        pax,
        quote,
        comment,
        ...resolveDriverFields(),
        ...resolveVehicleFields(),
        lastModified,
        modifiedBy,
      };

      let totalUpdated = 0;

      if (isRepeatingGroup) {
        // Repeating: apply shared fields + template stops to all scope-filtered docs
        const templateStops = dayEntries[0]?.stops || [];

        for (const doc of affectedDocs) {
          const ref = projectFirestore
            .collection(DIARY_COLLECTION)
            .doc(doc.id);
          batch.update(ref, {
            ...sharedUpdates,
            stops: templateStops,
          });
        }
        totalUpdated = affectedDocs.length;
      } else {
        // Multi-day: update all docs with shared fields, plus per-day stops/dates
        const jobGroupId = groupDocs?.[0]?.jobGroupId || null;

        // Apply shared fields to all existing group docs
        for (const doc of groupDocs) {
          const ref = projectFirestore
            .collection(DIARY_COLLECTION)
            .doc(doc.id);
          batch.update(ref, sharedUpdates);
        }
        totalUpdated = groupDocs.length;

        // Apply dirty per-day entries (stops, dates, new days, deletions)
        for (const entry of dayEntries) {
          if (!entry._dirty) continue;

          if (entry._deleted) {
            const ref = projectFirestore
              .collection(DIARY_COLLECTION)
              .doc(entry.id);
            batch.delete(ref);
            continue;
          }

          if (entry._isNew) {
            const ref = projectFirestore.collection(DIARY_COLLECTION).doc();
            batch.set(ref, {
              ...sharedUpdates,
              jobGroupId,
              isRepeating: false,
              individuallyEdited: false,
              date: timestamp.fromDate(new Date(entry.date.seconds * 1000)),
              stops: entry.stops,
              createdAt: lastModified,
              addedBy: modifiedBy,
            });
            totalUpdated++;
            continue;
          }

          const perDayUpdates = {
            stops: entry.stops,
            date: entry.date?.seconds ? timestamp.fromDate(new Date(entry.date.seconds * 1000)) : entry.date,
            lastModified,
            modifiedBy,
          };
          const ref = projectFirestore
            .collection(DIARY_COLLECTION)
            .doc(entry.id);
          batch.update(ref, perDayUpdates);
        }
      }

      await batch.commit();

      toast.success(
        `${totalUpdated} diary ${totalUpdated === 1 ? 'entry' : 'entries'} updated`
      );
      onSaved?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update diary entries');
    } finally {
      setSaving(false);
    }
  };

  // --- Save dispatcher ---
  const handleSave = async () => {
    if (!validate()) return;
    if (licenceError) return;

    if (isAdd) return handleSaveAdd();
    if (isEditSingle) return handleSaveEditSingle();
    return handleSaveEditGroup();
  };

  return (
    <Dialog
      fullScreen
      open={open}
      onClose={onClose}
      TransitionComponent={Transition}
    >
      <AppBar className={classes.appBar}>
        <Toolbar>
          <IconButton edge="start" color="inherit" onClick={onClose}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6" className={classes.title}>
            {dialogTitle}
          </Typography>
          <Button
            color="inherit"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving || !!licenceError}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </Toolbar>
      </AppBar>

      <div style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
        {/* --- Shared Fields --- */}
        <div className={classes.section}>
          <Typography variant="h6" gutterBottom>
            {isAdd ? 'Job Details' : 'Shared Fields'}
          </Typography>

          <Stack direction="row" useFlexGap spacing={2}>
            <TextField
              value={client}
              onChange={(e) => setClient(e.target.value)}
              margin="normal"
              label="Client"
              InputLabelProps={!isAdd ? { className: 'required-label' } : undefined}
              fullWidth
              variant="outlined"
            />
            <TextField
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              margin="normal"
              label="Contact Name"
              fullWidth
              variant="outlined"
            />
          </Stack>

          <Stack direction="row" useFlexGap spacing={2}>
            <TextField
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              margin="normal"
              label="Contact Phone"
              variant="outlined"
              style={{ flex: 1 }}
            />
            <TextField
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              margin="normal"
              label="Contact Email"
              variant="outlined"
              style={{ flex: 1 }}
            />
          </Stack>

          <Stack direction="row" useFlexGap spacing={2}>
            <TextField
              value={pax}
              onChange={(e) => setPax(e.target.value)}
              margin="normal"
              label="PAX"
              type="number"
              variant="outlined"
              style={{ width: 100 }}
            />
            <TextField
              type="number"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              margin="normal"
              label="Price Quoted"
              variant="outlined"
            />
          </Stack>

          <TextField
            style={{ marginTop: '8px' }}
            label="Comments"
            multiline
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            maxRows={4}
            fullWidth
            variant="outlined"
          />

          {/* --- Driver / Vehicle --- */}
          <Stack
            direction="row"
            style={{ marginTop: '16px' }}
            useFlexGap
            spacing={2}
          >
            <Autocomplete
              freeSolo
              options={driverOptions}
              getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : opt?.name || ''
              }
              value={selectedDriver}
              onChange={(_, newVal) => setSelectedDriver(newVal)}
              onInputChange={(_, value, reason) => {
                if (reason === 'input') setSelectedDriver(value || null);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Driver" variant="outlined" />
              )}
              style={{ flex: 1 }}
            />
            <Autocomplete
              freeSolo
              options={vehicleOptions}
              getOptionLabel={(opt) =>
                typeof opt === 'string' ? opt : opt?.registration || ''
              }
              value={selectedVehicle}
              onChange={(_, newVal) => setSelectedVehicle(newVal)}
              onInputChange={(_, value, reason) => {
                if (reason === 'input') setSelectedVehicle(value || null);
              }}
              renderInput={(params) => (
                <TextField {...params} label="Vehicle" variant="outlined" />
              )}
              style={{ flex: 1 }}
            />
          </Stack>

          {licenceError && (
            <Typography
              style={{ color: 'red', marginTop: '8px', fontSize: '0.85rem' }}
            >
              {licenceError}
            </Typography>
          )}
        </div>

        {/* --- Scope Controls (repeating editGroup only) --- */}
        {isRepeatingGroup && (
          <div className={classes.section}>
            <Typography variant="h6" gutterBottom>
              Scope
            </Typography>

            <RadioGroup
              value={scopeMode}
              onChange={(e) => setScopeMode(e.target.value)}
            >
              <FormControlLabel
                value="all"
                control={<Radio size="small" />}
                label="All days"
              />
              <FormControlLabel
                value="unmodified"
                control={<Radio size="small" />}
                label="Unmodified only (skip individually edited)"
              />
              <FormControlLabel
                value="dateRange"
                control={<Radio size="small" />}
                label="Date range"
              />
            </RadioGroup>

            {scopeMode === 'dateRange' && (
              <Stack
                direction="row"
                spacing={2}
                style={{ marginTop: '8px', marginLeft: '32px' }}
              >
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DesktopDatePicker
                    label="From"
                    inputFormat="dd/MM/yyyy"
                    value={rangeFrom}
                    onChange={(v) => setRangeFrom(v)}
                    renderInput={(params) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                </LocalizationProvider>
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DesktopDatePicker
                    label="To"
                    inputFormat="dd/MM/yyyy"
                    value={rangeTo}
                    onChange={(v) => setRangeTo(v)}
                    renderInput={(params) => (
                      <TextField {...params} size="small" />
                    )}
                  />
                </LocalizationProvider>
              </Stack>
            )}

            <FormControlLabel
              control={
                <Checkbox
                  checked={futureOnly}
                  onChange={(e) => setFutureOnly(e.target.checked)}
                  size="small"
                />
              }
              label="Future only"
              style={{ marginTop: '4px' }}
            />

            <Typography
              variant="body2"
              style={{ color: '#666', marginTop: '4px' }}
            >
              This will update {affectedDocs.length} of {groupDocs?.length || 0}{' '}
              records
            </Typography>
          </div>
        )}

        {/* --- Per-Day Accordion Itinerary --- */}
        <div className={classes.section}>
          <Typography variant="h6" gutterBottom>
            {isAdd || isRepeatingGroup ? 'Itinerary' : 'Per-Day Itinerary'}
          </Typography>

          {dayEntries.map((entry, idx) =>
            entry._deleted ? null : (
            <Accordion
              key={entry.id}
              defaultExpanded={dayEntries.length <= 5 || entry._isNew}
              className={`${classes.accordion} ${entry.individuallyEdited ? classes.accordionEdited : ''}`}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                  }}
                >
                  <Typography style={{ fontWeight: 600, minWidth: 90 }}>
                    {entry._isNew ? 'New day' : formatDate(entry.date)}
                  </Typography>
                  <Typography variant="body2" style={{ color: '#555' }}>
                    {stopsLabel(entry)}
                  </Typography>
                  {entry.individuallyEdited && (
                    <EditIcon
                      style={{
                        color: '#e65100',
                        fontSize: '1rem',
                        marginLeft: 'auto',
                      }}
                    />
                  )}
                  {dayEntries.filter((e) => !e._deleted).length > 1 && (
                    <IconButton
                      size="small"
                      onClick={(e) => { e.stopPropagation(); removeDayEntry(idx); }}
                      style={{ color: '#d32f2f', marginLeft: entry.individuallyEdited ? 0 : 'auto' }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </div>
              </AccordionSummary>
              <AccordionDetails
                style={{ display: 'block', padding: '8px 16px 16px' }}
              >
                {!isRepeatingGroup && (
                  <div style={{ marginBottom: 12, maxWidth: 200 }}>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                      <DesktopDatePicker
                        label="Date"
                        inputFormat="dd/MM/yyyy"
                        value={entry.date?.seconds ? new Date(entry.date.seconds * 1000) : null}
                        onChange={(v) => { if (v) updateEntryDate(idx, v); }}
                        renderInput={(params) => (
                          <TextField {...params} size="small" variant="outlined" />
                        )}
                      />
                    </LocalizationProvider>
                  </div>
                )}
                <div className={classes.stopsTimeline}>
                  {entry.stops.map((stop, si) => {
                    const totalStops = entry.stops.length;
                    let label;
                    if (si === 0) label = 'Start';
                    else if (si === totalStops - 1 && totalStops > 1)
                      label = 'End';
                    else label = `Stop ${si}`;

                    return (
                      <div key={si} className={classes.stopRow}>
                        <Typography
                          variant="caption"
                          style={{
                            color:
                              si === 0
                                ? '#388e3c'
                                : si === totalStops - 1 && totalStops > 1
                                  ? '#c62828'
                                  : '#1976d2',
                            fontWeight: 700,
                            minWidth: 50,
                            textTransform: 'uppercase',
                            letterSpacing:
                              si === 0 ||
                              (si === totalStops - 1 && totalStops > 1)
                                ? 1
                                : 0,
                          }}
                        >
                          {label}
                        </Typography>
                        <TextField
                          value={stop.location}
                          onChange={(e) =>
                            updateStop(idx, si, 'location', e.target.value)
                          }
                          size="small"
                          variant="outlined"
                          label="Location"
                          style={{ flex: 1 }}
                        />
                        <TextField
                          value={stop.time}
                          onChange={(e) =>
                            updateStop(idx, si, 'time', e.target.value)
                          }
                          size="small"
                          variant="outlined"
                          label="Time"
                          placeholder="HH:MM"
                          style={{ width: 100 }}
                        />
                        <TextField
                          value={stop.notes}
                          onChange={(e) =>
                            updateStop(idx, si, 'notes', e.target.value)
                          }
                          size="small"
                          variant="outlined"
                          label="Notes"
                          style={{ flex: 1 }}
                        />
                        <IconButton
                          size="small"
                          onClick={() => removeStop(idx, si)}
                          style={{ color: '#d32f2f' }}
                        >
                          <RemoveCircleOutlineIcon fontSize="small" />
                        </IconButton>
                      </div>
                    );
                  })}
                  <Button
                    size="small"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={() => addStop(idx)}
                    style={{ marginTop: 4, color: '#1976d2' }}
                  >
                    Add Stop
                  </Button>
                </div>
              </AccordionDetails>
            </Accordion>
          ))}

          {/* Hide "Add Day" when repeating (add or edit) — dates are auto-generated */}
          {!isRepeatingGroup && !(isAdd && isRepeating) && (
            <Button
              startIcon={<AddCircleOutlineIcon />}
              onClick={addDayEntry}
              style={{ marginTop: 8, color: '#1976d2' }}
            >
              Add Day
            </Button>
          )}
        </div>

        {/* --- Repeating Controls (add mode only) --- */}
        {isAdd && (
          <div className={classes.section}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRepeating}
                  onChange={(e) => setIsRepeating(e.target.checked)}
                  size="small"
                />
              }
              label="Repeating"
            />

            {isRepeating && (
              <>
                <Stack
                  direction="row"
                  useFlexGap
                  spacing={2}
                  style={{ marginTop: '8px' }}
                >
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DesktopDatePicker
                      label="End Date"
                      inputFormat="dd/MM/yyyy"
                      value={endDate}
                      onChange={(v) => setEndDate(v)}
                      renderInput={(params) => <TextField {...params} />}
                    />
                  </LocalizationProvider>
                  <div style={{ maxWidth: '80px' }}>
                    <TextField
                      type="number"
                      disabled
                      value={computedDays}
                      label="Days"
                      variant="outlined"
                    />
                  </div>
                </Stack>

                <Stack
                  direction="row"
                  spacing={0}
                  style={{ marginTop: '4px', flexWrap: 'wrap' }}
                >
                  {DAY_LABELS.map((day, idx) => (
                    <FormControlLabel
                      key={idx}
                      control={
                        <Checkbox
                          checked={repeatDays.includes(idx)}
                          onChange={() => toggleRepeatDay(idx)}
                          size="small"
                        />
                      }
                      label={day}
                    />
                  ))}
                </Stack>
              </>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default JobDialog;
