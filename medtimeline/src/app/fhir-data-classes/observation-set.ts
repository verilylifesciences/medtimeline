// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime} from 'luxon';

import {FhirResourceSet} from '../fhir-resource-set';
import {fixUnitAbbreviations} from '../unit_utils';

import {AnnotatedObservation} from './annotated-observation';

/**
 * A set of observations that belong together as part of the same series.
 */
export class ObservationSet extends FhirResourceSet<AnnotatedObservation> {
  /**
   * The normal ranges for this set of observations. It maps a timestamp of each
   * Observation with a normal range to the corresponding normal range.
   */
  normalRanges: Map<DateTime, [number, number]> =
      new Map<DateTime, [number, number]>();

  /**
   * The units for this set of observations. Left unset if the normal
   * range is different across the observations.
   */
  readonly unit: string;

  /**
   * Whether or not any Observations belonging to this ObservationSet contain
   * qualitative results rather than numerical values.
   */
  readonly anyQualitative: boolean = false;

  /**
   * Constructor for ObservationSet.
   * @param observationList The list of observations belonging together.
   * @throws Error if the observations have different labels, as this indicates
   *     that they are data points from different series, or if there is not
   *     a label.
   */
  constructor(observationList: AnnotatedObservation[]) {
    super(observationList);

    let firstUnit;
    if (observationList.length > 0) {
      firstUnit = observationList[0].observation.unit;
    }
    // Ensure that the labels of the data are all the same.
    let differentUnits = false;

    for (const obs of observationList) {
      // Some observations may not have a normal range.
      if (obs.observation.normalRange) {
        this.normalRanges.set(
            obs.observation.timestamp, obs.observation.normalRange);
      }
      // Some observations may not have a normal range.
      if (obs.observation.unit && obs.observation.unit !== firstUnit) {
        differentUnits = true;
      }
    }
    if (!differentUnits && firstUnit) {
      this.unit = fixUnitAbbreviations(firstUnit);
    }

    this.anyQualitative = observationList.some(
        obs => (obs.observation.result !== null && !obs.observation.value));
  }
}
