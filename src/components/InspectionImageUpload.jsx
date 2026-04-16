import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  CircularProgress,
  Typography,
} from '@mui/material';
import {
  AddAPhoto as AddAPhotoIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { projectStorage } from '../firebase/config';
import toast from 'react-hot-toast';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png'];

export default function InspectionImageUpload({
  images = [],
  onChange,
  storagePath,
  disabled = false,
  maxImages = 5,
}) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState([]);

  const handleFileSelect = async (e) => {
    console.debug('InspectionImageUpload: file input change', e.target.files);
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Reset input so selecting the same file again triggers onChange
    e.target.value = '';

    const remaining = maxImages - images.length;
    const toUpload = files.slice(0, remaining);

    for (const file of toUpload) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Unsupported file type. Use JPG or PNG.');
        console.warn(
          'InspectionImageUpload: unsupported file type',
          file.type,
          file.name
        );
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File too large. Max 10 MB.');
        console.warn(
          'InspectionImageUpload: file too large',
          file.size,
          file.name
        );
        continue;
      }

      const uploadId = `${Date.now()}_${file.name}`;
      setUploading((prev) => [...prev, uploadId]);

      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `${storagePath}/${Date.now()}_${safeName}`;
        const storageRef = projectStorage.ref().child(path);

        // Start upload and listen for progress
        const uploadTask = storageRef.put(file);
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round(
              (snapshot.bytesTransferred / snapshot.totalBytes) * 100
            );
            console.debug(
              'InspectionImageUpload: upload progress',
              file.name,
              progress
            );
          },
          (error) => {
            console.error('InspectionImageUpload: upload error', error);
          }
        );

        const snapshot = await uploadTask;
        const fileUrl = await snapshot.ref.getDownloadURL();

        console.debug('InspectionImageUpload: uploaded', file.name, fileUrl);
        onChange((prev) => [...prev, { fileName: file.name, fileUrl }]);
      } catch (err) {
        console.error('Image upload failed', err);
        toast.error('Image upload failed');
      } finally {
        setUploading((prev) => prev.filter((id) => id !== uploadId));
      }
    }
  };

  const handleRemove = (index) => {
    onChange((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: images.length > 0 || uploading.length > 0 ? 1.5 : 0,
        }}
      >
        {images.map((img, idx) => (
          <Box
            key={img.fileUrl}
            sx={{
              position: 'relative',
              width: 100,
              height: 75,
              borderRadius: 1,
              overflow: 'hidden',
              border: '1px solid',
              borderColor: 'grey.300',
            }}
          >
            <img
              src={img.fileUrl}
              alt={img.fileName || 'photo'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            {!disabled && (
              <IconButton
                size="small"
                onClick={() => handleRemove(idx)}
                sx={{
                  position: 'absolute',
                  top: 2,
                  right: 2,
                  bgcolor: 'rgba(0,0,0,0.55)',
                  color: '#fff',
                  p: 0.3,
                  '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' },
                }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
          </Box>
        ))}

        {uploading.map((id) => (
          <Box
            key={id}
            sx={{
              width: 100,
              height: 75,
              borderRadius: 1,
              border: '1px dashed',
              borderColor: 'grey.400',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CircularProgress size={24} />
          </Box>
        ))}
      </Box>

      {images.length < maxImages && !disabled && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            capture="environment"
            multiple
            hidden
            onChange={handleFileSelect}
          />
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddAPhotoIcon />}
            onClick={() => fileInputRef.current?.click()}
            sx={{ textTransform: 'none' }}
          >
            Add Photos
          </Button>
        </>
      )}
    </Box>
  );
}
