// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as d3 from 'd3';
import {DateTime} from 'luxon';
import {AnnotatedObservation} from 'src/app/fhir-data-classes/annotated-observation';
import {Observation} from 'src/app/fhir-data-classes/observation';
import {makeSampleDiscreteObservationJson} from 'src/app/test_utils';

import {DiscreteObservationTooltip, GenericAnnotatedObservationTooltip} from './observation-tooltips';
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
            '<td class="name">Vanco Pk</td><td class="value">blue</td></tr>' +
            '<tr>' +
            '<td class="name">Vanco Pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});


describe('GenericObservationTooltip', () => {
  const obs = new Observation(
      makeSampleDiscreteObservationJson('green', DateTime.utc(1988, 3, 23)));

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should get undefined tooltip if there are no annotations', () => {
    const tooltip =
        new GenericAnnotatedObservationTooltip(true, d3.rgb(12, 67, 199))
            .getTooltip(
                new AnnotatedObservation(obs), TestBed.get(DomSanitizer));

    expect(tooltip).toBeUndefined();
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
            '<td class="name">Vanco Pk</td><td class="value">blue</td></tr>' +
            '<tr>' +
            '<td class="name">Vanco Pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});
