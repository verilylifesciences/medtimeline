// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Color} from 'd3';
import {AnnotatedObservation} from 'src/app/fhir-data-classes/annotated-observation';

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

/**
 * Makes a generic tooltip for an AnnotatedObservation with rows for each of
 * its annotation values.
 */
export class GenericAnnotatedObservationTooltip extends
    Tooltip<AnnotatedObservation> {
  constructor(private addTimestampRow: boolean, private color: Color) {
    super();
  }

  /**
   * Returns the HTML for a generic tooltip.
   * @param observation The AnnotatedObservation used to generate the tooltip
   * @param sanitizer A DOM sanitizer
   * @returns If the observation has annotations, a HTML table with the
   *     annotation values. If there are no annotations, will return undefined.
   */
  getTooltip(observation: AnnotatedObservation, sanitizer: DomSanitizer): string
      |undefined {
    if (observation.annotationValues.length === 0) {
      return undefined;
    }
    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(
          observation.observation.timestamp, table, sanitizer);
    }

    Tooltip.addRow(
        table,
        [
          observation.label,
          observation.observation.value.value + ' ' +
              observation.observation.unit
        ],
        sanitizer, this.color);
    for (const annotation of observation.annotationValues) {
      Tooltip.addRow(table, annotation, sanitizer);
    }
    return table.outerHTML;
  }
}
