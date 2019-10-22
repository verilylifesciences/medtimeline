// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file can be replaced during build by using the `fileReplacements`
// array.// `ng build ---prod` replaces `environment.ts` with
// `environment.prod.ts`. The list of file replacements can be found in
// `angular.json`.

// This file is used in the e2e tests.

export const environment = {
  production: false,
  useMockServer: true,
  mockDataFolder: 'demo_data/test_e2e',
  mockDataFiles: [
    'e2e_DiagReport',
    'e2e_Encounter',
    'e2e_Obs_labs',
    'e2e_Obs_vitals',
    'e2e_MB_data',
    'e2e_Med_Admins',
    'e2e_Med_Orders',
  ],
  conceptsFolder: 'clinical_concept_configuration',
  vitalGroupFile: 'vital_sign_groups.json',
  vitalConceptsFile: 'vital_signs.json',
  labConceptsFile: 'lab_results.json',
  labGroupFile: 'lab_groups.json',
  radiologyConceptsFile: 'radiology_results.json',
  radiologyGroupFile: 'radiology_groups.json',
  medicationConceptsFile: 'medications.json',
  medicationGroupFile: 'medication_groups.json',
  useDebugger: false,
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
