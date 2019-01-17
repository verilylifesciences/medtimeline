// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedDiagnosticReport, DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';

import {Tooltip} from '../tooltips/tooltip';

/*
 * This class makes a tooltip for a DiagnosticReport that applies to all points
 * charted from the same report. It lists the time of the report, the report
 * status, as well as all results contained in the report.
 */
export class MicrobioTooltip extends Tooltip<AnnotatedDiagnosticReport> {
  getTooltip(
      annotatedReport: AnnotatedDiagnosticReport,
      sanitizer: DomSanitizer): string {
    const status = DiagnosticReportStatus[annotatedReport.report.status];
    const results = annotatedReport.report.results;
    const timestamp = annotatedReport.timestamp;

    const table = Tooltip.createNewTable();
    Tooltip.addTimeHeader(timestamp, table, sanitizer);
    Tooltip.addRow(table, ['Status', status], sanitizer);
    const spacerRow = table.insertRow();
    spacerRow.insertCell();
    Tooltip.addHeader('Results Contained', table, sanitizer);
    for (const result of results) {
      Tooltip.addRow(
          table, [result.display, result.interpretation.display], sanitizer);
    }
    return table.outerHTML;
  }
}
