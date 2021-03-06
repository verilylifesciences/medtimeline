// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {AnnotatedMicrobioReport} from 'src/app/fhir-resources/annotated/annotated-microbio-report';
import {DiagnosticReportStatus} from 'src/app/fhir-resources/diagnostic-report';

import {UI_CONSTANTS} from '../../../../constants';
import {AnnotatedTooltip} from './annotated-tooltip';
import {Tooltip} from './tooltip';

/*
 * This class makes a tooltip for BCH Microbio DiagnosticReport that applies to
 * all points charted from the same report. It lists the time of the report, the
 * report status, as well as all results contained in the report.
 */
export class MicrobioTooltip extends Tooltip<AnnotatedMicrobioReport> {
  constructor(private addTimestampRow = true, private color?: Color) {
    super();
  }

  getTooltip(
      annotatedReport: AnnotatedMicrobioReport, sanitizer: DomSanitizer,
      isAbnormal: boolean = false): AnnotatedTooltip {
    const status = DiagnosticReportStatus[annotatedReport.report.status];
    const results = annotatedReport.report.results;
    const timestamp = annotatedReport.timestamp;
    const specimen = annotatedReport.report.specimen.type;

    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(timestamp, table, sanitizer);
    }

    Tooltip.addHeader(UI_CONSTANTS.RESULT, table, sanitizer);

    for (const result of results) {
      Tooltip.addRow(
          table, [result.display, result.interpretation.display], sanitizer,
          this.color, isAbnormal);
    }
    Tooltip.addRow(table, [UI_CONSTANTS.STATUS, status], sanitizer);
    Tooltip.addRow(table, [UI_CONSTANTS.SPECIMEN, specimen], sanitizer);

    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
  }
}
