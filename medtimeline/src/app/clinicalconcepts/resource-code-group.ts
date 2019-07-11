// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DateTime, Interval} from 'luxon';

import {TimestampedObject} from '../fhir-resource-set';
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
      readonly chartType: ChartType) {
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
export abstract class CachedResourceCodeGroup<
    T, R extends TimestampedObject> extends ResourceCodeGroup {
  dataCache = new Map<string, R[]>();

  /**
   * Looks in the cache to see if data for this time interval exists. If not,
   * calls the implementing class's getResourceFromFhir function and caches
   * its data, then returns the data for the given time interval.
   */
  getResourceSet(dateRange: Interval): Promise<T[]> {
    const originalDataCacheCopy = new Map(this.dataCache);

    // today's results will never be in the cache since we always want to get
    // updated results for today.
    const today = DateTime.utc().toISODate();
    const todaysResults = new Array();

    // get the days during the dateRange Inteval that we do not have in the
    // cache already.
    const daysToFetchFromFhir = new Array<Interval>();

    // splits dateRange into an array of intervals - each 1 day long.
    const daysInRange =
        Interval
            .fromDateTimes(
                dateRange.start.startOf('day'), dateRange.end.endOf('day'))
            .splitBy({days: 1});

    // for each day in the range, check if it is in the cache already.
    // If not, add the day to the daysToFetchFromFhir and add an empty array
    // to the cache. We add an empty array so that if we don't get any results
    // back for a particular day, we know there is no data and we don't need to
    // request that day again.
    for (const dayRange of daysInRange) {
      const cacheKey = dayRange.start.toISODate();
      if (!this.dataCache.has(cacheKey)) {
        daysToFetchFromFhir.push(dayRange);
        // We do not want to cache today's results since their may be
        // additional results next time this data is fetched
        // from FHIR
        if (cacheKey !== today) {
          this.dataCache.set(cacheKey, new Array());
        }
      }
    }

    // This will give a list of the minimal covering set of intervals that
    // are not cached.
    const dateRangesToFetchFromFhir = Interval.merge(daysToFetchFromFhir);
    let fetchPromises = [];

    try {
      fetchPromises = dateRangesToFetchFromFhir.map(
          dateRangeToFetch =>
              this.getResourceFromFhir(dateRangeToFetch)
                  .then(
                      response => {
                        for (const result of response) {
                          const resultDate = result.timestamp.toISODate();
                          // we keep today's results separate so that we
                          // don't cache them.
                          if (resultDate === today) {
                            todaysResults.push(result);
                          } else {
                            this.dataCache.get(resultDate).push(result);
                          }
                        }
                      },
                      rejection => {
                        // reset back to cache if any call to FHIR results in
                        // an error.
                        this.dataCache = originalDataCacheCopy;
                        throw rejection;
                      }));
    } catch (err) {
      // reset back to original cache if there were any issues adding to the
      // cache (such as a result not having a timestamp) - we do not want to
      // cache partial data.
      this.dataCache = originalDataCacheCopy;
      throw err;
    }

    return Promise.all(fetchPromises)
        .then(
            responseList => {
              return this.getResourceFromCache(dateRange).then(
                  rawResults => this.formatRawResults(
                      [].concat(rawResults, todaysResults)));
            },
            rejection => {
              this.dataCache = originalDataCacheCopy;
              throw rejection;
            });
  }

  /**
   * Gets data from the cache for the given date range.
   * @param dateRange date range to get data for
   */
  private getResourceFromCache(dateRange: Interval): Promise<R[]> {
    // split the dateRange by day intervals and get data from the Cache.
    const allRawResults = new Array<R>();
    dateRange.splitBy({days: 1}).forEach(dayRange => {
      allRawResults.push(...this.dataCache.get(dayRange.start.toISODate()));
    });
    return Promise.resolve(allRawResults);
  }

  /**
   * Formats raw results from the cache to results expected by the rendering
   * code.
   *
   * Note: This should really be a private method and never called by anything
   * except for getResourceSet. Since it is abstract though, we cannot make it
   * private.
   *
   * @param rawResults raw results from the cache that should be formatted.
   */
  abstract formatRawResults(rawResults: R[]): Promise<T[]>;

  /**
   * This function should make the FHIR calls to get promises for the
   * resources corresponding to this resource code group.
   */
  abstract getResourceFromFhir(dateRange: Interval): Promise<R[]>;
}
