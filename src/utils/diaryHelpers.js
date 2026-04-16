import { v4 as uuidv4 } from 'uuid';
import { projectFirestore, timestamp } from '../firebase/config';

export const DIARY_COLLECTION = 'diary';

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

/**
 * Returns an array of Date objects for every day between start and end (inclusive).
 */
export function enumerateDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Returns an array of Date objects for days matching specific weekdays within a range.
 * daysOfWeek: array of integers, 0=Sun, 1=Mon, ..., 6=Sat
 */
export function enumerateRepeatingDays(startDate, endDate, daysOfWeek) {
  return enumerateDays(startDate, endDate).filter((d) => daysOfWeek.includes(d.getDay()));
}

/**
 * Derives start/stop/times from stops array, falling back to old flat fields.
 */
export function resolveStopsDisplay(row) {
  const stops = row.stops || [];
  if (stops.length > 0) {
    return {
      start: stops[0]?.location || '',
      stop: stops.length > 1 ? stops[stops.length - 1]?.location || '' : '',
      startTime: stops[0]?.time || '',
      endTime: stops.length > 1 ? stops[stops.length - 1]?.time || '' : '',
    };
  }
  return {
    start: row.departing || '',
    stop: row.stop || '',
    startTime: row.startTime || row.departTime || '',
    endTime: row.endTime || row.returnTime || '',
  };
}

/**
 * Returns structured contact fields, falling back to old contactDetails.
 */
export function resolveContactDisplay(row) {
  return {
    contactName: row.contactName || row.contactDetails || '',
    contactPhone: row.contactPhone || '',
    contactEmail: row.contactEmail || '',
    billingAddress: row.billingAddress || '',
  };
}

/**
 * Returns a human-readable job label based on new schema fields,
 * falling back to old jobType for legacy docs.
 */
export function deriveJobLabel(row) {
  if (row.isRepeating) return 'Repeating';
  if (row.jobGroupId) return 'Multi-day';
  if (row.jobType === 'repeating') return 'Repeating';
  if (row.jobType === 'tour') return 'Tour / Journey';
  return 'Standalone';
}

/**
 * Builds an array of { collectionPath, doc } objects for a job.
 *
 * stopsPerDate:
 *   - Array of { location, time, notes } → same stops for every date (repeating or single)
 *   - Object keyed by 'YYYY-MM-DD' → per-day stops (multi-day itinerary)
 *
 * isRepeating: boolean
 * jobGroupId = null only when 1 date + not repeating
 */
export function buildJobDocuments({
  dates,
  stopsPerDate,
  isRepeating,
  client,
  contactName,
  contactPhone,
  contactEmail,
  billingAddress,
  pax,
  quote,
  comment,
  driverId,
  driverName,
  vehicleId,
  vehicleRegistration,
  addedBy,
}) {
  const isMulti = dates.length > 1 || isRepeating;
  const jobGroupId = isMulti ? uuidv4() : null;
  const createdAt = timestamp.fromDate(new Date());
  const isArray = Array.isArray(stopsPerDate);

  return dates.map((date) => {
    let stops;
    if (isArray) {
      stops = stopsPerDate;
    } else {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      stops = stopsPerDate[key] || [];
    }

    return {
      collectionPath: DIARY_COLLECTION,
      doc: {
        jobGroupId,
        isRepeating: !!isRepeating,
        individuallyEdited: false,
        date: timestamp.fromDate(date),
        stops,
        client,
        contactName,
        contactPhone: contactPhone || '',
        contactEmail: contactEmail || '',
        billingAddress: billingAddress || '',
        pax,
        quote,
        comment,
        driverId,
        driverName,
        vehicleId,
        vehicleRegistration,
        createdAt,
        addedBy,
      },
    };
  });
}

/**
 * Fetches all documents belonging to a job group.
 * Returns array of { ...data, id, _collectionPath } sorted by date ascending.
 */
export async function fetchJobGroup(jobGroupId) {
  const snapshot = await projectFirestore
    .collection(DIARY_COLLECTION)
    .where('jobGroupId', '==', jobGroupId)
    .get();
  return snapshot.docs
    .map((doc) => ({ ...doc.data(), id: doc.id, _collectionPath: DIARY_COLLECTION }))
    .sort((a, b) => ((a.date || a.startDate)?.seconds || 0) - ((b.date || b.startDate)?.seconds || 0));
}

/**
 * Filters docs by scope settings.
 * scopeMode: 'all' | 'unmodified' | 'dateRange'
 * futureOnly: boolean — composable with any scope mode
 */
export function filterByScope(docs, { scopeMode, futureOnly, rangeFrom, rangeTo }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return docs.filter((doc) => {
    const docDate = (doc.date || doc.startDate)?.seconds ? new Date((doc.date || doc.startDate).seconds * 1000) : null;

    if (futureOnly && docDate) {
      const d = new Date(docDate);
      d.setHours(0, 0, 0, 0);
      if (d <= today) return false;
    }

    if (scopeMode === 'unmodified') {
      if (doc.individuallyEdited === true) return false;
    }

    if (scopeMode === 'dateRange' && docDate) {
      const d = new Date(docDate);
      d.setHours(0, 0, 0, 0);
      if (rangeFrom) {
        const from = new Date(rangeFrom);
        from.setHours(0, 0, 0, 0);
        if (d < from) return false;
      }
      if (rangeTo) {
        const to = new Date(rangeTo);
        to.setHours(0, 0, 0, 0);
        if (d > to) return false;
      }
    }

    return true;
  });
}
