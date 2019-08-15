// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {DiagnosticReportStatus, DiagnosticReport} from 'src/app/fhir-data-classes/diagnostic-report';

import {Tooltip} from '../tooltips/tooltip';
import {AnnotatedDiagnosticReport} from 'src/app/fhir-data-classes/annotated-diagnostic-report';

/*
 * This class makes a tooltip for a DiagnosticReport that applies to all points
 * charted from the same report. It lists the time of the report and the html
 * text attached with the report.
 */
export class DiagnosticTooltip extends Tooltip<AnnotatedDiagnosticReport> {
  constructor(private addTimestampRow = true) {
    super();
  }

  getTooltip(
      annotatedReport: AnnotatedDiagnosticReport,
      sanitizer: DomSanitizer): string {
    const timestamp = annotatedReport.timestamp;
    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(timestamp, table, sanitizer);
    }
    if (annotatedReport.text) {
      const htmlText = annotatedReport.text.narrative.div;
      Tooltip.addHeader('Summary', table, sanitizer);
      Tooltip.addRow(table, [htmlText], sanitizer);
    } else {
      // If there is no additional text (Narrative) that is added, the tooltip
      // will display some other default information.
      Tooltip.addRow(table, ['Category', annotatedReport.report.category], sanitizer);
      Tooltip.addRow(table, ['Status', annotatedReport.report.status], sanitizer);
    }
    return table.outerHTML;
  }
}
