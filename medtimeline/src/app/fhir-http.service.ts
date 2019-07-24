// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {APP_TIMESPAN, EARLIEST_ENCOUNTER_START_DATE, FhirResourceType} from '../constants';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {documentReferenceLoinc} from './clinicalconcepts/resource-code-manager';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DebuggerService} from './debugger.service';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {ResultClass} from './fhir-resource-set';
import {FhirService} from './fhir.service';
import * as FhirConfig from './fhir_config';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';

const GREATER_OR_EQUAL = 'ge';
const LESS_OR_EQUAL = 'le';

// The Cerner implementation has a maximum result return of 100 for
// observations.
const CERNER_MAX_OBS_RESULTS_RETURNED = 100;

@Injectable()
export class FhirHttpService extends FhirService {
  readonly smartApiPromise: Promise<any>;
  constructor(
      private debugService: DebuggerService,
      @Inject(SMART_ON_FHIR_CLIENT) smartOnFhirClient: any,
      private sanitizer: DomSanitizer, private http: HttpClient) {
    super();
    // Create a promise which resolves to the smart API when the smart API is
    // ready. This allows clients of this service to call service methods
    // which depend on the API, regardless of whether the API is ready or not.
    this.smartApiPromise = new Promise(
        (resolve, reject) => smartOnFhirClient.oauth2.ready(
            smart => resolve(smart), err => reject(err)));
  }

  /**
   * Gets the next page of search results from the smart API. This function
   * assumes that the same smartApi was used to call the original search.
   *
   * @param smartApi The resolved smartOnFhirClient
   * @param response The response from the previous page of search results
   * @param results The list of all formatted results processed in previous page
   *     responses
   * @param createFunction A function to create a result object from the
   *     response
   */
  getNextSearchResultsPage<T>(
      smartApi, response, results,
      createFunction: (json: any, requestId: string) => T): Promise<T[]> {
    const requestId = response.headers('x-request-id');
    const responseData = response.data.entry || [];

    results = results.concat(
        responseData.map(result => createFunction(result.resource, requestId)));

    // if there are anymore pages, get the next set of results.
    if (response.data.link.some((link) => link.relation === 'next')) {
      return smartApi.patient.api.nextPage({bundle: response.data})
          .then(nextResponse => {
            return this.getNextSearchResultsPage(
                smartApi, nextResponse, results, createFunction);
          });
    }
    return Promise.resolve(results);
  }

  /**
   * Gets all pages of search results for the given query params. Formats
   * the results using the given createFunction.
   *
   * @param smartApi The resolved smartOnFhirClient
   * @param queryParams the params to pass to the search function
   * @param createFunction A function to create result objects from
   *  the response data.
   */
  fetchAll<T>(
      smartApi, queryParams,
      createFunction: ((json: any, requestId: string) => T)): Promise<T[]> {
    const results = [];
    return smartApi.patient.api.search(queryParams)
        .then(
            response => {
              return this
                  .getNextSearchResultsPage(
                      smartApi, response, results, createFunction)
                  .then(results => {
                    return results;
                  });
            },
            rejection => {
              this.debugService.logError(rejection);
              throw rejection;
            });
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If set, the number of observations that should be
   *     queried for
   */
  getObservationsWithCode(
      code: LOINCCode, dateRange: Interval,
      limitCount?: number): Promise<Observation[]> {
    const queryParams = {
      type: FhirResourceType.Observation,
      query: {
        code: LOINCCode.CODING_STRING + '|' + code.codeString,
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            LESS_OR_EQUAL + dateRange.end.toISODate()
          ]
        },
        _count: limitCount ? limitCount : CERNER_MAX_OBS_RESULTS_RETURNED
      }
    };

    return this.smartApiPromise.then(
        smartApi =>
            this.fetchAll(
                    smartApi, queryParams,
                    (json, requestId) => new Observation(json, requestId))
                .then(
                    (results: Observation[]) => results.filter(
                        (result: Observation) => result.status !==
                            ObservationStatus.EnteredInError)));
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  getMedicationAdministrationsWithCode(
      code: RxNormCode, dateRange?: Interval,
      limitCount?: number): Promise<MedicationAdministration[]> {
    const queryParams = {
      type: FhirResourceType.MedicationAdministration,
      query: {
        effectivetime: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            LESS_OR_EQUAL + dateRange.end.toISODate()
          ]
        }
      }
    };

    if (limitCount) {
      queryParams.query['_count'] = limitCount;
    }

    return this.smartApiPromise.then(
        smartApi =>
            this.fetchAll(
                    smartApi, queryParams,
                    (json, requestId) => {
                      if (ResultClass.extractMedicationEncoding(json) ===
                          code) {
                        return new MedicationAdministration(json, requestId);
                      }
                    })
                .then(
                    (results: MedicationAdministration[]) =>
                        results.filter((result) => !!result)));
  }

  /**
   * Gets order for specified external id.
   * @param id The id to pull the order from.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return this.smartApiPromise.then(
        smartApi =>
            smartApi.patient.api
                .read({type: FhirResourceType.MedicationOrder, 'id': id})
                .then(
                    (result: any) => {
                      const requestId = result.headers('x-request-id');
                      return new MedicationOrder(result.data, requestId);
                    },
                    // Do not return any MedicationOrders for
                    // this code if one of the MedicationOrder
                    // constructions throws an error.
                    rejection => {
                      this.debugService.logError(rejection);
                      throw rejection;
                    }));
  }

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string, code: RxNormCode):
      Promise<MedicationAdministration[]> {
    const queryParams = {
      type: FhirResourceType.MedicationAdministration,
    };
    return this.smartApiPromise.then(
        smartApi =>
            this.fetchAll(
                    smartApi, queryParams,
                    (json, requestId) => {
                      if (ResultClass.extractMedicationEncoding(json) ===
                          code) {
                        return new MedicationAdministration(json, requestId);
                      }
                    })
                .then(
                    (results: MedicationAdministration[]) =>
                        results.filter((result) => !!result)
                            .filter(
                                (result: MedicationAdministration) =>
                                    result.medicationOrderId === id)));
  }

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  getEncountersForPatient(dateRange: Interval): Promise<Encounter[]> {
    const queryParams = {
      type: FhirResourceType.Encounter,
    };

    if (!dateRange) {
      dateRange = APP_TIMESPAN;
    }
    // The Cerner implementation of the Encounter search does not offer any
    // filtering by date at this point, so we grab all the encounters
    // then filter them down to those which intersect with the date range
    // we query, and those that have a start date no earlier than a year prior
    // to now.
    return this.smartApiPromise.then(
        smartApi =>
            this.fetchAll(
                    smartApi, queryParams,
                    (json, requestId) => new Encounter(json, requestId))
                .then(
                    (results: Encounter[]) =>
                        results
                            .filter(
                                (result: Encounter) =>
                                    dateRange.intersection(result.period) !==
                                    null)
                            .filter(
                                (result: Encounter) => result.period.start >=
                                    EARLIEST_ENCOUNTER_START_DATE)));
  }

  /**
   * Saves the current image of the graphs rendered as a DocumentReference
   * (static save).
   * @param html The inner HTML to keep in the Document.
   * @param date The date the note was written on.
   */
  saveStaticNote(image: HTMLCanvasElement, date: string): Promise<boolean> {
    return this.smartApiPromise.then(smartApi => {
      const postBody = {
        resourceType: FhirResourceType.DocumentReference,
        subject: {
          reference: [FhirResourceType.Patient, smartApi.patient.id].join('/')
        },
        type: {
          coding: [{
            system: LOINCCode.CODING_STRING,          // must be loinc
            code: documentReferenceLoinc.codeString,  // Summary Note
          }],
        },
        indexed: DateTime.utc().toISO(),
        status:
            'current',  // Required; only supported option is 'current'
                        // https://fhir.cerner.com/millennium/dstu2/infrastructure/document-reference/#body-fields
        content: [{
          attachment: {
            contentType: 'application/xhtml+xml;charset=utf-8',
            data: btoa('<img src="' + image.toDataURL() + '">')
          }
        }],
        context: {
          encounter: {
            reference: [
              FhirResourceType.Encounter, smartApi.tokenResponse.encounter
            ].join('/')
          }
        }
      };
      return smartApi.patient.api.create({resource: postBody})
          .then(
              resolve => {
                return true;
              },
              reject => {
                return false;
              });
    });
  }

  /**
   * Gets the DiagnosticReports for the patient for any report that falls in
   * the given date range.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all DiagnosticReports that covered any time in this
   *   date range.
   */
  getDiagnosticReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
    if (!FhirConfig.microbiology) {
      console.warn(
          'No microbiology parameters available in the configuration.');
      return Promise.resolve([]);
    }
    return this.smartApiPromise.then(
        smartApi => {
          // YYYY-MM-DD format for dates
          let callParams = new HttpParams();
          callParams = callParams.append('patient', smartApi.patient.id);
          callParams = callParams.append('category', 'microbiology'),
          callParams = callParams.append(
              'item-date', 'ge' + dateRange.start.toFormat('yyyy-MM-dd'));
          callParams = callParams.append(
              'item-date', 'le' + dateRange.end.toFormat('yyyy-MM-dd'));
          callParams = callParams.append('_format', 'json');

          const authString = btoa(
              FhirConfig.microbiology.username + ':' +
              FhirConfig.microbiology.password);
          const httpHeaders = new HttpHeaders({
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': 'Basic ' + authString,
          });

          return this.http
              .get(
                  [
                    FhirConfig.microbiology.url,
                    FhirResourceType.DiagnosticReport
                  ].join('/'),
                  {headers: httpHeaders, params: callParams})
              .toPromise()
              .then((res: any) => {
                return DiagnosticReport.parseAndFilterMicrobioData(
                    res, codeGroup);
              });
        },
        rejection => {
          this.debugService.logError(rejection);
          throw rejection;
        });
  }
}
