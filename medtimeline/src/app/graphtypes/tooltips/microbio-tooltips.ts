// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {DiagnosticReport, DiagnosticReportStatus} from 'src/app/fhir-data-classes/diagnostic-report';
import {Observation} from 'src/app/fhir-data-classes/observation';

import {Tooltip} from '../tooltips/tooltip';

/*
 * This class makes a tooltip for a DiagnosticReport that applies to all points
 * charted from the same report. It lists the time of the report, the report
 * status, as well as all results contained in the report.
 */
export class MicrobioTooltip extends Tooltip {
  status: string;
  id: string;
  results: Observation[];

  constructor(
      report: DiagnosticReport, time: DateTime, sanitizer: DomSanitizer) {
    super(sanitizer, time);
    this.status = DiagnosticReportStatus[report.status];
    this.id = report.id;
    this.results = report.results;
  }

  getTooltip(): string {
    if (!this.tooltipText) {
      const table = this.clearTable();
      const styleName = 'c3-tooltip-name--' +
          this.sanitizer.sanitize(SecurityContext.HTML, this.id);
      this.addTimeHeader(this.timestamp, table);
      this.addRow(table, styleName, ['Status', this.status]);
      const spacerRow = table.insertRow();
      spacerRow.className = styleName;
      const cell1 = spacerRow.insertCell();
      this.addHeader('Results Contained', table);
      for (const result of this.results) {
        this.addRow(
            table, styleName, [result.display, result.interpretation.display]);
      }
      this.resetTableVisiblity(table);
    }
    return this.tooltipText;
  }
}
