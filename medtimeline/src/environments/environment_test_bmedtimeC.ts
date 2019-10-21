// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useMockServer: true,
  mockDataFolder: 'demo_data/test_bmedtimeC',
  mockDataFiles: [
    'BMedTimeC_Encounter',
    'BMedTimeC_Obs_vitals',
    'BMedTimeC_Obs_labs',
    'BMedTimeC_Med_Admins',
    'BMedTimeC_Med_Orders',
  ],
  conceptsFolder: 'clinical_concept_configuration',
  labConceptsFile: 'lab_results.json',
  labGroupFile: 'lab_groups.json',
  useDebugger: false,
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
