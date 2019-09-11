// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {AnnotatedAdministration, MedicationAdministrationSet} from 'src/app/fhir-data-classes/medication-administration';
import {AnnotatedMedicationOrder} from 'src/app/fhir-data-classes/medication-order';
import {makeMedicationAdministration, makeMedicationOrder} from 'src/app/test_utils';
import {UI_CONSTANTS} from 'src/constants';

import {MedicationAdministrationTooltip, MedicationTooltip} from './medication-tooltips';
import {Tooltip} from './tooltip';

describe('MedicationTooltip', () => {
  const firstAdmin = makeMedicationAdministration(
      DateTime.fromJSDate(new Date('1957-01-14')).toString());
  const lastAdmin = makeMedicationAdministration(
      DateTime.fromJSDate(new Date('1957-01-16')).toString());
  const annotatedOrder = new AnnotatedMedicationOrder(
      makeMedicationOrder(), [firstAdmin, lastAdmin]);

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MedicationTooltip();
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltip = new MedicationTooltip().getTooltip(
        annotatedOrder, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody><tr><th colspan="2">vancomycin: Order #' +
            annotatedOrder.order.orderId + '</th></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.FIRST_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(firstAdmin.timestamp) + '</td></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.LAST_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(lastAdmin.timestamp) + '</td></tr>' +
            '<tr><td class="name">Dosage Instructions</td><td class="value">Could not retrieve dosage instructions.</td></tr>' +
            '</tbody></table>');
  });

  it('should show dosage instruction information', () => {
    annotatedOrder.order.dosageInstruction = 'dosage';
    const tooltip = new MedicationTooltip().getTooltip(
        annotatedOrder, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip">' +
            '<tbody><tr><th colspan="2">vancomycin: Order #' +
            annotatedOrder.order.orderId + '</th></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.FIRST_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(firstAdmin.timestamp) + '</td></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.LAST_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(lastAdmin.timestamp) + '</td></tr>' +
            '<tr><td class="name">' + UI_CONSTANTS.DOSAGE_INSTRUCTIONS +
            '</td><td class="value">dosage</td></tr>' +
            '</tbody></table>');
  });
});


describe('MedicationAdministrationTooltip', () => {
  const admin1 = new AnnotatedAdministration(makeMedicationAdministration(
      DateTime.fromJSDate(new Date('1957-01-14')).toString()));

  const admin2 = new AnnotatedAdministration(
      makeMedicationAdministration(
          DateTime.fromJSDate(new Date('1957-01-15')).toString()),
      admin1);

  beforeEach(async(() => {
    TestBed.configureTestingModule({}).compileComponents();
  }));

  it('should create', () => {
    const tooltip = new MedicationAdministrationTooltip().getTooltip(
        [admin1], TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text for tooltip with no prior dose', () => {
    const tooltip = new MedicationAdministrationTooltip().getTooltip(
        [admin1], TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    console.log(tooltip.tooltipChart);
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr>' +
            '<th colspan="3">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            ': Vancomycin dose. Part of Order #' +
            admin1.medAdministration.medicationOrderId + '</th></tr>' +
            '<tr>' +
            '<td class="name"></td>' +
            '<td class="value">Time</td>' +
            '<td class="value">Dose</td></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.THIS_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            '</td>' +
            '<td class="value">50 mg</td></tr>' +
            '<tr><td colspan="3" class="name">' +
            UI_CONSTANTS.NO_PREVIOUS_DOSE + '</td></tr></tbody></table>');
  });

  it('should generate tooltip text for tooltip with a prior dose', () => {
    const tooltip = new MedicationAdministrationTooltip().getTooltip(
        [admin2], TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
    expect(tooltip.additionalAttachment).toBeUndefined();
    expect(tooltip.tooltipChart)
        .toEqual(
            '<table class="c3-tooltip"><tbody>' +
            '<tr><th colspan="3">' +
            Tooltip.formatTimestamp(admin2.medAdministration.timestamp) +
            ': Vancomycin dose. Part of Order #' +
            admin2.medAdministration.medicationOrderId + '</th>' +
            '</tr><tr>' +
            '<td class="name"></td><td class="value">Time</td>' +
            '<td class="value">Dose</td></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.THIS_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin2.medAdministration.timestamp) +
            '</td>' +
            '<td class="value">50 mg</td></tr>' +
            '<tr>' +
            '<td class="name">' + UI_CONSTANTS.PREVIOUS_DOSE + '</td>' +
            '<td class="value">' +
            Tooltip.formatTimestamp(admin1.medAdministration.timestamp) +
            '<br>(24:0 before this dose)</td>' +
            '<td class="value">50 mg</td></tr></tbody></table>');
  });
});
