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
import {MicrobioReport} from './fhir-data-classes/microbio-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration, RawMedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {ResultClass} from './fhir-resource-set';
import {FhirService} from './fhir.service';
import * as FhirConfig from './fhir_config';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {DiagnosticReportCodeGroup} from './clinicalconcepts/diagnostic-report-code';

const GREATER_OR_EQUAL = 'ge';
const LESS_OR_EQUAL = 'le';

@Injectable()
export class FhirHttpService extends FhirService {
  /**
   * Cerner has not implemented searching for MedicationAdministrations by
   * medication code or by prescription (MedicationOrder) ID. In addition,
   * a MedicationOrder will not necessarily have a start time.
   * This means that to get all MedicationAdministrations for an order,
   * we will need to fetch all MedicationAdministrations for a patient.
   * Since this is slow, we will use the following 3 properties to help us
   * cache that information. They are currently not set as "private" so that
   * we can test them in unit tests.
   */

  /**
   * Visible for testing purposes only.
   *
   * Cache of all RawMedicationAdministrations for a patient.
   * It is a mapping of RxNormCodes to their corresponding
   * RawMedicationAdministration objects. Once defined, this will contain all
   * RawMedicationAdministrations for the patient. We store
   * RawMedicationAdministrations because no validation is done on
   * RawMedicationAdministration creation. This enables us to not throw errors
   * if we fetch invalid medications unless those medications are in the date
   * range we are trying to show.
   *
   * This will contain all medications for the patient up until the
   * lastMedicationRefreshTime.
   */
  medicationAdministrationsByCode:
      Map<RxNormCode, RawMedicationAdministration[]>;

  /**
   * Visible for testing purposes only.
   *
   * If a MedicationAdministration fetch from FHIR is in progress, we set this
   * variable to the Promise that when resolved will give all of the
   * RawMedicationAdministrations for the patient.
   * This enables us to asyncronously call for MedicationAdministrations
   * multiple times, but only fetch the MedicationAdministrations a single time.
   * It helps ensure that we do not fetch duplicate MedicationAdministrations.
   * After the promise has been resolved, it is set back to undefined.
   * If this is undefined, a medication refresh is not in progress.
   */
  medicationRefreshInProgress:
      Promise<Map<RxNormCode, RawMedicationAdministration[]>>;

  /**
   * Visible for testing purposes only.
   *
   * The time that the medicationRefreshInProgress Promise was resolved. This is
   * the time that MedicationAdministrations were most recently fetched from
   * FHIR.
   * If this is not defined, we have not previously fetched all
   * MedicationAdministrations for the patient from FHIR.
   */
  lastMedicationRefreshTime: DateTime;

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
   * Creates a RawMedicationAdministration object from the passed in json
   * and requestId if the json contains a mapped RxNormCode.
   *
   * @param json data used to create RawMedicationAdministration
   * @param requestId the FHIR request ID that obtained the json data.
   */
  private createRawMedicationAdministration(json: any, requestId: string):
      RawMedicationAdministration {
    if (ResultClass.extractMedicationEncoding(json)) {
      return new RawMedicationAdministration(json, requestId);
    }
  }

  /**
   * Fetches all FHIR MedicationAdministrations using the given query params.
   * Returns the created RawMedicationAdministrations grouped by RxNormCode.
   *
   * @param queryParams the search params to pass to the FHIR search request.
   */
  private fetchRawMedicationAdministrations(queryParams):
      Promise<Map<RxNormCode, RawMedicationAdministration[]>> {
    return this.smartApiPromise.then(
        smartApi =>
            this.fetchAll(
                    smartApi, queryParams,
                    this.createRawMedicationAdministration)
                .then((rawMedAdmins: RawMedicationAdministration[]) => {
                  // group RawMedicationAdministrations by RxNormCode
                  const medAdminsByCode =
                      new Map<RxNormCode, RawMedicationAdministration[]>();
                  for (const rawMedAdmin of rawMedAdmins) {
                    const medAdminCode = rawMedAdmin.rxNormCode;
                    if (!medAdminsByCode.has(medAdminCode)) {
                      medAdminsByCode.set(medAdminCode, new Array());
                    }
                    medAdminsByCode.get(medAdminCode).push(rawMedAdmin);
                  }
                  return medAdminsByCode;
                }));
  }

  /**
   * Fetches all FHIR MedicationAdministrations for the patient.
   *
   * Updates medicationAdministrationsByCode with the results and sets the
   * lastMedicationRefreshTime with the current time.
   *
   * @returns all RawMedicationAdministration objects for the patient grouped
   *   by RxNormCode.
   */
  private loadAllRawMedicationAdministrations():
      Promise<Map<RxNormCode, RawMedicationAdministration[]>> {
    const currentTime = DateTime.utc();
    const queryParams = {
      type: FhirResourceType.MedicationAdministration,
    };

    return this.fetchRawMedicationAdministrations(queryParams)
        .then(medAdminsByCode => {
          this.medicationAdministrationsByCode = medAdminsByCode;
          this.lastMedicationRefreshTime = currentTime;
          return medAdminsByCode;
        });
  }

  /**
   * Fetches FHIR MedicationAdministrations that have been created since the
   * lastMedicationRefreshTime.
   *
   * Updates medicationAdministrationsByCode with the results and sets the
   * lastMedicationRefreshTime with the current time.
   *
   * @returns all RawMedicationAdministration objects for the patient grouped
   *   by RxNormCode.
   */
  private incrementalRawMedicationAdministrationRefresh():
      Promise<Map<RxNormCode, RawMedicationAdministration[]>> {
    const currentTime = DateTime.utc();
    const dateRange =
        Interval.fromDateTimes(this.lastMedicationRefreshTime, currentTime);
    const queryParams = this.getMedicationAdministrationSearchParams(dateRange);
    return this.fetchRawMedicationAdministrations(queryParams)
        .then(medAdminsByCode => {
          // Add the returned medication administrations to the
          // medicationAdministrationsByCode mapping.
          medAdminsByCode.forEach((medAdmins, code) => {
            if (!this.medicationAdministrationsByCode.has(code)) {
              this.medicationAdministrationsByCode.set(code, new Array());
            }
            this.medicationAdministrationsByCode.get(code).push(...medAdmins);
          });
          this.lastMedicationRefreshTime = currentTime;
          return this.medicationAdministrationsByCode;
        });
  }

  /**
   * Gets all RawMedicationAdministrations for a patient grouped by RxNormCode.
   *
   * If any FHIR fetches are needed to refresh the medication administrations,
   * medicationRefreshInProgress is set to the fetch promise. As soon as the
   * promise is resolved, medicationRefreshInProgress is set back to undefined.
   * If there is another FHIR fetch in progress for medications, this function
   * will wait until that one is done, and then resolve those results.
   *
   * Because we cannot search for MedicationAdministrations by medication code
   * or order ID, we need to get all of the MedicationAdministrations from FHIR
   * and then filter them down. If we have already fetched all
   * MedicationAdministrations, this function will take advantage of the cached
   * data. If not, it will call to FHIR for all MedicationAdministrations and
   * cache them in medicationAdministrationsByCode. If all
   * MedicationAdministrations need to be fetched, then this will be a slow
   * call.
   *
   * @returns RawMedicationAdministrations for a patient grouped by RxNormCode.
   */
  getAllRawMedicationAdministrations():
      Promise<Map<RxNormCode, RawMedicationAdministration[]>> {
    const currentTime = DateTime.utc();
    // if there is already a medication refresh in progress, just use the
    // results of that refresh when it resolves. The original creation of
    // medicationRefreshInProgress promise will set the property back to
    // undefined, so we do not need to do so here.
    if (this.medicationRefreshInProgress) {
      return Promise.resolve(this.medicationRefreshInProgress);
    }

    // If medication administrations were last loaded within a minute, we do not
    // need to refresh again. This may happen if this method gets called
    // multiple times within a single request. An example of this is on
    // application setup, when we load all of the medications for the patient.
    // This does not require a FHIR call.
    // It should return immediately since data has already been cached.
    if (this.lastMedicationRefreshTime &&
        currentTime.diff(this.lastMedicationRefreshTime, 'minutes').minutes <
            1) {
      return Promise.resolve(this.medicationAdministrationsByCode);
    }

    // if there has been a previous refresh, then we only need to fetch
    // MedicationAdministrations that are new since the last refresh. This
    // is the case when you are looking to refresh today's medications.
    // Medications from previous days will not change, so they do not need to be
    // refreshed. The time of the previous refresh is stored in
    // this.lastMedicationRefreshTime
    if (this.lastMedicationRefreshTime) {
      this.medicationRefreshInProgress =
          this.incrementalRawMedicationAdministrationRefresh();

      // otherwise we need to do a full load of all the medications. This should
      // only happen once for a patient.
    } else {
      this.medicationRefreshInProgress =
          this.loadAllRawMedicationAdministrations();
    }
    // as soon as the refresh is done, we need to set the
    // medicationRefreshInProgress back to undefined so that if we request
    // another refresh of medications, we make a new FHIR call to get the most
    // recent data.
    return Promise.resolve(this.medicationRefreshInProgress)
        .then(
            results => {
              this.medicationRefreshInProgress = undefined;
              return results;
            },
            rejection => {
              this.medicationRefreshInProgress = undefined;
              throw rejection;
            });
  }

  /**
   * Gets MedicationAdministrations from a specified date range with specific
   * RxNormCodes.
   *
   * If the last medication refresh happened after the date range needed,
   * we will just format RawMedicationAdministrations to
   * MedicationAdministrations for that date range.
   *
   * Otherwise, we will refresh medicationAdministrationsByCode and then
   * do the formatting.
   *
   * @param codes The RxNormCodes for which to get MedicationAdministrations.
   * @param dateRange The time interval MedicationAdministrations should fall
   *     between.
   */
  getMedicationAdministrationsWithCodes(
      codes: RxNormCode[],
      dateRange: Interval): Promise<MedicationAdministration[]> {
    let medAdministrationPromise:
        Promise<Map<RxNormCode, RawMedicationAdministration[]>>;

    if (this.lastMedicationRefreshTime &&
        dateRange.start < this.lastMedicationRefreshTime &&
        dateRange.end < this.lastMedicationRefreshTime) {
      // if the date range is completely before the last medication refresh,
      // we do not need to get any additional medication data.
      medAdministrationPromise =
          Promise.resolve(this.medicationAdministrationsByCode);

      // otherwise, we need to refresh the medication administrations.
    } else {
      medAdministrationPromise = this.getAllRawMedicationAdministrations();
    }

    return Promise.resolve(medAdministrationPromise)
        .then(rawMedAdminsByCode => {
          // return all the MedicationAdmins with the codes that are within
          // the given date range.
          const medAdmins = new Array<MedicationAdministration>();
          for (const code of codes) {
            const rawMedAdminsForCode = rawMedAdminsByCode.get(code) || [];
            medAdmins.push(
                ...rawMedAdminsForCode
                    .filter(
                        rawMedAdmin =>
                            (dateRange.contains(rawMedAdmin.timestamp)))
                    .map(
                        rawMedAdmin =>
                            rawMedAdmin.convertToMedicationAdministration()));
          }
          return medAdmins;
        });
  }

  /**
   * Determines whether their is a medication present with the given code
   * during the given date range.
   *
   * This will refresh all medications for the patient.
   *
   * @param code The RxNormCode to get medications for
   * @param dateRange The date range to get medications for
   */
  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    return this.getMedicationAdministrationsWithCodes([code], dateRange)
        .then(medAdmins => {
          return medAdmins.length > 0;
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
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string, code: RxNormCode):
      Promise<MedicationAdministration[]> {
    return this.getAllRawMedicationAdministrations().then(adminsByCode => {
      return (adminsByCode.get(code) || [])
          .filter(rawMedAdmin => rawMedAdmin.medicationOrderId === id)
          .map(rawMedAdmin => rawMedAdmin.convertToMedicationAdministration());
    });
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
   * TODO: This is currently just a placeholder so we can test fhir-mock.
   * It does not return anything of value.
   *
   * Should get diagnosticReport from a specified date range with a specific
   * DiagnosticReportCodeGroup code.
   * @param code The DiagnosticReportCodeGroup for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  getDiagnosticReports(code: DiagnosticReportCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
        return Promise.resolve([]);
  }
}
