// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Duration} from 'luxon';
import {AnnotatedAdministration, MedicationAdministration} from 'src/app/fhir-data-classes/medication-administration';
import {formatNumberWithPrecision} from 'src/app/number_utils';

import {MedicationOrder} from '../../fhir-data-classes/medication-order';
import {Tooltip} from '../tooltips/tooltip';
import {AnnotatedTooltip} from './annotated-tooltip';

/**
 * Makes a tooltip for a medication order that lists the order's first and last
 * doses in a table.
 */
export class MedicationTooltip extends Tooltip<MedicationOrder> {
  getTooltip(order: MedicationOrder, sanitizer: DomSanitizer): AnnotatedTooltip {
    const medication = order.label;
    const firstDose =
        Tooltip.formatTimestamp(order.firstAdministration.timestamp);
    const lastDose =
        Tooltip.formatTimestamp(order.lastAdmininistration.timestamp);
    const dosageInstruction = order.dosageInstruction;
    const table = Tooltip.createNewTable();
    Tooltip.addHeader(medication, table, sanitizer);
    Tooltip.addRow(table, ['First Dose', firstDose], sanitizer);
    Tooltip.addRow(table, ['Last Dose', lastDose], sanitizer);
    Tooltip.addRow(
        table, ['Dosage Instructions', dosageInstruction], sanitizer);

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
          Tooltip.formatTimestamp(timestamp) + ': Dose ' +
              administration.doseInOrder + ' of ' +
              administration.medAdministration.rxNormCode.label,
          table, sanitizer, 3);
      Tooltip.addRow(table, ['', 'Time', 'Dose'], sanitizer);
      Tooltip.addRow(
          table,
          [
            'This dose',
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
            '<br>(' + timestampDifference.toFormat('h:m') + ' after dose ' +
            administration.previousDose.doseInOrder + ')';

        Tooltip.addRow(
            table,
            [
              'Previous dose', doseDiffText,
              this.formatDosage(administration.previousDose.medAdministration)
            ],
            sanitizer);
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
