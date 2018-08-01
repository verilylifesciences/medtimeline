// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {SecurityContext} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {Observation} from '../../fhir-data-classes/observation';
import {Tooltip} from './tooltip';
/*
 * This class makes a tooltip for a list of Observations containing discrete, or
 * qualitative, values rather than quantitative results. The list of
 * Observations should all have the same timestamp.
 */
export class DiscreteObservationTooltip extends Tooltip {
  readonly observations: Observation[];
  constructor(observations: Observation[], sanitizer: DomSanitizer) {
    super(sanitizer, observations[0].timestamp);
    this.observations = observations;
  }

  getTooltip(): string {
    if (!this.tooltipText) {
      const table = this.clearTable();
      const styleName = this.getTooltipName(
          this.sanitizer.sanitize(SecurityContext.HTML, this.timestamp));
      this.addTimeHeader(this.timestamp, table);
      for (const obs of this.observations) {
        this.addRow(table, styleName, [obs.label, obs.result]);
      }
      this.resetTableVisiblity(table);
    }
    return this.tooltipText;
  }
}
