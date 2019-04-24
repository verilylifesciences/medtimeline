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
      /** Absolute axis bounds for the graph displaying this ResourceCode. */
      readonly displayBounds?: [number, number],
      /**
       * Whether or not to force the axis bounds, even if a smaller range
       * containing all the data can be calculated.
       */
      readonly forceDisplayBounds = false,
      /**
       * The (optional) function that will make an observation into an
       * AnnotatedObservation so that the graph can show the appropriate
       * tooltip.
       */
      readonly makeAnnotated?:
          (observation: Observation,
           dateRange: Interval) => Promise<AnnotatedObservation>) {
    super(
        fhirService, label, resourceCodes, displayGrouping, chartType,
        displayBounds, forceDisplayBounds);

    // If there's only one resource code in the group, just use its display
    // bounds as the axis bounds.
    if (!displayBounds && resourceCodes.length === 1) {
      this.displayBounds = resourceCodes[0].displayBounds;
    }
  }

  /**
   * Gets one ObservationSet for each LOINCCode in this group, and returns
   * a list of those ObservationSets.
   * If an Observation contains "inner components", this returns separate
   * ObservationSets for those LOINCCodes, provided that they are mapped.
   */
  getResourceFromFhir(dateRange: Interval): Promise<ObservationSet[]> {
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
          const mapObs =
              new Map<string, Array<Promise<AnnotatedObservation>>>();
          flattened.forEach(conceptList => {
            for (const observation of conceptList) {
              // From this point on, each observation should have a value,
              // result, or interpretation. All observations that just had
              // innerComponents have been flattened out.
              let obsList = mapObs.get(observation.label);
              if (!obsList) {
                obsList = new Array<Promise<AnnotatedObservation>>();
              }
              if (this.makeAnnotated) {
                obsList.push(this.makeAnnotated(observation, dateRange));
              } else {
                obsList.push(
                    Promise.resolve(new AnnotatedObservation(observation)));
              }
              mapObs.set(observation.label, obsList);
            }
          });
          return Array.from(mapObs.values());
        })
        .then(
            doubleAnnotationArray => doubleAnnotationArray.map(
                singleAnnotationArray =>
                    Promise.all(singleAnnotationArray)
                        .then(
                            resolvedAnnotations =>
                                new ObservationSet(resolvedAnnotations))))
        .then(observationSetArray => Promise.all(observationSetArray));
  }
}
