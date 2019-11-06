// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {APP_TIMESPAN} from 'src/constants';

import {AnnotatedDiagnosticReport} from '../../fhir-resources/annotated/annotated-diagnostic-report';
import {FhirService} from '../../fhir-server/fhir.service';

import {AbstractResourceCodeGroup, ResourceCode} from './resource-code-group';

/**
 * Represents one or more DiagnosticReport codes that should be displayed
 * together. In the case of multiple DiagnosticReport codes in a group, you
 * should provide a label for that group.
 */
export class DiagnosticReportCodeGroup extends AbstractResourceCodeGroup<
    AnnotatedDiagnosticReport, AnnotatedDiagnosticReport> {
  /**
   * Gets a list of AnnotatedDiagnosticReports corresponding to this code group.
   */
  getResourceFromFhir(dateRange: Interval):
      Promise<AnnotatedDiagnosticReport[]> {
    return this.fhirService.getAnnotatedDiagnosticReports(this, dateRange);
  }

  formatRawResults(rawResults: AnnotatedDiagnosticReport[]):
      Promise<AnnotatedDiagnosticReport[]> {
    return Promise.resolve(rawResults);
  }

  /**
   * Returns whether there is any data available for this ResourceCode within
   * the fixed timescope of this app.
   * @override
   */
  dataAvailableInAppTimeScope(): Promise<boolean> {
    return this.fhirService.diagnosticReportsPresentWithCodes(
        this, APP_TIMESPAN);
  }
}

/**
 * Holds DiagnosticReport codes, which are technically LOINC codes. This is
 * not grouped with LOINC codes because Observations and DiagnosticReports
 * are inherently different in the Fhir and Cerner implementations.
 */
export class DiagnosticReportCode extends ResourceCode {
  static readonly CODING_STRING =
      'http://hl7.org/fhir/dstu2/valueset-report-codes.html';
  // CODING_STRING could also equal http://loinc.org

  dataAvailableInAppTimeScope(fhirService: FhirService): Promise<boolean> {
    // Currently utilizing code that is very similar to BCHMicrobioCode
    return fhirService.diagnosticReportsPresentWithCodes(
        new DiagnosticReportCodeGroup(
            fhirService, this.label, [this], undefined, undefined),
        APP_TIMESPAN);
  }
}
