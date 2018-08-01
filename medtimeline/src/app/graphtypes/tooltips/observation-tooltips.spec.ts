// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {Observation} from 'src/app/fhir-data-classes/observation';
import {makeMedicationOrder, makeSampleDiscreteObservationJson} from 'src/app/test_utils';

import {DiscreteObservationTooltip} from './observation-tooltips';

describe('DiscreteObservationTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new DiscreteObservationTooltip(
        [
          new Observation(makeSampleDiscreteObservationJson(
              'blue', DateTime.utc(1988, 3, 23))),
          new Observation(makeSampleDiscreteObservationJson(
              'green', DateTime.utc(1988, 3, 23)))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltip = new DiscreteObservationTooltip(
        [
          new Observation(makeSampleDiscreteObservationJson(
              'blue', DateTime.utc(1988, 3, 23))),
          new Observation(makeSampleDiscreteObservationJson(
              'green', DateTime.utc(1988, 3, 23)))
        ],
        TestBed.get(DomSanitizer));
    const tooltipText = tooltip.getTooltip();
    expect(tooltipText).toBeDefined();
    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltipText.replace(/c\d*=""/g, ''))
        .toEqual(
            '<table _ngcontent-c166="" '.replace(/c\d*=""/g, '') +
            'class="c3-tooltip" id="c3-tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">3/23/1988 00:00</th></tr>' +
            '<tr class="c3-tooltip-name--1988-03-23T00:00:00.000Z">' +
            '<td class="name">Vanco Pk</td><td class="value">blue</td></tr>' +
            '<tr class="c3-tooltip-name--1988-03-23T00:00:00.000Z">' +
            '<td class="name">Vanco Pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});
