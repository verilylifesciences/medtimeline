// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, TestBed} from '@angular/core/testing';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';
import {AnnotatedAdministration, MedicationAdministrationSet} from 'src/app/fhir-data-classes/medication-administration';
import {makeMedicationAdministration, makeMedicationOrder} from 'src/app/test_utils';

import {MedicationTooltip} from './medication-tooltips';

describe('MedicationTooltip', () => {
  const order = makeMedicationOrder();

  // set up administrations to avoid fhir call
  order.administrationsForOrder = new MedicationAdministrationSet([
    new AnnotatedAdministration(
        makeMedicationAdministration(
            DateTime.fromJSDate(new Date('2012-08-03')).toString()),
        0, 0),
    new AnnotatedAdministration(
        makeMedicationAdministration(
            DateTime.fromJSDate(new Date('2012-08-05')).toString()),
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
    const tooltip = new MedicationTooltip(order, TestBed.get(DomSanitizer));
    expect(tooltip).toBeDefined();
  });

  it('should generate tooltip text', () => {
    const tooltip = new MedicationTooltip(order, TestBed.get(DomSanitizer));
    const tooltipText = tooltip.getTooltip();
    expect(tooltipText).toBeDefined();
    const firstAdminTime = order.firstAdministration.timestamp.toLocal();
    const firstTimeString = firstAdminTime.toLocaleString() + ' ' +
        firstAdminTime.toLocaleString(DateTime.TIME_24_SIMPLE);
    const lastAdminTime = order.lastAdmininistration.timestamp.toLocal();
    const lastTimeString = lastAdminTime.toLocaleString() + ' ' +
        lastAdminTime.toLocaleString(DateTime.TIME_24_SIMPLE);
    // Angular generates a numerical idenitifer for each table and this
    // regular expression strips it from the HTML check.
    expect(tooltipText.replace(/c\d*=""/g, ''))
        .toEqual(
            '<table _ngcontent-c133=""'.replace(/c\d*=""/g, '') +
            ' class="c3-tooltip" id="c3-tooltip">' +
            '<tbody><tr><th colspan="2">vancomycin</th></tr>' +
            '<tr class="c3-tooltip-name--vancomycin">' +
            '<td class="name">First Dose</td>' +
            '<td class="value">' + firstTimeString + '</td></tr>' +
            '<tr class="c3-tooltip-name--vancomycin">' +
            '<td class="name">Last Dose</td>' +
            '<td class="value">' + lastTimeString +
            '</td></tr></tbody></table>');
  });
});
