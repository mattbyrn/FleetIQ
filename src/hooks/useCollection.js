import { useEffect, useState } from 'react';
import { projectFirestore } from '../firebase/config';

export const useCollection = (collection, constraints = []) => {
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState(null);
  const constraintsKey = JSON.stringify(constraints);

  useEffect(() => {
    let ref = projectFirestore.collection(collection);
    for (const [field, op, value] of constraints) {
      ref = ref.where(field, op, value);
    }

    const unsubscribe = ref.onSnapshot(
      (snapshot) => {
        let results = [];

        snapshot.docs.forEach((doc) => {
          results.push({ ...doc.data(), id: doc.id });
        });

        // update state
        setDocuments(results);
        setError(null);
      },
      (error) => {
        console.log(error);
        setError('Failed to get data.');
      }
    );

    // unsub on unmount
    return () => unsubscribe();
  }, [collection, constraintsKey]);

  return { documents, error };
};
