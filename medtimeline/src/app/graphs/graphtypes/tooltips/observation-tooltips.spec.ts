// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {AnnotatedObservation} from 'src/app/fhir-resources/annotated/annotated-observation';
import {Observation} from 'src/app/fhir-resources/observation';
import * as Colors from 'src/app/theme/verily_colors';
import {makeSampleDiscreteObservation, makeSampleObservation} from 'src/app/utils/test_utils';

import {DiscreteObservationTooltip, GenericAbnormalTooltip, GenericAnnotatedObservationTooltip} from './observation-tooltips';
import {Tooltip} from './tooltip';

describe('DiscreteObservationTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new DiscreteObservationTooltip().getTooltip(
        [
          makeSampleDiscreteObservation('blue', DateTime.utc(1988, 3, 23)),
          makeSampleDiscreteObservation('green', DateTime.utc(1988, 3, 23))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltip = new DiscreteObservationTooltip().getTooltip(
        [
          makeSampleDiscreteObservation('blue', DateTime.utc(1988, 3, 23)),
          makeSampleDiscreteObservation('green', DateTime.utc(1988, 3, 23))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 23)) + '</th></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">blue</td></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });

  it('should generate correct tooltip text if abnormal', () => {
    const tooltip = new DiscreteObservationTooltip().getTooltip(
        [
          makeSampleDiscreteObservation('blue', DateTime.utc(1988, 3, 23), 'H'),
          makeSampleDiscreteObservation('green', DateTime.utc(1988, 3, 23))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 23)) + '</th></tr>' +
            '<tr>' +
            '<td class="name" style="color: ' + Colors.ABNORMAL +
            '">Vanc pk</td>' +
            '<td class="value" style="color: ' + Colors.ABNORMAL +
            '">blue (High)</td></tr>' +
            '<tr>' +
            '<td class="name">Vanc pk</td><td class="value">green</td></tr>' +
            '</tbody></table>');
  });
});

describe('GenericObservationTooltip', () => {
  const obs = makeSampleDiscreteObservation('green', DateTime.utc(1988, 3, 23));

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should generate tooltip text', () => {
    const tooltip = new DiscreteObservationTooltip().getTooltip(
        [
          makeSampleDiscreteObservation('blue', DateTime.utc(1988, 3, 23)),
          makeSampleDiscreteObservation('green', DateTime.utc(1988, 3, 23))
        ],
        TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip">' +
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

describe('GenericAnnotatedObservationTooltip', () => {
  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should show value, unit, and interpretation if all three of those values are present',
     () => {
       const seriesColor = Color.rgb(12, 67, 199);
       const obs = new AnnotatedObservation(makeSampleObservation(
           100, DateTime.utc(1988, 3, 25), [10, 20], 'H'));
       const tooltip = new GenericAnnotatedObservationTooltip(true, seriesColor)
                           .getTooltip(obs, TestBed.get(DomSanitizer), true);
       expect(tooltip).toBeDefined();
       expect(tooltip.additionalAttachment).toBeUndefined();
       expect(tooltip.tooltipChart)
           .toEqual(
               '<table class="tooltip">' +
               '<tbody>' +
               '<tr><th colspan="2">' +
               Tooltip.formatTimestamp(DateTime.utc(1988, 3, 25)) +
               '</th></tr>' +
               '<tr>' +
               '<td class="name" style="color: ' + Colors.ABNORMAL +
               '"><span style="' + Tooltip.TOOLTIP_ABNORMAL_CSS + seriesColor +
               '"></span>' +
               '<div style="display: inline-block;">Hemoglobin</div></td>' +
               '<td class="value" style="color: ' + Colors.ABNORMAL +
               '">100 g/dL (High)</td>' +
               '</tr>' +
               '</tbody></table>');
     });

  it('should not display interpretation if there is no interpretation flag',
     () => {
       const seriesColor = Color.rgb(12, 67, 199);
       const observation = makeSampleObservation(
           100, DateTime.utc(1988, 3, 25), [10, 20],
           undefined,  // interpretation
           false       // hasInterpretation
       );
       const obs = new AnnotatedObservation(observation);
       const tooltip = new GenericAnnotatedObservationTooltip(true, seriesColor)
                           .getTooltip(obs, TestBed.get(DomSanitizer), true);
       expect(tooltip).toBeDefined();
       expect(tooltip.additionalAttachment).toBeUndefined();
       expect(tooltip.tooltipChart)
           .toEqual(
               '<table class="tooltip">' +
               '<tbody>' +
               '<tr><th colspan="2">' +
               Tooltip.formatTimestamp(DateTime.utc(1988, 3, 25)) +
               '</th></tr>' +
               '<tr>' +
               '<td class="name" style="color: ' + Colors.ABNORMAL +
               '"><span style="' + Tooltip.TOOLTIP_ABNORMAL_CSS + seriesColor +
               '"></span>' +
               '<div style="display: inline-block;">Hemoglobin</div></td>' +
               '<td class="value" style="color: ' + Colors.ABNORMAL +
               '">100 g/dL</td>' +
               '</tr>' +
               '</tbody></table>');
     });

  it('should show only the interpretation if there is no observation value, result, or unit',
     () => {
       const seriesColor = Color.rgb(12, 67, 199);
       const observation = makeSampleObservation(
           100, DateTime.utc(1988, 3, 25), [10, 20],
           'H',   // interpretation
           true,  // hasInterpretation
           false  // hasValueAndResult
       );
       const obs = new AnnotatedObservation(observation);
       const tooltip = new GenericAnnotatedObservationTooltip(true, seriesColor)
                           .getTooltip(obs, TestBed.get(DomSanitizer), true);
       expect(tooltip).toBeDefined();
       expect(tooltip.additionalAttachment).toBeUndefined();
       expect(tooltip.tooltipChart)
           .toEqual(
               '<table class="tooltip">' +
               '<tbody>' +
               '<tr><th colspan="2">' +
               Tooltip.formatTimestamp(DateTime.utc(1988, 3, 25)) +
               '</th></tr>' +
               '<tr>' +
               '<td class="name" style="color: ' + Colors.ABNORMAL +
               '"><span style="' + Tooltip.TOOLTIP_ABNORMAL_CSS + seriesColor +
               '"></span>' +
               '<div style="display: inline-block;">Hemoglobin</div></td>' +
               '<td class="value" style="color: ' + Colors.ABNORMAL +
               '"> (High)</td>' +
               '</tr>' +
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
    const tooltip = new GenericAbnormalTooltip(true, Color.rgb(12, 67, 199))
                        .getTooltip(params, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="tooltip">' +
            '<tbody>' +
            '<tr><th colspan="2">' +
            Tooltip.formatTimestamp(DateTime.utc(1988, 3, 22)) + '</th></tr>' +
            '<tr><th colspan="2">Caution: abnormal value</th></tr>' +
            '</tbody></table>');
  });
});
