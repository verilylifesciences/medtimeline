// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {makeDiagnosticReports} from 'src/app/test_utils';

import {MicrobioTooltip} from './microbio-tooltips';

describe('MicrobioTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MicrobioTooltip(
        makeDiagnosticReports()[0], DateTime.fromJSDate(new Date('2012-08-03')),
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltip = new MicrobioTooltip(
        makeDiagnosticReports()[0], DateTime.fromJSDate(new Date('2012-08-03')),
        TestBed.get(DomSanitizer));
    const tooltipText = tooltip.getTooltip();
    expect(tooltipText).toBeDefined();
    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltipText.replace(/c\d*=""/g, ''))
        .toEqual(
            '<table _ngcontent-c101=""'.replace(/c\d*=""/g, '') +
            ' class="c3-tooltip" ' +
            'id="c3-tooltip"><tbody><tr><th colspan="2">8/2/2012 20:00</th></tr>' +
            '<tr class="c3-tooltip-name--id">' +
            '<td class="name">Status</td>' +
            '<td class="value">Final</td></tr>' +
            '<tr class="c3-tooltip-name--id"><td></td></tr>' +
            '<tr><th colspan="2">Results Contained</th></tr>' +
            '<tr class="c3-tooltip-name--id">' +
            '<td class="name">Ova and Parasite Exam</td>' +
            '<td class="value">Negative or Flora</td></tr>' +
            '<tr class="c3-tooltip-name--id">' +
            '<td class="name">Salmonella and Shigella Culture</td>' +
            '<td class="value">Check result</td></tr></tbody></table>');
  });
});
