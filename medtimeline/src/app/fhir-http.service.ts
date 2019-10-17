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
import {DiagnosticReportCodeGroup} from './clinicalconcepts/diagnostic-report-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {documentReferenceLoinc} from './clinicalconcepts/resource-code-manager';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DebuggerService} from './debugger.service';
import {AnnotatedDiagnosticReport} from './fhir-data-classes/annotated-diagnostic-report';
import {DiagnosticReport, DiagnosticReportStatus} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {MicrobioReport} from './fhir-data-classes/microbio-report';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {ResultClass} from './fhir-resource-set';
import {FhirService} from './fhir.service';
import * as FhirConfig from './fhir_config';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';

const GREATER_OR_EQUAL = 'ge';
const LESS_OR_EQUAL = 'le';
const LESS_THAN = 'lt';

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
                    return results.filter(result => !!result);
                  });
            },
            rejection => {
              this.debugService.logError(rejection);
              throw rejection;
            });
  }

  private getObservationsSearchParams(code: LOINCCode, dateRange: Interval) {
    // Cerner says that asking for a limited count of resources can slow down
    // queries, so we don't restrict a count limit here.
    // https://groups.google.com/d/msg/cerner-fhir-developers/LMTgGypmLDg/7f6hDoe2BgAJ
    return {
      type: FhirResourceType.Observation,
      query: {
        code: LOINCCode.CODING_STRING + '|' + code.codeString,
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            LESS_OR_EQUAL + dateRange.end.toISODate()
          ]
        },
      }
    };
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  getObservationsWithCode(code: LOINCCode, dateRange: Interval):
      Promise<Observation[]> {
    const queryParams = this.getObservationsSearchParams(code, dateRange);
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
   * Checks if there are any observations with the given LOINC Code within the
   * given date range.
   *
   * Note: Only fetches single page of results from FHIR server to enhance
   * performance.
   *
   * @param code LOINC code to check if there are any observations for
   * @param dateRange the time interval the observations should fall between
   */
  observationsPresentWithCode(code: LOINCCode, dateRange: Interval):
      Promise<boolean> {
    const queryParams = this.getObservationsSearchParams(code, dateRange);
    return this.smartApiPromise.then(
        smartApi => smartApi.patient.api.search(queryParams)
                        .then(response => !!response.data.entry));
  }

  /**
   * Formats query parameters for searching for Medication Administrations.
   * @param dateRange Date range to search within
   */
  private getMedicationAdministrationSearchParams(dateRange: Interval) {
    return {
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
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  getMedicationAdministrationsWithCodes(
      codes: RxNormCode[], dateRange: Interval,
      limitCount?: number): Promise<MedicationAdministration[]> {
    const queryParams = this.getMedicationAdministrationSearchParams(dateRange);

    if (limitCount) {
      queryParams.query['_count'] = limitCount;
    }

    return this.smartApiPromise.then(
        smartApi => this.fetchAll(smartApi, queryParams, (json, requestId) => {
          if (codes.includes(ResultClass.extractMedicationEncoding(json))) {
            return new MedicationAdministration(json, requestId);
          }
        }));
  }

  /**
   * Determines whether a medication with the given RxNormCode exists.
   *
   * Checks a single response page and only calls the next page if no
   * medications with the given code exist. Cerner's implementation of FHIR
   * does not support searching by RxNormCode, so we need to get all of the
   * medications and filter the response.
   *
   * @param smartApi The resolved smartOnFhirClient which called the original
   *     "search"
   * @param response The response of the previous page
   * @param code The RxNormCode to search for
   */
  private checkMedicationsPresentNextPage(smartApi, response, code: RxNormCode):
      Promise<boolean> {
    const results = response.data.entry || [];
    const resultsWithCode = results.filter(
        result =>
            code === ResultClass.extractMedicationEncoding(result.resource));

    if (resultsWithCode.length > 0) {
      return Promise.resolve(true);
    } else {
      if (response.data.link.some((link) => link.relation === 'next')) {
        return smartApi.patient.api.nextPage({bundle: response.data})
            .then(nextResponse => {
              return this.checkMedicationsPresentNextPage(
                  smartApi, nextResponse, code);
            });
      } else {
        return Promise.resolve(false);
      }
    }
  }

  /**
   * Determines whether their is a medication present with the given code
   * during the given date range
   * @param code The RxNormCode to get medications for
   * @param dateRange The date range to get medications for
   */
  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    const queryParams = this.getMedicationAdministrationSearchParams(dateRange);
    return this.smartApiPromise.then(smartApi => {
      return smartApi.patient.api.search(queryParams)
          .then(
              response => this.checkMedicationsPresentNextPage(
                  smartApi, response, code));
    });
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
   * Gets the MicrobioReports for the patient for any report that falls in
   * the given date range.
   * @param codeGroup The CodeGroup to retrieve MicrobioReports for.
   * @param dateRange Return all MicrobioReports that covered any time in this
   *   date range.
   */
  getMicrobioReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<MicrobioReport[]> {
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
                return MicrobioReport.parseAndFilterMicrobioData(
                    res, codeGroup);
              });
        },
        rejection => {
          this.debugService.logError(rejection);
          throw rejection;
        });
  }

  /**
   * Returns AnnotateDiagnosticReport from a specified date range with a
   * specific DiagnosticReportCodeGroup code.
   *
   * @param code The DiagnosticReportCodeGroup for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  getAnnotatedDiagnosticReports(
      code: DiagnosticReportCodeGroup,
      dateRange: Interval): Promise<AnnotatedDiagnosticReport[]> {
    const queryParams = {
      type: FhirResourceType.DiagnosticReport,
      query: {
        date: {
          $and: [
            GREATER_OR_EQUAL + dateRange.start.toISODate(),
            // We are adding one millisecond to the end date because the specs
            // for DiagnosticReport requires it to be greater or equal and
            // strictly less than.
            LESS_THAN + dateRange.end.plus({millisecond: 1}).toISODate()
          ]
        },
      }
    };

    return this.smartApiPromise.then(smartApi => {
      return this
          .fetchAll(
              smartApi, queryParams,
              (json, requestId) => new DiagnosticReport(json, requestId))
          .then(
              (results: DiagnosticReport[]) => {
                const annotatedReportsArr =
                    results
                        .filter(
                            (result: DiagnosticReport) => result.status !==
                                DiagnosticReportStatus.EnteredInError)
                        .map(report => this.addAttachment(report));
                return Promise.all(annotatedReportsArr);
              },
              rejection => {
                this.debugService.logError(rejection);
                throw rejection;
              });
    });
  }

  /**
   * Helper function that makes the HTTP call to get the html attachment.
   * The responseType will always be text, and not the default json.
   * If any error exists, it will catch the http error and return the message
   * @param url Fhir link to location of data
   */
  getAttachment(url: string): Promise<string> {
    return this.smartApiPromise.then(smartApi => {
      const httpHeaders = new HttpHeaders({
        'Accept': 'text/html',
        'Authorization': 'Bearer ' + smartApi.tokenResponse.access_token
      });
      return this.http.get(url, {headers: httpHeaders, responseType: 'text'})
          .toPromise()
          .then((res: any) => res)
          .catch(err => err.message);
    });
  }
}
