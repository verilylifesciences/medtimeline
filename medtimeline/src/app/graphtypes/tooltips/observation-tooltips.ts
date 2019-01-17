// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';

import {Observation} from '../../fhir-data-classes/observation';
import {Tooltip} from './tooltip';
/*
 * This class makes a tooltip for a list of Observations containing discrete, or
 * qualitative, values rather than quantitative results. The list of
 * Observations should all have the same timestamp.
 */
export class DiscreteObservationTooltip extends Tooltip<Observation[]> {
  getTooltip(observations: Observation[], sanitizer: DomSanitizer): string {
    const table = Tooltip.createNewTable();
    Tooltip.addTimeHeader(observations[0].timestamp, table, sanitizer);
    for (const obs of observations) {
      Tooltip.addRow(table, [obs.label, obs.result], sanitizer);
    }
    return table.outerHTML;
  }
}
