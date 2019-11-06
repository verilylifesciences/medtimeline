import {DateTime, Interval} from 'luxon';

import {APP_TIMESPAN, FhirResourceType} from '../../constants';
import {LOINCCode} from '../conceptmappings/resource-codes/loinc-code';
import {DiagnosticReport} from '../fhir-resources/diagnostic-report';
import {Encounter} from '../fhir-resources/encounter';
import {MedicationAdministration} from '../fhir-resources/medication-administration';
import {Observation} from '../fhir-resources/observation';
import {RawResource, ResultClass, ResultClassWithTimestamp} from '../fhir-resources/sets/fhir-resource-set';

const GREATER_OR_EQUAL = 'ge';
const LESS_OR_EQUAL = 'le';
const LESS_THAN = 'lt';

/**
 * Gets the next page of search results from the smart API. This function
 * assumes that the same smartApi was used to call the original search.
 *
 * @param smartApi The resolved smartOnFhirClient
 * @param response The response from the previous page of search results
 * @param results The list of all formatted results processed in previous page
 *     responses
 */
function getNextSearchResultsPage(
    smartApi,
    response,
    results,
    ): Promise<RawResource[]> {
  const requestId = response.headers('x-request-id');
  const responseData = response.data.entry || [];

  results = results.concat(
      responseData.map(result => new RawResource(result.resource, requestId)));

  // if there are anymore pages, get the next set of results.
  if (response.data.link.some((linkItem) => linkItem.relation === 'next')) {
    return smartApi.patient.api.nextPage({bundle: response.data})
        .then(
            nextResponse => {
              return getNextSearchResultsPage(smartApi, nextResponse, results);
            },
            rejection => {
              throw rejection;
            });
  }
  return Promise.resolve(results);
}

/**
 * Gets all pages of search results for the given query params. Formats
 * the results into RawResource objects.
 *
 * @param smartApi The resolved smartOnFhirClient
 * @param queryParams the params to pass to the search function
 */
function fetchAllFromFhir(smartApi, queryParams): Promise<RawResource[]> {
  const results = [];
  return smartApi.patient.api.search(queryParams)
      .then(
          response => {
            return getNextSearchResultsPage(smartApi, response, results)
                .then(res => {
                  return res.filter(result => !!result);
                });
          },
          rejection => {
            throw rejection;
          });
}

/**
 * Abstract Class for Fetching and Caching FHIR Resources.
 */
export abstract class FhirCache<T extends ResultClassWithTimestamp> {
  /**
   * Cache of Raw Resources.
   * A mapping from the timestamp as a date string to a list of RawResources
   * that have that timestamp.
   * We store the date string so that we can test whether the map has a
   * date easily because Datetime equality is not straightforward.
   * We store RawResources instead of the actual resources
   * (MedicationAdministration, Observation, etc) because we want
   * to cache all results, even if one of the resources does not pass the
   * validation done during construction. This way, we do not need to fetch
   * the invalid resource again for the same date range.
   */
  protected cache = new Map<string, RawResource[]>();

  /**
   * List of RawResources that have a timestamp today. We do not want to
   * cache today's results because we will want to refresh them the next time
   * we fetch the resource in order to get any new results.
   */
  private todaysResults: RawResource[];

  /**
   * The time that today's results were last fetched from FHIR. This helps us
   * not fetch today's results more frequently than necessary if results are
   * fetched multiple times during page loading.
   */
  private timeOfLastRefreshOfTodaysResults: DateTime;

  /**
   * A function that takes a RawResource object and converts it to the
   * Resource object to be returned.
   *
   * @param result: the RawResource to convert
   * @returns an instance of a Resource that extends ResultClassWithTimestamp
   */
  protected abstract createFunction(result: RawResource): T;

  /**
   * A function that takes a date range and returns the search query params
   *
   * @param dateRange: the dateRange to fetch from FHIR
   * @returns the JSON query params to search with.
   */
  protected abstract getQueryParams(dateRange: Interval);

  /**
   * A function to get the timestamp from the RawResource. The resulting
   * timestamp will be the cache key for this result.
   *
   * @param result the RawResource object to get the timestamp from
   * @returns the DateTime object representing the time the result happened at
   */
  protected abstract getTimestampFromRawResource(result: RawResource): DateTime;

  /**
   * Splits an Interval date range by day.
   *
   * @param dateRange: the Interval to split into days
   * @returns an array of intervals (each 1 day long) corresponding to the days
   *    in the given date range.
   */
  private splitDateRangeByDay(dateRange: Interval): Interval[] {
    return Interval
        .fromDateTimes(
            dateRange.start.startOf('day'), dateRange.end.endOf('day'))
        .splitBy({days: 1});
  }

  /**
   * Fetches the resources from FHIR for the given date range and updates
   * the cache with these results.
   *
   * The results are stored as RawResources
   * so that a validation error during object creation does not prevent the
   * cache from being updated.
   *
   * @param smartApi: the resolved Smart on FHIR API Client instance
   * @param dateRange: the date range to fetch from FHIR
   */
  fetchResourceAndAddToCache(smartApi, dateRange: Interval): Promise<void> {
    const queryParams = this.getQueryParams(dateRange);
    // fetches the results from FHIR and groups them by timestamp.
    const fetchAllPromise =
        fetchAllFromFhir(smartApi, queryParams).then((results: []) => {
          const resultMap = new Map<string, RawResource[]>();
          for (const result of results) {
            const resultDate =
                this.getTimestampFromRawResource(result).toISODate();
            if (!resultMap.has(resultDate)) {
              resultMap.set(resultDate, new Array());
            }
            resultMap.get(resultDate).push(result);
          }
          return resultMap;
        });

    // after the data fetch resolves, updates the cache for each day that was
    // fetched with the results that were found. If no results were found for
    // a given day, we set to an empty list.
    return Promise.resolve(fetchAllPromise).then(resultMap => {
      const currentTime = DateTime.utc();
      for (const day of this.splitDateRangeByDay(dateRange)) {
        const dayAsString = day.start.toISODate();
        if (dayAsString === currentTime.toISODate()) {
          this.todaysResults = resultMap.get(dayAsString) || [];
          this.timeOfLastRefreshOfTodaysResults = currentTime;
        } else {
          this.cache.set(dayAsString, resultMap.get(dayAsString) || []);
        }
      }
    });
  }

  /** Gets the RawResources from the Cache for each day in the date range. */
  private getResourceFromCache(dateRange: Interval): RawResource[] {
    const results = new Array<RawResource>();
    for (const day of this.splitDateRangeByDay(dateRange)) {
      const dayString = day.start.toISODate();
      if (dayString === DateTime.utc().toISODate()) {
        results.push(...this.todaysResults);
      } else {
        results.push(...this.cache.get(dayString));
      }
    }
    return results;
  }

  /**
   * Gets the resources for the given date range.
   *
   * If any days within the date range are not in the cache already, we fetch
   * the results for that range and add them to the cache.
   *
   * Then we return all instances of the Resource that are within the given
   * date range.
   *
   * @param dateRange: the Interval to fetch data within.
   * @returns an array of Resource objects that extend ResultClassWithTimestamp
   */
  getResource(smartApi, dateRange: Interval): Promise<T[]> {
    // splits the date range by day and checks if the cache contains that day.
    // Merges days not in the cache into a list of intervals that cover those
    // days.
    const rangesToFetch =
        Interval.merge(this.splitDateRangeByDay(dateRange).filter(day => {
          const currentTime = DateTime.utc();
          if (day.start.toISODate() === currentTime.toISODate()) {
            // we filter out today if we have refreshed today's results
            // within the last minute.
            return !(
                this.timeOfLastRefreshOfTodaysResults &&
                currentTime
                        .diff(this.timeOfLastRefreshOfTodaysResults, 'minutes')
                        .minutes < 1);
            // sometimes due to timezone handling we end up with a date that
            // is after today. We do not need to fetch that date.
          } else if (day.start.toMillis() > currentTime.toMillis()) {
            return false;
          }
          return !this.cache.has(day.start.toISODate());
        }));

    // for each date interval, fetch the resource from FHIR and add the data
    // to the cache.
    const fetchPromises = rangesToFetch.map(range => {
      return this.fetchResourceAndAddToCache(smartApi, range);
    });

    // after all date ranges have been fetched from FHIR and added to the
    // cache. Get all data from the cache for the full date range.
    return Promise.all(fetchPromises)
        .then(
            _ => {
              return this.getResourceFromCache(dateRange)
                  .map(result => this.createFunction(result))
                  .filter(result => !!result);
            },
            rejection => {
              throw rejection;
            });
  }
}

/** Cache for MedicationAdministrations */
export class MedicationCache extends FhirCache<MedicationAdministration> {
  /** Promise to load all results into the Cache within the App Timespan. */
  resultsLoaded: Promise<void>;

  getResource(smartApi, dateRange: Interval):
      Promise<MedicationAdministration[]> {
    // if we have not alraedy loaded all the results into the cache within the
    // App Timespan, add them first. This helps with loading time for subsequent
    // calls for medications.
    if (!this.resultsLoaded) {
      this.resultsLoaded =
          this.fetchResourceAndAddToCache(smartApi, APP_TIMESPAN);
    }
    return this.resultsLoaded.then(() => {
      return super.getResource(smartApi, dateRange);
    });
  }

  /**
   * Creates a MedicationAdministration from a RawResource.
   * Note: will return undefined if the Medication Encoding extracted from the
   * RawResource is undefined.
   */
  createFunction(result: RawResource): MedicationAdministration {
    // In the MedicationAdministration constructor we throw an Error if the
    // rxNormCode is undefined. It will be undefined if we do not have a mapping
    // for that rxNormCode. Because we are querying for all
    // MedicationAdministrations (not just a particular code), we need to filter
    // those results out before we try to create the MedicationAdministration
    // object.
    if (ResultClass.extractMedicationEncoding(result.json)) {
      return new MedicationAdministration(result.json, result.requestId);
    }
  }

  getQueryParams(dateRange: Interval) {
    return {
      type: FhirResourceType.MedicationAdministration,
      query: {
        effectivetime: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            LESS_OR_EQUAL + dateRange.end.toISODate()
          ]
        },
        notgiven: 'false',
        status: 'in-progress,completed,on-hold',
        // Despite documentation, this is the number of results per page,
        // not the total number of results.
        // https://groups.google.com/d/msg/cerner-fhir-developers/iW8hXIWcRX0/Y9mA__OqAQAJ
        _count: 200
      }
    };
  }

  getTimestampFromRawResource(result: RawResource): DateTime {
    return MedicationAdministration.getTimestamp(result.json);
  }
}

/** Cache for DiagnosticReports */
export class DiagnosticReportCache extends FhirCache<DiagnosticReport> {
  createFunction(result: RawResource): DiagnosticReport {
    return new DiagnosticReport(result.json, result.requestId);
  }

  getQueryParams(dateRange: Interval) {
    return {
      type: FhirResourceType.DiagnosticReport,
      query: {
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            // We are adding one millisecond to the end date because we want
            // less or equal to the date range, but the spec only allows
            // strictly less than param.
            LESS_THAN + dateRange.end.plus({millisecond: 1}).toISODate()
          ]
        }
      }
    };
  }

  getTimestampFromRawResource(result: RawResource) {
    return Observation.getTimestamp(result.json);
  }
}

/** Cache for Observations */
export class ObservationCache extends FhirCache<Observation> {
  /** The LOINCCode that the cached observations are associated with. */
  readonly code: LOINCCode;

  constructor(code: LOINCCode) {
    super();
    this.code = code;
  }

  createFunction(result: RawResource): Observation {
    return new Observation(result.json, result.requestId);
  }

  getQueryParams(dateRange: Interval) {
    return {
      type: FhirResourceType.Observation,
      query: {
        code: LOINCCode.CODING_STRING + '|' + this.code.codeString,
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            LESS_OR_EQUAL + dateRange.end.toISODate()
          ]
        }
      }
    };
  }

  getTimestampFromRawResource(result: RawResource) {
    return Observation.getTimestamp(result.json);
  }
}

/** Cache for Encounters. */
export class EncounterCache {
  /** List of cached RawResources representing raw Encounters. */
  private cache: RawResource[];

  /** The last time the cache was refreshed. */
  private lastFhirFetchTime: DateTime;

  /**
   * Gets all Encounters.
   * Note: Encounters cannot be searched by date, so this will return all
   * encounters.
   */
  getResource(smartApi): Promise<Encounter[]> {
    const currentTime = DateTime.utc();
    let cachePromise;
    // if the last fetch of Encounters from FHIR was within 1 minute, we don't
    // need to fetch them again. Since we may call this method multiple times
    // when loading the page, we want to ensure we aren't making unecessary
    // calls.
    if (this.lastFhirFetchTime &&
        currentTime.diff(this.lastFhirFetchTime, 'minutes').minutes < 1) {
      cachePromise = Promise.resolve(this.cache);
    } else {
      this.lastFhirFetchTime = currentTime;
      const queryParams = {
        type: FhirResourceType.Encounter,
      };
      cachePromise = fetchAllFromFhir(smartApi, queryParams).then(results => {
        this.cache = results;
        this.lastFhirFetchTime = currentTime;
        return results;
      });
    }
    return Promise.resolve(cachePromise)
        .then(
            results => {
              return results
                  .filter(result => {
                    const status = result.json.status;
                    return status !== 'cancelled' && status !== 'planned';
                  })
                  .map(result => new Encounter(result.json, result.requestId));
            },
            rejection => {
              throw rejection;
            });
  }
}
