// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {FhirResourceType} from '../../constants';

import {Observation} from './observation';
import {Specimen} from './specimen';

/**
 * FHIR element for DiagnosticReportStatus, from the DSTU2 version of the
 * standard.
 * https://www.hl7.org/fhir/valueset-diagnostic-report-status.html
 */
export enum DiagnosticReportStatus {
  Registered = 'Registered',
  Partial = 'Partial',
  Preliminary = 'Preliminary',
  Final = 'Final',
  Amended = 'Amended',
  Corrected = 'Corrected',
  Appended = 'Appended',
  Cancelled = 'Cancelled',
  EnteredInError = 'Enteredinerror',
  Unknown = 'Unknown'
}

const statusToEnumMap = new Map<string, DiagnosticReportStatus>([
  ['registered', DiagnosticReportStatus.Registered],
  ['partial', DiagnosticReportStatus.Partial],
  ['preliminary', DiagnosticReportStatus.Preliminary],
  ['final', DiagnosticReportStatus.Final],
  ['amended', DiagnosticReportStatus.Amended],
  ['corrected', DiagnosticReportStatus.Corrected],
  ['appended', DiagnosticReportStatus.Appended],
  ['cancelled', DiagnosticReportStatus.Cancelled],
  ['entered-in-error', DiagnosticReportStatus.EnteredInError],
  ['unknown', DiagnosticReportStatus.Unknown],
]);

/**
 * FHIR resource for DiagnosticReport, from the DSTU2 version of the standard.
 * https://www.hl7.org/fhir/DSTU2/diagnosticreport.html
 *
 * The parsing for this class is heavily influenced by the custom API BCH
 * built to return DiagnosticReports for microbiology data. In particular, we
 * only parse out specimens and results from the "contained" portion of the
 * resource instead of supporting retrieval by reference since the Cerner
 * implementation of the FHIR standard won't allow microbiology retrieval.
 */
export class DiagnosticReport {
  readonly id: string;

  /** Specimen this report is based on */
  readonly specimen: Specimen;

  /** Results in the form of observations */
  readonly results = new Array<Observation>();

  /** Status for this test */
  readonly status: DiagnosticReportStatus;

  constructor(json: any) {
    if (json.id) {
      this.id = json.id;
    }

    // Contained resources may be either specimens or observations.
    const contained = json.contained;
    const specimens = [];
    for (const rsc of contained) {
      if (rsc.resourceType === FhirResourceType.Specimen) {
        specimens.push(new Specimen(rsc));
      } else if (rsc.resourceType === FhirResourceType.Observation) {
        this.results.push(new Observation(rsc));
      }
      // Silently ignore all other contained resource types.
    }
    if (specimens.length > 1) {
      throw Error('The report cannot have multiple specimens.');
    }
    this.specimen = specimens[0];

    if (!json.status) {
      throw Error(
          'The report needs a status to be useful. JSON: ' +
          JSON.stringify(json));
    }

    this.status = statusToEnumMap.get(json.status);
  }
}

/**
 * A diagnostic report with the timestamp for a specific culture type extended.
 */
export class AnnotatedDiagnosticReport {
  readonly timestamp: DateTime;
  readonly report: DiagnosticReport;

  constructor(report: DiagnosticReport) {
    // Get the timestamp from the collection time of the specimen.
    const specimen = report.specimen;
    if (specimen) {
      this.timestamp = specimen.collectedDateTime ?
          specimen.collectedDateTime :
          (specimen.collectedPeriod ? specimen.collectedPeriod.start :
                                      undefined);
    }
    this.report = report;
  }
}
