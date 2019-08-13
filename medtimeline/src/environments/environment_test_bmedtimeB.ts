// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useMockServer: true,
  mockDataFolder: 'demo_data/test_bmedtimeB',
  mockDataFiles: [
    'BMedTimeB_Encounter',
    'BMedTimeB_Obs_labs',
    'BMedTimeB_Obs_vitals',
    'BMedtimeB_MB_data',
    'BMedTimeB_Med_Admins',
    'BMedTimeB_Med_Orders',
  ],
  useDebugger: false,
  showRadiology: false,
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
