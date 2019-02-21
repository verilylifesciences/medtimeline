// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {APP_TIMESPAN} from 'src/constants';

import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {FhirService} from '../fhir.service';

import {ResourceCode} from './resource-code-group';
import {CachedResourceCodeGroup} from './resource-code-group';

/**
 * Holds LOINC codes.
 */
export class LOINCCode extends ResourceCode {
  static readonly CODING_STRING = 'http://loinc.org';

  dataAvailableInAppTimeScope(fhirService: FhirService): Promise<boolean> {
    return fhirService.observationsPresentWithCode(this, APP_TIMESPAN);
  }
}

/**
 * Represents one or more LOINC codes that should be displayed together. In the
 * case of multiple LOINC codes in a group, you should provide a label for that
 * group.
 */
export class LOINCCodeGroup extends CachedResourceCodeGroup<ObservationSet> {
  /**
   * Gets one ObservationSet for each LOINCCode in this group, and returns
   * a list of those ObservationSets.
   * If an Observation contains "inner components", this returns separate
   * ObservationSets for those LOINCCodes, provided that they are mapped.
   */
  getResourceFromFhir(dateRange: Interval): Promise<ObservationSet[]> {
    return this.fhirService.getObservationsForCodeGroup(this, dateRange)
        .then(
            result => {
              const obsSetList: ObservationSet[] = [];
              // Keep track of the potential outer/inner components of each
              // Observation by mapping labels to all the Observations
              // associated with that label.
              const mapObs = new Map<string, Observation[]>();
              for (const o of result) {
                // Separate the Observations into ObservationSets based on
                // possible inner components.
                for (const observation of o) {
                  // The outer component may not have a value or result.
                  if (observation.value || observation.result) {
                    let obsList = mapObs.get(observation.label);
                    if (!obsList) {
                      obsList = [];
                    }
                    obsList.push(observation);
                    mapObs.set(observation.label, obsList);
                  }
                  // Add separate ObservationLists for each inner component.
                  if (observation.innerComponents.length > 0) {
                    for (const innerComponent of observation.innerComponents) {
                      let obsList = mapObs.get(innerComponent.label);
                      if (!obsList) {
                        obsList = [];
                      }
                      obsList.push(innerComponent);
                      mapObs.set(innerComponent.label, obsList);
                    }
                  }
                }
              }
              // We turn each value in the map into an ObservationSet.
              for (const value of Array.from(mapObs.values())) {
                obsSetList.push(new ObservationSet(value));
              }
              return Promise.resolve(obsSetList);
            },
            rejection => {
              // If there is any error with constructing an Observation for any
              // code in this code group, throw the error.
              throw rejection;
            });
  }
}
