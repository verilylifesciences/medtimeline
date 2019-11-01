// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedMicrobioReport} from 'src/app/fhir-resources/annotated/annotated-microbio-report';
import {makeMicrobioReports} from 'src/app/utils/test_utils';

import {MicrobioTooltip} from './microbio-tooltips';
import {Tooltip} from './tooltip';

describe('MicrobioTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MicrobioTooltip().getTooltip(
        new AnnotatedMicrobioReport(makeMicrobioReports()[0]),
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const annotated = new AnnotatedMicrobioReport(makeMicrobioReports()[0]);
    const tooltip =
        new MicrobioTooltip().getTooltip(annotated, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();

    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip"><tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(annotated.timestamp) + '</th></tr>' +
            '<tr><th colspan="2">Result set</th></tr>' +
            '<tr><td class="name">Ova and Parasite Exam</td>' +
            '<td class="value">Negative or Flora</td></tr>' +
            '<tr><td class="name">Salmonella and Shigella Culture</td>' +
            '<td class="value">Check result</td></tr>' +
            '<tr><td class="name">Status</td><td class="value">Final</td></tr>' +
            '<tr><td class="name">Specimen</td><td class="value">Stool</td></tr>' +
            '</tbody></table>');
  });

  it('should drop timestamp text if indicated', () => {
    const annotated = new AnnotatedMicrobioReport(makeMicrobioReports()[0]);
    const tooltip = new MicrobioTooltip(false).getTooltip(
        annotated, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip"><tbody>' +
            '<tr><th colspan="2">Result set</th></tr>' +
            '<tr><td class="name">Ova and Parasite Exam</td>' +
            '<td class="value">Negative or Flora</td></tr>' +
            '<tr><td class="name">Salmonella and Shigella Culture</td>' +
            '<td class="value">Check result</td></tr>' +
            '<tr><td class="name">Status</td><td class="value">Final</td></tr>' +
            '<tr><td class="name">Specimen</td><td class="value">Stool</td></tr>' +
            '</tbody></table>');
  });
});
