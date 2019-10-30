// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Duration} from 'luxon';
import {AnnotatedAdministration, MedicationAdministration} from 'src/app/fhir-data-classes/medication-administration';
import {formatNumberWithPrecision} from 'src/app/number_utils';
import {UI_CONSTANTS} from 'src/constants';

import {AnnotatedMedicationOrder} from '../../../fhir-data-classes/medication-order';
import {Tooltip} from '../tooltips/tooltip';

import {AnnotatedTooltip} from './annotated-tooltip';

/**
 * Makes a tooltip for a medication order that lists the order's first and last
 * doses in a table.
 */
export class MedicationTooltip extends Tooltip<AnnotatedMedicationOrder> {
  getTooltip(annotatedOrder: AnnotatedMedicationOrder, sanitizer: DomSanitizer):
      AnnotatedTooltip {
    const medication = annotatedOrder.label;
    const firstDose =
        Tooltip.formatTimestamp(annotatedOrder.firstAdministration.timestamp);
    const lastDose =
        Tooltip.formatTimestamp(annotatedOrder.lastAdministration.timestamp);
    const dosageInstruction = annotatedOrder.order.dosageInstruction;
    const table = Tooltip.createNewTable();
    Tooltip.addHeader(
        `${medication}: Order #${annotatedOrder.order.orderId}`, table,
        sanitizer);
    Tooltip.addRow(table, [UI_CONSTANTS.FIRST_DOSE, firstDose], sanitizer);
    Tooltip.addRow(table, [UI_CONSTANTS.LAST_DOSE, lastDose], sanitizer);
    Tooltip.addRow(
        table, [UI_CONSTANTS.DOSAGE_INSTRUCTIONS, dosageInstruction],
        sanitizer);

    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
  }
}

/**
 * Makes a tooltip for a medication administration that shows its dose
 * as well as the time since the last dose.
 */
export class MedicationAdministrationTooltip extends
    Tooltip<AnnotatedAdministration[]> {
  getTooltip(
      administrations: AnnotatedAdministration[],
      sanitizer: DomSanitizer): AnnotatedTooltip {
    const timestamp = administrations[0].medAdministration.timestamp;
    const table = Tooltip.createNewTable();
    for (const administration of administrations) {
      Tooltip.addHeader(
          `${Tooltip.formatTimestamp(timestamp)}: ${
              administration.medAdministration.rxNormCode
                  .label} dose. Part of Order #${
              administration.medAdministration.medicationOrderId}`,
          table, sanitizer, 3);
      Tooltip.addRow(table, ['', 'Time', 'Dose'], sanitizer);
      Tooltip.addRow(
          table,
          [
            UI_CONSTANTS.THIS_DOSE,
            Tooltip.formatTimestamp(administration.medAdministration.timestamp),
            this.formatDosage(administration.medAdministration)
          ],
          sanitizer);

      if (administration.previousDose) {
        const timestampDifference: Duration =
            administration.medAdministration.timestamp.diff(
                administration.previousDose.medAdministration.timestamp);

        const doseDiffText =
            Tooltip.formatTimestamp(
                administration.previousDose.medAdministration.timestamp) +
            '<br>(' + timestampDifference.toFormat('h:m') +
            ' before this dose)';

        Tooltip.addRow(
            table,
            [
              UI_CONSTANTS.PREVIOUS_DOSE, doseDiffText,
              this.formatDosage(administration.previousDose.medAdministration)
            ],
            sanitizer);
      } else {
        Tooltip.addRow(
            table, [UI_CONSTANTS.NO_PREVIOUS_DOSE], sanitizer, undefined, false,
            3);
      }
    }
    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
  }

  private formatDosage(administration: MedicationAdministration) {
    return formatNumberWithPrecision(administration.dosage.quantity) + ' ' +
        administration.dosage.unit;
  }
}
