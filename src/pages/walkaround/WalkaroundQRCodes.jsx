import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@material-ui/core';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PrintIcon from '@mui/icons-material/Print';
import { QRCodeSVG } from 'qrcode.react';
import { useCollection } from '../../hooks/useCollection';

export default function WalkaroundQRCodes() {
  const { documents: vehicles } = useCollection('vehicles');
  const navigate = useNavigate();

  const activeVehicles = (vehicles || [])
    .filter((v) => !v.inactive)
    .sort((a, b) => (a.registration || '').localeCompare(b.registration || ''));

  const origin = window.location.origin;

  return (
    <div>
      <style>{`
        .qr-header {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 0;
        }
        .qr-header h2 {
          margin: 0;
          flex: 1;
        }
        .qr-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
          gap: 24px;
          padding: 16px 0;
        }
        .qr-card {
          border: 2px solid #333;
          border-radius: 8px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          break-inside: avoid;
        }
        .qr-card svg {
          margin-bottom: 12px;
          
        }
        .qr-reg {
          font-size: 1.5rem;
          font-weight: 700;
          color: #333;
          margin: 4px 0;
        }
        .qr-instruction {
          font-size: 0.85rem;
          color: #333;
          font-weight: bold;
          margin: 0;
        }

        @media print {
          .qr-header { display: none !important; }
          .qr-grid { gap: 16px; padding: 0; }
  
        }
      `}</style>

      <div className="qr-header">
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/walkarounds')}
          style={{ textTransform: 'none' }}
        >
          Back
        </Button>
        <h2>Vehicle Walkaround QR Codes</h2>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          style={{ textTransform: 'none' }}
        >
          Print
        </Button>
      </div>

      {activeVehicles.length === 0 && vehicles && <p>No active vehicles found.</p>}

      <div className="qr-grid">
        {activeVehicles.map((vehicle) => {
          const url = `${origin}/walkaround?reg=${encodeURIComponent(vehicle.registration)}`;
          return (
            <div className="qr-card" key={vehicle.id}>
              <QRCodeSVG value={url} size={160} level="M" />
              <p className="qr-reg">{vehicle.registration}</p>
              <p className="qr-instruction">Scan to record a digital walkaround check.</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
