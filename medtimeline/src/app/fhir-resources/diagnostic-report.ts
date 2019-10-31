// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.


import {DateTime} from 'luxon';

import {DiagnosticReportCode} from '../conceptmappings/resource-codes/diagnostic-report-code';
import {ResourceCode} from '../conceptmappings/resource-codes/resource-code-group';
import {ResultError} from '../result-error';

import {Attachment} from './attachment';
import {ResultClassWithTimestamp} from './sets/fhir-resource-set';

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
 * FHIR element for DiagnosticServiceSectionCodes, from the DSTU2 version
 * of the standard. Used to represent the department/diagnostic service
 * that created the request. The section codes that we are currently
 * using are not in the FHIR documentation, but are in the examples
 * given in the Cerner sandbox environment.
 * TODO: Add more codes when we get more data. (Issue #30)
 * http://hl7.org/fhir/DSTU2/valueset-diagnostic-service-sections.html
 */
export enum DiagnosticServiceSectionCodes {
  RadiologyReport = 'RAD',
  CTReport = 'CT'
}

const categoryToEnumMap = new Map<string, DiagnosticServiceSectionCodes>([
  ['RADRPT', DiagnosticServiceSectionCodes.RadiologyReport],
  ['CT Report', DiagnosticServiceSectionCodes.CTReport],
]);

/**
 * FHIR resource for DiagnosticReport, from the DSTU2 version of the standard.
 * https://www.hl7.org/fhir/DSTU2/diagnosticreport.html
 *
 * Cerner currently only supports radiology reports
 */
export class DiagnosticReport extends ResultClassWithTimestamp {
  /**
   * Request ID of the request that obtained this report data.
   * Returned by Cerner; not a FHIR standard.
   * TODO: Issue #24
   */
  readonly requestId: string;

  readonly id: string;

  /** Status for this test */
  readonly status: DiagnosticReportStatus;

  /** Category of the report*/
  readonly category: DiagnosticServiceSectionCodes;

  /** Report code */
  readonly code: ResourceCode;

  /**
   * Not readonly to allow editing in fhir-service
   * Attachment representing html/pdf version of the report.
   */
  presentedForm = new Array<Attachment>();

  /** Json returned from FHIR; source of truth */
  readonly json: any;

  constructor(json: any, requestId: string) {
    super(
        DiagnosticReport.getLabel(json, requestId), requestId,
        DiagnosticReport.getTimestamp(json));

    this.requestId = requestId;
    this.json = json;

    if (json.id) {
      this.id = json.id;
    }

    if (!json.status) {
      throw new ResultError(
          new Set([this.requestId]), 'The report needs a status to be useful.',
          json);
    }
    this.status = statusToEnumMap.get(json.status);

    if (json.category) {
      this.category = categoryToEnumMap.get(json.category.text);
    }
    if (json.presentedForm) {
      for (const presented of json.presentedForm) {
        this.presentedForm.push(new Attachment(presented));
      }
    }
    if (json.code) {
      this.code = DiagnosticReportCode.fromCodeString(json.code.text);
    }
  }
  /**
   * Helper function to extract the label to satisfy the requirement
   * for labels in the ResultClassWithTimestamp.
   * Label currently just text of the code, which is 'RADRPT' in the
   * Cerner examples.
   * @param json The JSON retrieved from the server.
   */
  private static getLabel(json: any, requestId: string) {
    let label;
    if (json.code) {
      label = json.code.text;
    } else {
      throw new ResultError(
          new Set([requestId]), 'The report needs a code to be useful.', json);
    }
    return label;
  }

  static getTimestamp(json): DateTime {
    return DateTime.fromISO(json.effectiveDateTime);
  }
}
