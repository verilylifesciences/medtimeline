// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Duration, Interval} from 'luxon';
/** The period of time this app will search for patient encounters in.  */
export const APP_TIMESPAN = Interval.fromDateTimes(
    DateTime.utc().minus(Duration.fromObject({months: 6})), DateTime.utc());

/** Constants used for FHIR resource types. */
export enum FhirResourceType {
  Encounter = 'Encounter',
  Observation = 'Observation',
  MedicationAdministration = 'MedicationAdministration',
  MedicationOrder = 'MedicationOrder',
  DocumentReference = 'DocumentReference',
  Patient = 'Patient',
  Specimen = 'Specimen',
  Medication = 'Medication',
  DiagnosticReport = 'DiagnosticReport'
}
