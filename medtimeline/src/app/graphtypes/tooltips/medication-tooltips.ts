// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {MedicationOrder} from '../../fhir-data-classes/medication-order';
import {Tooltip} from '../tooltips/tooltip';

/**
 * Makes a tooltip for a medication order that lists the order's first and last
 * doses in a table.
 */
export class MedicationTooltip extends Tooltip {
  readonly medication: string;
  readonly firstDose: string;
  readonly lastDose: string;
  constructor(order: MedicationOrder, sanitizer: DomSanitizer) {
    super(sanitizer, undefined);
    this.medication = order.label;

    this.firstDose = this.formatTimestamp(order.firstAdministration.timestamp);
    this.lastDose = this.formatTimestamp(order.lastAdmininistration.timestamp);
  }

  getTooltip(): string {
    if (!this.tooltipText) {
      const table = this.clearTable();
      const styleName = this.getTooltipName(
          this.sanitizer.sanitize(SecurityContext.HTML, this.medication));

      this.addHeader(this.medication, table);
      this.addRow(table, styleName, ['First Dose', this.firstDose]);
      this.addRow(table, styleName, ['Last Dose', this.lastDose]);
      this.resetTableVisiblity(table);
    }
    return this.tooltipText;
  }
}
