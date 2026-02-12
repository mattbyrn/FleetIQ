import { useState } from 'react';
import { projectFirestore, timestamp } from '../firebase/config';

export const useWalkaroundInspection = () => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Save NEW walkaround
  const saveWalkaround = async ({ registration, driverName, odometer, inspectionDate, items }) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      // Generate unique ID
      const now = Date.now();
      const id = `walkaround_${registration}_${now}`;

      // Build walkaround document
      const walkaroundDoc = {
        id,
        registration,
        inspector: driverName,
        odometer: Number(odometer),
        inspectionDate: timestamp.fromDate(inspectionDate),
        items, // { "Lights & Indicators": { condition: "satisfactory" | "requires_action", description: "" }, ... }
        createdAt: timestamp.now(),
        createdBy: driverName, // No auth, use driver name
        lastModified: timestamp.now()
      };

      // Save to /walkarounds/{id} (flat structure, no year/month)
      await projectFirestore
        .collection('walkarounds')
        .doc(id)
        .set(walkaroundDoc);

      setSuccess(true);
      setIsPending(false);

      return { success: true, id, path: `walkarounds/${id}` };
    } catch (err) {
      console.error('Error saving walkaround:', err);
      setError(err.message);
      setIsPending(false);
      return { success: false, error: err.message };
    }
  };

  // Load EXISTING walkaround
  const loadWalkaround = async (id) => {
    setIsPending(true);
    setError(null);

    try {
      const doc = await projectFirestore
        .collection('walkarounds')
        .doc(id)
        .get();

      if (!doc.exists) {
        setError('Walkaround not found');
        setIsPending(false);
        return { success: false, error: 'Walkaround not found' };
      }

      setIsPending(false);
      return { success: true, data: doc.data() };
    } catch (err) {
      console.error('Error loading walkaround:', err);
      setError(err.message);
      setIsPending(false);
      return { success: false, error: err.message };
    }
  };

  // UPDATE existing walkaround
  const updateWalkaround = async (id, updates) => {
    setIsPending(true);
    setError(null);
    setSuccess(false);

    try {
      await projectFirestore
        .collection('walkarounds')
        .doc(id)
        .update({
          ...updates,
          lastModified: timestamp.now()
        });

      setSuccess(true);
      setIsPending(false);
      return { success: true };
    } catch (err) {
      console.error('Error updating walkaround:', err);
      setError(err.message);
      setIsPending(false);
      return { success: false, error: err.message };
    }
  };

  return { saveWalkaround, loadWalkaround, updateWalkaround, isPending, error, success };
};
