export interface WorkerData {
  id: string;
  name: string;
  levelUnlocked: number;
  restockSpeed: 'Slow' | 'Normal' | 'Fast' | 'Very Fast';
  checkoutSpeed: 'Slow' | 'Normal' | 'Fast' | 'Very Fast';
  hiringFee: number;
  salary: number;
  picture: string;
}

export const WORKERS: WorkerData[] = [
  { id: 'worker_zackery', name: 'Zackery Cole', levelUnlocked: 10, restockSpeed: 'Normal', checkoutSpeed: 'Slow', hiringFee: 500, salary: 50, picture: 'Icon Worker1.png' },
  { id: 'worker_terence', name: 'Terence Fay', levelUnlocked: 15, restockSpeed: 'Slow', checkoutSpeed: 'Normal', hiringFee: 1000, salary: 150, picture: 'Icon Worker0.png' },
  { id: 'worker_dennis', name: 'Dennis Brandon', levelUnlocked: 20, restockSpeed: 'Fast', checkoutSpeed: 'Normal', hiringFee: 2000, salary: 300, picture: 'Icon Worker2.png' },
  { id: 'worker_clark', name: 'Clark Cash', levelUnlocked: 25, restockSpeed: 'Slow', checkoutSpeed: 'Very Fast', hiringFee: 2400, salary: 400, picture: 'Icon Worker3.png' },
  { id: 'worker_angus', name: 'Angus Mick', levelUnlocked: 30, restockSpeed: 'Very Fast', checkoutSpeed: 'Slow', hiringFee: 3000, salary: 500, picture: 'Icon Worker4.png' },
  { id: 'worker_benji', name: 'Benji Otto', levelUnlocked: 35, restockSpeed: 'Fast', checkoutSpeed: 'Fast', hiringFee: 5000, salary: 500, picture: 'Icon Worker5.png' },
  { id: 'worker_alexander', name: 'Alexander Cole', levelUnlocked: 38, restockSpeed: 'Fast', checkoutSpeed: 'Fast', hiringFee: 8000, salary: 400, picture: 'Icon worker8.png' },
  { id: 'worker_lauren', name: 'Lauren Posie', levelUnlocked: 40, restockSpeed: 'Fast', checkoutSpeed: 'Fast', hiringFee: 7500, salary: 500, picture: 'Icon Worker6.png' },
  { id: 'worker_axel', name: 'Axel Charleton', levelUnlocked: 45, restockSpeed: 'Very Fast', checkoutSpeed: 'Very Fast', hiringFee: 10000, salary: 700, picture: 'Icon Worker7.png' },
];

export const SPEED_TO_MS = {
  'Slow': 5000,
  'Normal': 3000,
  'Fast': 1500,
  'Very Fast': 800
};
