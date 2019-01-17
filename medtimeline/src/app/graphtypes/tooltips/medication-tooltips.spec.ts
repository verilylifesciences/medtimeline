// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {AnnotatedAdministration, MedicationAdministrationSet} from 'src/app/fhir-data-classes/medication-administration';
import {makeMedicationAdministration, makeMedicationOrder} from 'src/app/test_utils';

import {MedicationAdministrationTooltip, MedicationTooltip} from './medication-tooltips';
import {Tooltip} from './tooltip';

describe('MedicationTooltip', () => {
  const order = makeMedicationOrder();

  // set up administrations to avoid fhir call
  order.administrationsForOrder = new MedicationAdministrationSet([
    new AnnotatedAdministration(
        makeMedicationAdministration(
            DateTime.fromJSDate(new Date('1957-01-14')).toString()),
        0, 0),
    new AnnotatedAdministration(
        makeMedicationAdministration(
            DateTime.fromJSDate(new Date('1957-01-16')).toString()),
        0, 0)
  ]);
  order.firstAdministration =
      order.administrationsForOrder.resourceList[0].medAdministration;
  order.lastAdmininistration =
      order.administrationsForOrder.resourceList[1].medAdministration;

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MedicationTooltip();
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltipText =
        new MedicationTooltip().getTooltip(order, TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody><tr><th colspan="2">vancomycin</th></tr>' +
            '<tr>' +
            '<td class="name">First Dose</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(order.firstAdministration.timestamp) +
            '</td></tr>' +
            '<tr>' +
            '<td class="name">Last Dose</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(order.lastAdmininistration.timestamp) +
            '</td></tr></tbody></table>');
  });
});


describe('MedicationAdministrationTooltip', () => {
  const admin1 = new AnnotatedAdministration(
      makeMedicationAdministration(
          DateTime.fromJSDate(new Date('1957-01-14')).toString()),
      0, 0);

  const admin2 = new AnnotatedAdministration(
      makeMedicationAdministration(
          DateTime.fromJSDate(new Date('1957-01-15')).toString()),
      1, 3, admin1);

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MedicationAdministrationTooltip().getTooltip(
        [admin1], TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text for tooltip with no prior dose', () => {
    const tooltipText = new MedicationAdministrationTooltip().getTooltip(
        [admin1], TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr>' +
            '<th colspan="3">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            ': Dose 0 of Vancomycin</th></tr>' +
            '<tr>' +
            '<td class="name"></td>' +
            '<td class="value">Time</td>' +
            '<td class="value">Dose</td></tr>' +
            '<tr>' +
            '<td class="name">This dose</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            '</td>' +
            '<td class="value">50 mg</td></tr></tbody></table>');
  });

  it('should generate tooltip text for tooltip with a prior dose', () => {
    const tooltipText = new MedicationAdministrationTooltip().getTooltip(
        [admin2], TestBed.get(DomSanitizer));
    expect(tooltipText).toBeDefined();
    expect(tooltipText)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr><th colspan="3">' +
            Tooltip.formatTimestamp(admin2.medAdministration.timestamp) +
            ': Dose 1 of Vancomycin</th>' +
            '</tr><tr>' +
            '<td class="name"></td><td class="value">Time</td>' +
            '<td class="value">Dose</td></tr>' +
            '<tr>' +
            '<td class="name">This dose</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin2.medAdministration.timestamp) +
            '</td>' +
            '<td class="value">50 mg</td></tr>' +
            '<tr>' +
            '<td class="name">Previous dose</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            '<br>(24:0 after dose 0)</td>' +
            '<td class="value">50 mg</td></tr></tbody></table>');
  });
});
