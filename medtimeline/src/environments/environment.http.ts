// This file can be replaced during build by using the `fileReplacements` array.
// `ng build ---prod` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  useMockServer: false,
  mockDataFolder: '',
  mockDataFiles: [],
  useDebugger: false,
  conceptsFolder: 'clinical_concept_configuration',
  vitalGroupFile: 'vital_sign_groups.json',
  vitalConceptsFile: 'vital_signs.json',
  labConceptsFile: 'lab_results.json',
  labGroupFile: 'lab_groups.json',
  radiologyConceptsFile: 'radiology_results.json',
  radiologyGroupFile: 'radiology_groups.json',
  medicationConceptsFile: 'medications.json',
  medicationGroupFile: 'medication_groups.json',
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
