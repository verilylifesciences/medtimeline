// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';
import {FhirService} from '../fhir.service';
import {ChartType} from '../graphtypes/graph/graph.component';

import {DisplayGrouping} from './display-grouping';

/**
 * A code specifying the medication or observation type as well as the specific
 * medication or observation.
 */
export abstract class ResourceCode {
  /**
   * The string that holds the FHIR address for the coding system. Every
   * extending class should override this constant, although there is no way
   * we can syntactically enforce this in Typescript.
   */
  static readonly CODING_STRING;

  private static readonly CODE_STRING_TO_CODE:
      {[code: string]: ResourceCode} = {};

  static fromCodeString(code: string): ResourceCode {
    return ResourceCode.CODE_STRING_TO_CODE[code];
  }

  constructor(
      readonly codeString: string, readonly displayGrouping: DisplayGrouping,
      readonly label: string, readonly showByDefault = false,
      /* Absolute axis bounds for the graph displaying this ResourceCode. */
      readonly displayBounds?: [number, number],
      /* Whether or not to force the axis bounds, even if a smaller range
         containing all the data can be calculated. */
      readonly forceDisplayBounds = false) {
    ResourceCode.CODE_STRING_TO_CODE[codeString] = this;
  }

  /**
   * Returns whether there is any data available for this ResourceCode within
   * the fixed timescope of this app.
   */
  abstract dataAvailableInAppTimeScope(fhirService: FhirService):
      Promise<boolean>;
}

/**
 * A class that holds a group of resource codes that should be displayed on
 * the same Axis together.
 */
export class ResourceCodeGroup {
  /* Whether or not to show this ResourceCodeGroup by default. This is true
   * when any ResourceCode in the group should be shown as default.*/
  readonly showByDefault: boolean;

  // The number of decimal places to show for any value associated with this
  // resource group. The default is 0, to minimize errors caused by unnecessary
  // trailing zeros.
  precision = 0;

  /**
   * When we've decided whether this resource code group has data available
   * in the app, it doesn't change over the course of the app lifetime, so we
   * cache it.
   */
  resolvedDataAvailableInAppTimeScope: boolean = undefined;

  constructor(
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
      readonly displayBounds?: number[],
      /**
       * Whether or not to force the axis bounds, even if a smaller range
       * containing all the data can be calculated.
       */
      readonly forceDisplayBounds = false) {
    this.showByDefault = this.resourceCodes.some(code => code.showByDefault);
  }

  /**
   * Returns whether there is any data available for this ResourceCode within
   * the fixed timescope of this app.
   */
  dataAvailableInAppTimeScope(): Promise<boolean> {
    if (this.resolvedDataAvailableInAppTimeScope !== undefined) {
      return Promise.resolve(this.resolvedDataAvailableInAppTimeScope);
    }
    return Promise
        .all(this.resourceCodes.map(
            rc => rc.dataAvailableInAppTimeScope(this.fhirService)))
        .then(bools => {
          this.resolvedDataAvailableInAppTimeScope =
              bools.reduce((result, next) => result = result || next);
          return this.resolvedDataAvailableInAppTimeScope;
        });
  }
}

/**
 * CachedResourceCodeGroups cache their retrieved data in a dictionary keyed
 * by time interval.
 * @param T The type of data to be cached.
 */
export abstract class CachedResourceCodeGroup<T> extends ResourceCodeGroup {
  private dataCache = new Map<Interval, T[]>();

  /**
   * Looks in the cache to see if data for this time interval exists. If not,
   * calls the implementing class's getResourceFromFhir function and caches
   * its data, then returns the data for the given time interval.
   */
  getResourceSet(dateRange: Interval): Promise<T[]> {
    if (this.dataCache.has(dateRange)) {
      return Promise.resolve(this.dataCache.get(dateRange));
    } else {
      return this.getResourceFromFhir(dateRange).then(
          res => {
            this.dataCache.set(dateRange, res);
            return Promise.resolve(this.dataCache.get(dateRange));
          },
          rejection => {
            // If there is any error with getting the resources for this
            // ResourceCodeGroup, throw an error.
            throw rejection;
          });
    }
  }

  /**
   * This function should make the FHIR calls to get promises for the
   * resources corresponding to this resource code group.
   */
  abstract getResourceFromFhir(dateRange: Interval): Promise<T[]>;
}
