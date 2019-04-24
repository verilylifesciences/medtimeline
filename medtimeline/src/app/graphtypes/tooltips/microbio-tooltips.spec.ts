// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedDiagnosticReport} from 'src/app/fhir-data-classes/diagnostic-report';
import {makeDiagnosticReports} from 'src/app/test_utils';

import {MicrobioTooltip} from './microbio-tooltips';
import {Tooltip} from './tooltip';

describe('MicrobioTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MicrobioTooltip().getTooltip(
        new AnnotatedDiagnosticReport(makeDiagnosticReports()[0]),
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const annotated = new AnnotatedDiagnosticReport(makeDiagnosticReports()[0]);
    const tooltipText =
        new MicrobioTooltip().getTooltip(annotated, TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(annotated.timestamp) + '</th></tr>' +
            '<tr>' +
            '<td class="name">Status</td>' +
            '<td class="value">Final</td></tr>' +
            '<tr><td class="name">Specimen</td>' +
            '<td class="value">Stool</td></tr>' +
            '<tr><td></td></tr>' +
            '<tr><th colspan="2">Results Contained</th></tr>' +
            '<tr>' +
            '<td class="name">Ova and Parasite Exam</td>' +
            '<td class="value">Negative or Flora</td></tr>' +
            '<tr>' +
            '<td class="name">Salmonella and Shigella Culture</td>' +
            '<td class="value">Check result</td></tr></tbody></table>');
  });
});
