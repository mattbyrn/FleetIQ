import {
  Assessment,
  Create,
  DesktopWindows,
  ImportContacts,
  Settings,
  Person,
  DirectionsBus,
} from '@material-ui/icons';
import SpeedIcon from '@mui/icons-material/Speed';
import FireExtinguisherIcon from '@mui/icons-material/FireExtinguisher';
import MedicalServicesOutlinedIcon from '@mui/icons-material/MedicalServicesOutlined';
import EuroIcon from '@mui/icons-material/Euro';
import { useTranslation } from 'react-i18next';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import Build from '@mui/icons-material/Build';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import SearchIcon from '@mui/icons-material/Search';
import AssignmentLateIcon from '@mui/icons-material/AssignmentLate';
import EngineeringIcon from '@mui/icons-material/Engineering';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';
import DepartureBoardIcon from '@mui/icons-material/DepartureBoard';
function NavLinks() {
  let { t } = useTranslation();
  return {
    diary: {
      heading: t('Jobs'),
      icon: <DepartureBoardIcon />,
      links: {
        recordData: {
          text: t('Diary'),
          path: '/diary',
          icon: <ImportContacts />,
        },
        dailyPlanner: {
          text: t('Daily Planner'),
          path: '/daily-planner',
          icon: <ViewTimelineIcon />,
        },
      },
    },
    Expirables: {
      heading: t('Expirables'),
      icon: <EditCalendarIcon />,
      links: {
        cvrt: {
          text: t('CVRT'),
          path: '/cvrt',
          icon: <Build />,
        },

        tax: {
          text: t('Tax'),
          path: '/tax',
          icon: <EuroIcon />,
        },
        psv: {
          text: t('PSV'),
          path: '/psv',
          icon: <AirportShuttleIcon />,
        },
        fireExtinguishers: {
          text: t('Fire Extinguishers'),
          path: '/fireextinguishers',
          icon: <FireExtinguisherIcon />,
        },
        firstAid: {
          text: t('First Aid Kits'),
          path: '/firstaid',
          icon: <MedicalServicesOutlinedIcon />,
        },
        tachoCalibration: {
          text: t('Tachograph Calibration'),
          path: '/tachocalibration',
          icon: <SpeedIcon />,
        },
      },
    },
    audit: {
      heading: t('Expiration Check'),
      icon: <ImportContacts />,
      links: {
        quickAudit: {
          text: t('Expiration Check'),
          path: '/quick-audit',
          icon: <SearchIcon />,
        },
      },
    },

    inspections: {
      heading: t('Inspections'),
      icon: <ImportContacts />,
      links: {
        inspections: {
          text: t('Inspections'),
          path: '/inspections',
          icon: <AssignmentTurnedInIcon />,
        },
      },
    },
    walkarounds: {
      heading: t('Driver Walkarounds'),
      icon: <ImportContacts />,
      links: {
        walkarounds: {
          text: t('Driver Walkarounds'),
          path: '/walkarounds',
          icon: <ChecklistRtlIcon />,
        },
      },
    },

    faults: {
      heading: t('Discovered Faults'),
      icon: <ImportContacts />,
      links: {
        faults: {
          text: t('Discovered Faults'),
          path: '/faults',
          icon: <AssignmentLateIcon />,
        },
      },
    },
    maintenance: {
      heading: t('Job Sheets'),
      icon: <ImportContacts />,
      links: {
        faults: {
          text: t('Job Sheets'),
          path: '/maintenance',
          icon: <EngineeringIcon />,
        },
      },
    },

    registerVehicles: {
      heading: t('Vehicles'),
      icon: <ImportContacts />,
      links: {
        registerVehicle: {
          text: t('Vehicles'),
          path: '/vehicles',
          icon: <DirectionsBus />,
        },
      },
    },
    registerDriver: {
      heading: t('Drivers'),
      icon: <ImportContacts />,
      links: {
        registerDriver: {
          text: t('Drivers'),
          path: '/drivers',
          icon: <Person />,
        },
      },
    },

    configuration: {
      heading: t('Settings'),
      icon: <Assessment />,
      links: {
        settings: {
          text: t('Settings'),
          path: '/settings',
          icon: <Settings />,
        },
      },
    },
  };
}

export default NavLinks;
