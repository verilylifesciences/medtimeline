// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// This file can be replaced during build by using the `fileReplacements`
// array.// `ng build ---prod` replaces `environment.ts` with
// `environment.prod.ts`. The list of file replacements can be found in
// `angular.json`.

// This file is used in the e2e tests.

export const environment_file_locations = {
  conceptsFolder: 'clinical_concept_configuration',
  vitalGroupFile: 'vital_sign_groups.json',
  vitalConceptsFile: 'vital_signs.json',
  labConceptsFile: 'lab_results.json',
  labGroupFile: 'lab_groups.json',
  radiologyConceptsFile: 'radiology_results.json',
  radiologyGroupFile: 'radiology_groups.json',
  antibioticConceptsFile: 'medications_antibiotics.json',
  antibioticGroupFile: 'medication_groups_antibiotics.json',
  antiviralConceptsFile: 'medications_antivirals.json',
  antiviralGroupFile: 'medication_groups_antivirals.json',
  antifungalConceptsFile: 'medications_antifungals.json',
  antifungalGroupFile: 'medication_groups_antifungals.json',
  microbioGroupFile: 'microbio_groups.json',
  microbioConceptsFile: 'microbio_results.json'
};

/*
 * In development mode, to ignore zone related error stack frames such as
 * `zone.run`, `zoneDelegate.invokeTask` for easier debugging, you can
 * import the following file, but please comment it out in production mode
 * because it will have performance impact when throw error
 */
import 'zone.js/dist/zone-error'; // Included with Angular CLI.
