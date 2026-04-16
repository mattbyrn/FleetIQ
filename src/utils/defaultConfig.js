export const defaultDialogState = {
  shown: false,
  title: '',
  flavour: 'success',
  dialogType: null,
  collection: '',
};

export const defaultComplianceState = {
  registration: '',
  expiryDate: new Date(),
  comment: '',
};

export const defaultInspectionState = {};

export const defaultVehicleState = {
  registration: '',
  make: '',
  model: '',
  capacity: '',
  vin: '',
  licenceRequired: 'B',
  comment: '',
};

export const defaultDriverState = {
  name: '',
  phone: '',
  licenceNumber: '',
  hasD1: false,
  hasD: false,
  licenceExpiry: null,
  cpcNumber: '',
  cpcExpiry: null,
  hasPsvLicence: false,
  psvLicenceNumber: '',
  psvExpiry: null,
  hasSpsvLicence: false,
  spsvLicenceNumber: '',
  spsvExpiry: null,
  vettings: {},
  comment: '',
};

export const defaultDialogMapping = {
  fireextinguishers: {
    title: 'Fire Extinguisher Inspection',
    dialogType: 'generic',
    collection: 'fireextinguishers',
  },
  firstaidkits: {
    title: 'First Aid Expiration',
    dialogType: 'generic',
    collection: 'firstaidkits',
  },
  tachocalibrations: {
    title: 'Tachograph Calibration',
    dialogType: 'generic',
    collection: 'tachocalibrations',
  },
  taxes: {
    title: 'Vehicle Tax Expiration',
    dialogType: 'generic',
    collection: 'taxes',
  },
  psvs: {
    title: 'Vehicle PSV Inspection Expiration',
    dialogType: 'generic',
    collection: 'psvs',
  },
  cvrts: {
    title: 'CVRT Expiration',
    dialogType: 'generic',
    collection: 'cvrts',
  },
  maintenance: {
    title: 'Maintenance',
    dialogType: 'maintenance',
    collection: 'maintenance',
  },
  vehicles: {
    title: 'Vehicle',
    dialogType: 'vehicle',
    collection: 'vehicles',
  },
  drivers: {
    title: 'Driver',
    dialogType: 'driver',
    collection: 'drivers',
  },
};
