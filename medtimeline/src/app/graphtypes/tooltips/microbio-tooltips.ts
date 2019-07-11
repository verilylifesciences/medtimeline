// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';

import {AnnotatedDiagnosticReport} from 'src/app/fhir-data-classes/annotated-diagnotic-report';
import {DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';

import {Tooltip} from '../tooltips/tooltip';

/*
 * This class makes a tooltip for a DiagnosticReport that applies to all points
 * charted from the same report. It lists the time of the report, the report
 * status, as well as all results contained in the report.
 */
export class MicrobioTooltip extends Tooltip<AnnotatedDiagnosticReport> {
  constructor(private addTimestampRow = true, private color?: Color) {
    super();
  }

  getTooltip(
      annotatedReport: AnnotatedDiagnosticReport, sanitizer: DomSanitizer,
      isAbnormal: boolean = false): string {
    const status = DiagnosticReportStatus[annotatedReport.report.status];
    const results = annotatedReport.report.results;
    const timestamp = annotatedReport.timestamp;
    const specimen = annotatedReport.report.specimen.type;

    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(timestamp, table, sanitizer);
    }

    Tooltip.addHeader('Result set', table, sanitizer);

    for (const result of results) {
      Tooltip.addRow(
          table, [result.display, result.interpretation.display], sanitizer,
          this.color, isAbnormal);
    }
    Tooltip.addRow(table, ['Status', status], sanitizer);
    Tooltip.addRow(table, ['Specimen', specimen], sanitizer);

    return table.outerHTML;
  }
}
