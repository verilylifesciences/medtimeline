// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedDiagnosticReport} from 'src/app/fhir-resources/annotated/annotated-diagnostic-report';
import {UI_CONSTANTS} from 'src/constants';
import {v4 as uuid} from 'uuid';

import {AnnotatedTooltip} from '../tooltips/annotated-tooltip';
import {Tooltip} from '../tooltips/tooltip';

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
      sanitizer: DomSanitizer): AnnotatedTooltip {
    const timestamp = annotatedReport.timestamp;

    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(timestamp, table, sanitizer);
    }

    // The AnnotatedTooltip will have the same ID as the button that it
    // corresponds with
    const uniqueID = uuid();
    // Replace the dashes in the UUID to meet HTML requirements.
    const re = /\-/gi;
    const buttonID = 'button' + uniqueID.replace(re, '');
    // Attach button to the tooltip to display attachments
    this.addAttachmentButton(
        buttonID, UI_CONSTANTS.REPORT_ATTACHMENT, table, sanitizer);

    const tooltipChart = table.outerHTML;
    const additionalAttachment = [annotatedReport.attachmentHtml];
    return new AnnotatedTooltip(tooltipChart, additionalAttachment, buttonID);
  }

  /**
   * Adds a button that spans the whole row in the tooltip table.
   * @param buttonID UniqueID that helps identify the button
   * @param buttonLabel String reflecting content inside the button
   * @param table HTMLTableElement on the tooltip that needs to be edited
   * @param sanitizer A DOM sanitizer
   */
  private addAttachmentButton(
      buttonID: string, buttonLabel: string, table: HTMLTableElement,
      sanitizer: DomSanitizer) {
    const row = table.insertRow();
    const cell1 = row.insertCell();
    const button = document.createElement('button');
    // Styles the button
    button.setAttribute('class', 'mat-menu-item');
    // Sets unique button ID (matches the AnnotatedTooltip ID)
    button.setAttribute('id', buttonID);
    button.innerHTML = sanitizer.sanitize(SecurityContext.HTML, buttonLabel);
    cell1.appendChild(button);
  }
}
