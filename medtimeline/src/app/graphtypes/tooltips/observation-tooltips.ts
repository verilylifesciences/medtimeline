// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {AnnotatedObservation} from 'src/app/fhir-data-classes/annotated-observation';
import {NORMAL} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

import {Observation} from '../../fhir-data-classes/observation';

import {Tooltip} from './tooltip';
import {AnnotatedTooltip} from './annotated-tooltip';

/*
 * This class makes a tooltip for a list of Observations containing discrete, or
 * qualitative, values rather than quantitative results. The list of
 * Observations should all have the same timestamp.
 */
export class DiscreteObservationTooltip extends Tooltip<Observation[]> {
  constructor(private addTimestampRow = true) {
    super();
  }

  /**
   * Returns the HTML for a generic tooltip for discrete observations.
   * @param observations An array of type Observation
   * @param sanitizer A DOM sanitizer
   * @param isAbnormal A boolean used to change the color of the text if abnormal
   * @returns A string representing the HTML table.
   */
  getTooltip(observations: Observation[], sanitizer: DomSanitizer): AnnotatedTooltip {
    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(observations[0].timestamp, table, sanitizer);
    }
    for (const obs of observations) {
      let isAbnormal = false;
      let obsValue = obs.result;
      if (obs.interpretation && obs.interpretation.code !== NORMAL) {
        isAbnormal = true;
        obsValue = obs.result + ' (' + obs.interpretation.display + ')';
      }
      Tooltip.addRow(table,
                    [obs.label, obsValue], sanitizer,
                    undefined,    // color
                    isAbnormal);
    }
    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
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
   * @param isAbnormal A boolean used to change the color of the text if abnormal
   * @returns If the observation has annotations, a AnnotatedTooltip.
   *    If there are no annotations, will return undefined.
   */
  getTooltip(observation: AnnotatedObservation, sanitizer: DomSanitizer, isAbnormal: boolean = false)
            : AnnotatedTooltip|undefined {
    const table = Tooltip.createNewTable();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(
          observation.observation.timestamp, table, sanitizer);
    }

    Tooltip.addRow(
        table,
        [
          observation.label,
          this.getObservationValue(observation)
        ],
        sanitizer, this.color, isAbnormal);
    for (const annotation of observation.annotationValues) {
      Tooltip.addRow(table, annotation, sanitizer);
    }
    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
  }
  /**
   * Helper function that returns a string that reflects the observation
   * value depicted on the tooltip.
   * @param observation The AnnotatedObservation used to generate the tooltip
   */

  private getObservationValue(observation: AnnotatedObservation): string {
    const interpretation = observation.observation.interpretation ?
              ' (' + observation.observation.interpretation.display + ')' :
              '';
    // Example: Temperature | 38.8 Deg C (HI)
    if (observation.observation.value && observation.observation.unit) {
      return observation.observation.value.value.toString() + ' ' +
             observation.observation.unit + interpretation;
    }
    // Example: Bacteria Urinalysis | Trace Graded/hpf (ABN)
    if (observation.observation.result) {
      return observation.observation.result + interpretation;
    }
    // Example: Blood Pressure | (HI)
    return interpretation;
  }
}

/**
 * Makes a generic tooltip for an AnnotatedObservation with rows for each of
 * its annotation values.
 */
export class GenericAbnormalTooltip extends
    Tooltip<{[key: string]: number | string}> {
  constructor(private addTimestampRow: boolean, private color: Color) {
    super();
  }

  /**
   * Returns the HTML for a generic tooltip.
   * @param params The parameters necessary for the AbnormalTooltip text. It
   *     should contain a timestamp field, a value field, a label field, and a
   *     unit field.
   * @param sanitizer A DOM sanitizer
   * @returns If the observation has annotations, an AnnotatedTooltip.
   *  If there are no annotations, will return undefined.
   */
  getTooltip(params: {[key: string]: number|string}, sanitizer: DomSanitizer):
      AnnotatedTooltip|undefined {
    const table = Tooltip.createNewTable();
    const millis: any = params['timestamp'];
    const timestamp = DateTime.fromMillis(millis).toLocal();
    if (this.addTimestampRow) {
      Tooltip.addTimeHeader(timestamp, table, sanitizer);
    }

    Tooltip.addHeader('Caution: abnormal value', table, sanitizer);
    const tooltipChart = table.outerHTML;
    return new AnnotatedTooltip(tooltipChart);
  }
}
