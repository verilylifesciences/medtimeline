// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedDiagnosticReport} from 'src/app/fhir-data-classes/annotated-diagnostic-report';
import {makeDiagnosticReports, makeDiagnosticReportWithoutTextField} from 'src/app/test_utils';

import {DiagnosticTooltip} from './diagnostic-tooltips';
import {Tooltip} from './tooltip';

describe('DiagnosticTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const report = makeDiagnosticReports()[0];
    const annotatedReport = new AnnotatedDiagnosticReport(report);
    const annotatedTooltip = new DiagnosticTooltip().getTooltip(
        annotatedReport, TestBed.get(DomSanitizer));
    expect(annotatedTooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const report = makeDiagnosticReports()[0];
    const annotatedReport = new AnnotatedDiagnosticReport(report);
    const annotatedTooltip = new DiagnosticTooltip().getTooltip(
        annotatedReport, TestBed.get(DomSanitizer));
    const buttonID = annotatedTooltip.id;
    expect(annotatedTooltip.tooltipChart).toBeDefined();
    expect(annotatedTooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr><th colspan="2">' + Tooltip.formatTimestamp(report.timestamp) +
            '</th></tr>' +
            '<tr><td><button class="mat-menu-item" id="' + buttonID + '">' +
            'Report Attachment</button></td></tr>' +
            '</tbody></table>');
  });

  it('should generate tooltip html attachment', () => {
    const report = makeDiagnosticReports()[0];
    const annotatedReport = new AnnotatedDiagnosticReport(report);
    const annotatedTooltip = new DiagnosticTooltip().getTooltip(
        annotatedReport, TestBed.get(DomSanitizer));
    expect(annotatedTooltip.additionalAttachment).toBeDefined();
    expect(annotatedTooltip.additionalAttachment.length).toEqual(1);
  });

  it('should drop timestamp text if indicated', () => {
    const report = makeDiagnosticReports()[0];
    const annotatedReport = new AnnotatedDiagnosticReport(report);
    const annotatedTooltip = new DiagnosticTooltip(false).getTooltip(
        annotatedReport, TestBed.get(DomSanitizer));
    const buttonID = annotatedTooltip.id;
    expect(annotatedTooltip.tooltipChart).toBeDefined();
    expect(annotatedTooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr><td><button class="mat-menu-item" id="' + buttonID + '">' +
            'Report Attachment</button></td></tr>' +
            '</tbody></table>');
  });
});
