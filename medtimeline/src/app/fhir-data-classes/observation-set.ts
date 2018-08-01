// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {FhirResourceSet} from '../fhir-resource-set';
import {Observation} from './observation';
/**
 * A set of observations that belong together as part of the same series.
 */
export class ObservationSet extends FhirResourceSet<Observation> {
  /**
   * The normal range for this set of observations. Left unset if the normal
   * range is different across the observations.
   */
  readonly normalRange: [number, number];

  /**
   * The units for this set of observations. Left unset if the normal
   * range is different across the observations.
   */
  readonly unit: string;

  /**
   * Whether or not all Observations belonging to this ObservationSet contain
   * all qualitative results rather than numerical values.
   */
  readonly allQualitative: boolean = false;

  /**
   * Constructor for ObservationSet.
   * @param observationList The list of observations belonging together.
   * @throws Error if the observations have different labels, as this indicates
   *     that they are data points from different series, or if there is not
   *     a label.
   */
  constructor(observationList: Observation[]) {
    super(observationList);

    const firstNormalRange = observationList[0].normalRange;
    const firstUnit = observationList[0].unit;
    // Ensure that the labels of the data are all the same. Also ensure that
    // we only set a normal range if all the observations have a matching
    // normal range.
    let differentNormalRanges = false;
    let differentUnits = false;

    for (const obs of observationList) {
      // Some observations may not have a normal range.
      if (obs.normalRange &&
          (obs.normalRange[0] !== firstNormalRange[0] ||
           obs.normalRange[1] !== firstNormalRange[1])) {
        differentNormalRanges = true;
      }
      // Some observations may not have a normal range.
      if (obs.unit && obs.unit !== firstUnit) {
        differentUnits = true;
      }
    }

    if (!differentNormalRanges) {
      this.normalRange = firstNormalRange;
    }
    if (!differentUnits) {
      this.unit = firstUnit;
    }

    this.allQualitative =
        observationList.every(code => (code.result !== null && !code.value));
  }
}
