// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {Observation} from 'src/app/fhir-data-classes/observation';
import {makeSampleDiscreteObservationJson} from 'src/app/test_utils';

import {DiscreteObservationTooltip, GenericAbnormalTooltip, GenericAnnotatedObservationTooltip} from './observation-tooltips';
import {Tooltip} from './tooltip';

describe('DiscreteObservationTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new DiscreteObservationTooltip().getTooltip(
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
    const tooltipText = new DiscreteObservationTooltip().getTooltip(
        [
          new Observation(makeSampleDiscreteObservationJson(
              'blue', DateTime.utc(1988, 3, 23))),
          new Observation(makeSampleDiscreteObservationJson(
              'green', DateTime.utc(1988, 3, 23)))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 23)) + '</th></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">blue</td></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});


describe('GenericObservationTooltip', () => {
  const obs = new Observation(
      makeSampleDiscreteObservationJson('green', DateTime.utc(1988, 3, 23)));

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should generate tooltip text', () => {
    const tooltipText = new DiscreteObservationTooltip().getTooltip(
        [
          new Observation(makeSampleDiscreteObservationJson(
              'blue', DateTime.utc(1988, 3, 23))),
          new Observation(makeSampleDiscreteObservationJson(
              'green', DateTime.utc(1988, 3, 23)))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 23)) + '</th></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">blue</td></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});


describe('GenericAbnormalTooltip', () => {
  const params = {};
  params['label'] = 'Hemoglobin';
  params['value'] = 100;
  params['timestamp'] = DateTime.utc(1988, 3, 22).toMillis();

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should generate tooltip text', () => {
    const tooltipText = new GenericAbnormalTooltip(true, Color.rgb(12, 67, 199))
                            .getTooltip(params, TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 22)) + '</th></tr>' +
            '<tr><th colspan="2">Caution: value outside normal range</th></tr>' +
            '</tbody></table>');
  });
});
