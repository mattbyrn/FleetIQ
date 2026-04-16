import { projectStorage } from '../firebase/config';

const uploadFile = async (file) => {
  if (!file) throw new Error('No file provided');

  const storageRef = projectStorage.ref(`uploads/${Date.now()}_${file.name}`);
  const snapshot = await storageRef.put(file);
  return await snapshot.ref.getDownloadURL();
};

export const handleFileUpload = async (file) => {
  console.log(projectStorage);
  if (!file) {
    console.error('No file selected.');
    return null;
  }

  const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!validTypes.includes(file.type)) {
    alert('Invalid file type. Please select a JPEG, PNG, or PDF file.');
    return null;
  }

  try {
    const url = await uploadFile(file, (progress) => {
      console.log(`Upload progress: ${progress}%`);
    });

    console.log('File uploaded successfully:', url);
    console.log(file);
    return { name: file.name, url: url };
  } catch (err) {
    console.error('File upload failed:', err.message);
    return null;
  }
};
