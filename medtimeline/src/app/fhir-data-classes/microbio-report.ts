// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


import {FhirResourceType} from '../../constants';
import {BCHMicrobioCodeGroup} from '../clinicalconcepts/bch-microbio-code';
import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {ResultError} from '../result-error';

import {Observation} from './observation';
import {Specimen} from './specimen';
import {DiagnosticReportStatus} from './diagnostic-report';

// TODO: Issue #31 (Update mapping for string enums)
// https://stackoverflow.com/questions/44883072/reverse-mapping-for-string-enums
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
 * Resource for MicrobioReport.
 * The parsing for this class is heavily influenced by the custom API BCH
 * built to return DiagnosticReports for microbiology data. In particular, we
 * only parse out specimens and results from the "contained" portion of the
 * resource instead of supporting retrieval by reference since the Cerner
 * implementation of the FHIR standard won't allow microbiology retrieval.
 *
 * This currently does not extend DiagnosticReport. TODO: Issue #24- maintain
 * More clearly delineate what belongs in FHIR resources and what is added/derived
 */
export class MicrobioReport {
  readonly id: string;

  /** Specimen this report is based on */
  readonly specimen: Specimen;

  /** Results in the form of observations */
  readonly results = new Array<Observation>();

  /** Status for this test */
  readonly status: DiagnosticReportStatus;

  /** Request ID of the request that obtained this report data */
  readonly requestId: string;

  constructor(json: any, requestId: string) {
    this.requestId = requestId;

    if (json.id) {
      this.id = json.id;
    }

    if (!json.status) {
      throw new ResultError(
          new Set([this.requestId]),
          'The report needs a status to be useful.', json);
    }
    this.status = statusToEnumMap.get(json.status);

    // Contained resources may be either specimens or observations.
    const contained = json.contained;
    const specimens = [];
    for (const rsc of contained) {
      if (rsc.resourceType === FhirResourceType.Specimen) {
        specimens.push(new Specimen(rsc, this.requestId));
      } else if (rsc.resourceType === FhirResourceType.Observation) {
        try {
          this.results.push(new Observation(rsc, this.requestId));
        } catch (err) {
          // silently ignore observations within diagnostic reports that have
          // errors. Errors may occur because an observation may not have a
          // LOINC code we recognize or may have an inconsistent label.
          // Please see Observation constructor for all error cases.
          console.log(err);
        }
      }
      // Silently ignore all other contained resource types.
    }
    if (specimens.length > 1) {
      throw new ResultError(
          new Set([this.requestId]),
          'The report cannot have multiple specimens.');
    }
    this.specimen = specimens[0];
  }

  /**
   * The custom microbiology API provided does not allow for calling for
   * a specific microbio code, so this function parses the entire anticipated
   * JSON repsonse and filters by code.
   * @param json The JSON retrieved from the server.
   * @param codeGroup The CodeGroup of tests we're looking for.
   */
  static parseAndFilterMicrobioData(json: any, codeGroup: BCHMicrobioCodeGroup):
      Array<MicrobioReport> {
    if (!json || !json.entry) {
      return [];
    }
    // We cannot get the request ID from the Microbiology response. Therefore
    // we hardcode the request ID to just be a constant string.
    const requestId = 'Microbiology Request';

    const diagnosticReports: MicrobioReport[] = json.entry.map(
        result => new MicrobioReport(result.resource, requestId));

    const mapToUpdate = new Map<ResourceCode, MicrobioReport[]>();
    // Get all unique codes for all DiagnosticReport results.
    for (const report of diagnosticReports) {
      const codes: ResourceCode[] =
          report.results.map(r => r.codes)
              .reduce((prev: ResourceCode[], curr: ResourceCode[]) => {
                return prev.concat(curr);
              }, []);
      const uniqueCodes: ResourceCode[] = Array.from(new Set(codes));
      for (const code of uniqueCodes) {
        let existing = mapToUpdate.get(code);
        if (!existing) {
          existing = [];
        }
        existing.push(report);
        mapToUpdate.set(code, existing);
      }
    }
    let reports = new Array<MicrobioReport>();
    for (const code of codeGroup.resourceCodes) {
      if (mapToUpdate.has(code)) {
        reports = reports.concat(mapToUpdate.get(code));
      }
    }
    return reports;
  }
}
