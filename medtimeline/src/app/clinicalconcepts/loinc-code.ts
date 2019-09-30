// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {APP_TIMESPAN} from 'src/constants';

import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {ObservationSet} from '../fhir-data-classes/observation-set';
import {FhirService} from '../fhir.service';
import {ChartType} from '../graphtypes/graph/graph.component';

import {DisplayGrouping} from './display-grouping';
import {ResourceCode} from './resource-code-group';
import {AbstractResourceCodeGroup} from './resource-code-group';

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
export class LOINCCodeGroup extends
    AbstractResourceCodeGroup<ObservationSet, AnnotatedObservation> {
  constructor(
      /** FHIR service for retrieving data */
      readonly fhirService: FhirService,
      /** The label for this resource code group. */
      readonly label: string,
      /** The resource codes to display on this Axis. */
      readonly resourceCodes: ResourceCode[],
      /** The display grouping for this resource code group. */
      readonly displayGrouping: DisplayGrouping,
      /** The chart type for this Axis. */
      readonly chartType: ChartType,
      /**
       * The (optional) function that will make an observation into an
       * AnnotatedObservation so that the graph can show the appropriate
       * tooltip.
       */
      readonly makeAnnotated?:
          (observation: Observation,
           dateRange: Interval) => Promise<AnnotatedObservation>) {
    super(fhirService, label, resourceCodes, displayGrouping, chartType);
  }

  /**
   * Gets one ObservationSet for each LOINCCode in the rawResults, and returns
   * a list of those ObservationSets.
   * @param rawResults: List of AnnotatedObservations to group into
   *     ObservationSets
   * @returns: list of ObservationSets. One ObservationSet for each LOINCCode
   * found in the rawResults.
   */
  formatRawResults(rawResults: AnnotatedObservation[]):
      Promise<ObservationSet[]> {
    const mapObs = new Map<string, AnnotatedObservation[]>();
    let maxPrecision = 0;
    for (const annotatedObservation of rawResults) {
      const observation = annotatedObservation.observation;
      // From this point on, each observation should have a value,
      // result, or interpretation. All observations that just had
      // innerComponents have been flattened out.
      let obsList = mapObs.get(observation.label);
      if (!obsList) {
        obsList = new Array<AnnotatedObservation>();
      }
      obsList.push(annotatedObservation);
      if (observation.precision > maxPrecision) {
        maxPrecision = observation.precision;
      }
      mapObs.set(observation.label, obsList);
    }
    this.precision = maxPrecision;
    const doubleAnnotationArray = Array.from(mapObs.values());

    return Promise.all(doubleAnnotationArray.map(
        singleAnnotationArray =>
            Promise.all(singleAnnotationArray)
                .then(
                    resolvedAnnotations =>
                        new ObservationSet(resolvedAnnotations))));
  }

  /**
   * Gets list of Observations from the FHIR server and makes them annotated
   * if makeAnnotated function is defined.
   * If an Observation contains "inner components", this returns separate
   * Observations for those.
   * @param dateRange: date range to get results from FHIR for
   * @returns: List of Annotated Observations
   */
  getResourceFromFhir(dateRange: Interval): Promise<AnnotatedObservation[]> {
    return this.fhirService.getObservationsForCodeGroup(this, dateRange)
        .then(
            observationDoubleArray => {
              // Unnest the inner and outer observations into one flattened
              // array per concept group.
              return observationDoubleArray.map(
                  obsSingleArray =>
                      Array.from(obsSingleArray)
                          .reduce((acc: Observation[], observation) => {
                            // The outer component may not have a
                            // value or result.
                            if (observation.value || observation.result ||
                                observation.interpretation) {
                              acc.push(observation);
                            }
                            // Add separate ObservationLists for
                            // each inner component.
                            if (observation.innerComponents.length > 0) {
                              for (const innerComponent of
                                       observation.innerComponents) {
                                acc.push(innerComponent);
                              }
                            }
                            return acc;
                          }, []));
            },
            rejection => {
              // If there is any error with constructing an Observation for any
              // code in this code group, throw the error.
              throw rejection;
            })
        .then(flattened => {
          const resultList = new Array<Promise<AnnotatedObservation>>();
          flattened.forEach(conceptList => {
            for (const observation of conceptList) {
              if (this.makeAnnotated) {
                resultList.push(this.makeAnnotated(observation, dateRange));
              } else {
                resultList.push(
                    Promise.resolve(new AnnotatedObservation(observation)));
              }
            }
          });
          return Promise.all(resultList);
        });
  }
}
