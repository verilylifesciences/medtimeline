// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {Interval} from 'luxon';
import {of} from 'rxjs';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode, LOINCCodeGroup} from './clinicalconcepts/loinc-code';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {RxNormCodeGroup} from './clinicalconcepts/rx-norm-group';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation} from './fhir-data-classes/observation';
import {ChartType} from './graphtypes/graph/graph.component';

@Injectable()
export abstract class FhirService {
  /**
   * Returns whether there are any observations with this code in the given
   * time range.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  observationsPresentWithCode(code: LOINCCode, dateRange: Interval):
      Promise<boolean> {
    // Just ask for one result to reduce the call time.
    return this.getObservationsWithCode(code, dateRange, 1)
        .then(obs => obs.length > 0, rejection => {
          // If any Observation for this code results in an error, do not show
          // any Observations at all.
          throw rejection;
        });
  }

  /**
   * Returns whether there are any observations with this code in the given
   * time range.
   * @param code The BCHMicrobio code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  diagnosticReportsPresentWithCodes(
      codeGroup: BCHMicrobioCodeGroup, dateRange: Interval): Promise<boolean> {
    // Just ask for one result to reduce the call time.
    return this.getDiagnosticReports(codeGroup, dateRange, 1)
        .then(reports => reports.length > 0, rejection => {
          // If any DiagnosticReports for this code results in an error, do not
          // show any DiagnosticReports at all.
          throw rejection;
        });
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  abstract getObservationsWithCode(
      code: LOINCCode, dateRange: Interval,
      limitCount?: number): Promise<Observation[]>;

  /**
   * Gets observations from a specified date range with a specific code group.
   * @param codeGroup The LOINCCodeGroup code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @returns The observations if there's a valid code group or date range.
   */
  getObservationsForCodeGroup(codeGroup: LOINCCodeGroup, dateRange: Interval):
      Promise<Observation[][]> {
    if (!codeGroup || !dateRange) {
      return of([]).toPromise();
    }
    const observationPromises = new Array<Promise<Observation[]>>();
    for (const c of codeGroup.resourceCodes) {
      if (c instanceof LOINCCode) {
        observationPromises.push(this.getObservationsWithCode(c, dateRange));
      }
    }
    return Promise.all(observationPromises);
  }

  /**
   * Returns whether there are any observations with this code in the given
   * time range.
   * @param code The RxNorm code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    // Just ask for one result to reduce the call time.
    return this.getMedicationAdministrationsWithCode(code, dateRange, 1)
        .then(obs => obs.length > 0, rejection => {
          // If any MedicationAdministration for this code results in an error,
          // do not show any MedicationAdministrations at all.
          throw rejection;
        });
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * group.
   * @param codeGroup The RxNormCode code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  abstract getMedicationAdministrationsWithCode(
      code: RxNormCode, dateRange: Interval,
      limitCount?: number): Promise<MedicationAdministration[]>;

  /**
   * Gets medication data from a specified date range with specific Rx codes,
   * since multiple medications are displayed on a single chart.
   * @param codes The RxNormCode codes for which to get observations.
   * @param dateRanges The time interval observations should fall between.
   */
  getMedicationAdministrationsWithCodes(
      codes: RxNormCodeGroup,
      dateRange: Interval): Promise<MedicationAdministration[][]> {
    if (!codes || !dateRange) {
      return of([]).toPromise();
    }
    const medicationPromises = new Array<Promise<MedicationAdministration[]>>();
    for (const code of codes.resourceCodes) {
      medicationPromises.push(this.getMedicationAdministrationsWithCode(
          code as RxNormCode, dateRange));
    }
    // This will be rejected if any Promise is rejected.
    return Promise.all(medicationPromises);
  }

  /**
   * Gets the order for specified order id.
   * @param id The id to pull the order from.
   */
  abstract getMedicationOrderWithId(id: string): Promise<MedicationOrder>;

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  abstract getMedicationAdministrationsWithOrder(id: string):
      Promise<MedicationAdministration[]>;

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  abstract getEncountersForPatient(dateRange: Interval): Promise<Encounter[]>;

  /**
   * Saves the current image of the graphs rendered as a DocumentReference
   * (static save).
   * @param image The image to save in the Document.
   * @param date The date the note was written on.
   */
  abstract saveStaticNote(image: HTMLCanvasElement, date: string): void;

  /**
   * Gets the DiagnosticReports for the patient for any report that falls in
   * the given date range.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all DiagnosticReports that covered any time in this
   *   date range.
   */
  abstract getDiagnosticReports(
      codeGroup: BCHMicrobioCodeGroup, dateRange: Interval,
      limitCount?: number): Promise<DiagnosticReport[]>;
}
