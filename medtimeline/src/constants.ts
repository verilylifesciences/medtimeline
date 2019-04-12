// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Duration, Interval} from 'luxon';
import {environment} from './environments/environment';

/** The period of time this app will search for patient encounters in.  */
export const APP_TIMESPAN = environment.production ?
    Interval.fromDateTimes(
        DateTime.utc().minus(Duration.fromObject({months: 6})),
        DateTime.utc()) :
    Interval.fromDateTimes(
        DateTime.utc().minus(Duration.fromObject({months: 60})),
        DateTime.utc());

/**
 * Do not consider any encounters with a start date earlier than a year from
 * now.
 */
export const EARLIEST_ENCOUNTER_START_DATE = DateTime.utc().minus({years: 1});

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
