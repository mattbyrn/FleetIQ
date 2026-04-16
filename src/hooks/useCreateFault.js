import { useReducer, useState, useEffect } from 'react';
import { projectFirestore, timestamp } from '../firebase/config';
import { useAuthContext } from '../hooks/useAuthContext';

const initialState = {
  isPending: false,
  error: null,
  success: null,
};

const faultReducer = (state, action) => {
  switch (action.type) {
    case 'IS_PENDING':
      return { isPending: true, error: null, success: false };
    case 'ADDED':
      return { isPending: false, error: null, success: true };
    case 'ERROR':
      return { isPending: false, error: action.payload, success: false };
    default:
      return state;
  }
};

/**
 * Hook to create a fault record under /faults/
 * Usage: const { createFault, response } = useCreateFault();
 * createFault({ inspectionPath, item, description, inspector, vehicle, odometer, inspectionDate })
 */
export const useCreateFault = () => {
  const [response, dispatch] = useReducer(faultReducer, initialState);
  const [isCancelled, setIsCancelled] = useState(false);
  const { user } = useAuthContext();

  const dispatchIfActive = (action) => {
    if (!isCancelled) dispatch(action);
  };

  const createFault = async ({
    inspectionPath,
    item,
    description,
    inspector,
    vehicle,
    odometer,
    inspectionDate,
    priority = 'normal',
    images = [],
  }) => {
    dispatch({ type: 'IS_PENDING' });
    try {
      const createdAt = timestamp.fromDate(new Date());
      const createdBy = user ? user.displayName : 'unknown';

      const fault = {
        inspectionPath: inspectionPath || null,
        item: item || null,
        description: description || '',
        inspector: inspector || null,
        vehicle: vehicle || null,
        odometer: odometer !== undefined ? odometer : null,
        inspectionDate: inspectionDate || null,
        priority,
        images: images || [],
        status: 'open',
        createdAt,
        createdBy,
      };

      const faultsRef = projectFirestore.collection('faults');

      // Avoid creating duplicate faults for the same inspection item.
      // If a fault already exists for this inspectionPath+item, return it instead of creating a new document.
      if (inspectionPath && item) {
        try {
          const q = await faultsRef
            .where('inspectionPath', '==', inspectionPath)
            .where('item', '==', item)
            .limit(1)
            .get();
          if (!q.empty) {
            const existingDoc = q.docs[0];
            const existingData = existingDoc.data();
            dispatchIfActive({ type: 'ADDED' });
            return { success: true, id: existingDoc.id, existing: true, doc: existingData };
          }
        } catch (err) {
          console.warn('Error checking for existing fault', err);
        }
      }

      const added = await faultsRef.add(fault);
      dispatchIfActive({ type: 'ADDED' });
      return { success: true, id: added.id };
    } catch (err) {
      console.error('Failed to create fault', err);
      dispatchIfActive({ type: 'ERROR', payload: err.message });
      return { success: false, error: err.message };
    }
  };

  useEffect(() => {
    return () => setIsCancelled(true);
  }, []);

  return { createFault, response };
};

export default useCreateFault;
