import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthContext } from './hooks/useAuthContext';

// pages
import Login from './pages/login/Login';
import Diary from './pages/diary/Diary';
import Settings from './pages/settings/Settings';
import ClippedDrawer from './app_bar';
import Drivers from './pages/drivers/Drivers';
import Vehicles from './pages/vehicles/Vehicles';
import FireExtinguishers from './pages/fireextinguishers/FireExtinguishers';
import Tax from './pages/tax/Tax';
import FirstAid from './pages/firstaid/FirstAid';
import TachoCalibration from './pages/tachocalibration/TachoCalibration';
import CVRT from './pages/cvrt/CVRT';
import PSV from './pages/psv/PSV';
import QuickAudit from './pages/quickAudit/quickAudit';
import Inspections from './pages/inspections/Inspections';
import Report from './pages/inspections/Report';
import Faults from './pages/faults/Faults';
import Maintenance from './pages/maintenance/Maintenance';
import Walkaround from './pages/walkaround/Walkaround';
import Walkarounds from './pages/walkaround/Walkarounds';
import WalkaroundQRCodes from './pages/walkaround/WalkaroundQRCodes';
import DailyPlanner from './pages/daily-planner/DailyPlanner';

function App() {
  const { authIsReady, user } = useAuthContext();

  return (
    <div className="App">
      <Toaster position="bottom-center" />
      {authIsReady && (
        <BrowserRouter>
          <ClippedDrawer>
            <Routes>
              <Route path="/" element={user ? <Navigate to="/quick-audit" /> : <Navigate to="/login" />} />
              <Route path="/cvrt" element={user ? <CVRT /> : <Navigate to="/" />} />
              <Route path="/daily-planner" element={user ? <DailyPlanner /> : <Navigate to="/" />} />
              <Route path="/diary" element={user ? <Diary /> : <Navigate to="/" />} />
              <Route path="/drivers" element={user ? <Drivers /> : <Navigate to="/" />} />
              <Route path="/fireextinguishers" element={user ? <FireExtinguishers /> : <Navigate to="/" />} />
              <Route path="/firstaid" element={user ? <FirstAid /> : <Navigate to="/" />} />
              <Route path="/inspections" element={user ? <Inspections /> : <Navigate to="/" />} />
              <Route path="/inspections/report" element={user ? <Report /> : <Navigate to="/" />} />
              <Route path="/faults" element={user ? <Faults /> : <Navigate to="/" />} />
              <Route path="/maintenance" element={user ? <Maintenance /> : <Navigate to="/" />} />
              <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
              <Route path="/psv" element={user ? <PSV /> : <Navigate to="/" />} />
              <Route path="/quick-audit" element={user ? <QuickAudit /> : <Navigate to="/" />} />
              <Route path="/settings" element={user ? <Settings /> : <Navigate to="/" />} />
              <Route path="/tachocalibration" element={user ? <TachoCalibration /> : <Navigate to="/" />} />
              <Route path="/tax" element={user ? <Tax /> : <Navigate to="/" />} />
              <Route path="/vehicles" element={user ? <Vehicles /> : <Navigate to="/" />} />
              <Route path="/walkaround-qr" element={user ? <WalkaroundQRCodes /> : <Navigate to="/" />} />
              <Route path="/walkarounds" element={user ? <Walkarounds /> : <Navigate to="/" />} />
              {/* Public walkaround routes - no auth required */}
              <Route path="/walkaround" element={<Walkaround />} />
              <Route path="/walkaround/:id" element={<Walkaround />} />
            </Routes>
          </ClippedDrawer>
        </BrowserRouter>
      )}
    </div>
  );
}

export default App;
