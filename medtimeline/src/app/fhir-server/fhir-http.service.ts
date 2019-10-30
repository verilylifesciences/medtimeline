// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {Inject, Injectable} from '@angular/core';
import {DateTime, Interval} from 'luxon';

import {APP_TIMESPAN, EARLIEST_ENCOUNTER_START_DATE, FhirResourceType} from '../../constants';
import {BCHMicrobioCodeGroup} from '../clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCodeGroup} from '../clinicalconcepts/diagnostic-report-code';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {documentReferenceLoinc} from '../conceptmappings/resource-code-manager';
import {DebuggerService} from '../debugger.service';
import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnostic-report';
import {DiagnosticReport, DiagnosticReportStatus} from '../fhir-data-classes/diagnostic-report';
import {Encounter} from '../fhir-data-classes/encounter';
import {MedicationAdministration, MedicationAdministrationStatus} from '../fhir-data-classes/medication-administration';
import {MedicationOrder} from '../fhir-data-classes/medication-order';
import {MicrobioReport} from '../fhir-data-classes/microbio-report';
import {Observation, ObservationStatus} from '../fhir-data-classes/observation';
import {ResultClass} from '../fhir-resource-set';
import * as FhirConfig from '../fhir_config';

import {DiagnosticReportCache, EncounterCache, MedicationCache, ObservationCache} from './fhir-cache';
import {FhirService} from './fhir.service';
import {SMART_ON_FHIR_CLIENT} from './smart-on-fhir-client';

@Injectable()
export class FhirHttpService extends FhirService {
  readonly smartApiPromise: Promise<any>;

  /** Cache for all MedicationAdministrations. */
  protected static medicationCache = new MedicationCache();

  /** Cache for all DiagnosticReports. */
  protected static diagnosticReportCache = new DiagnosticReportCache();

  /**
   * Cache for all Observations. Map from LOINCCode to the ObservationCache
   * for that LOINCCode.
   */
  protected static observationCache = new Map<LOINCCode, ObservationCache>();

  /** Cache for all Encounters. */
  protected static encounterCache = new EncounterCache();

  constructor(
      private debugService: DebuggerService,
      @Inject(SMART_ON_FHIR_CLIENT) smartOnFhirClient: any,
      private http: HttpClient, resourceCodeCreator: ResourceCodeCreator) {
    super(resourceCodeCreator);
    // Create a promise which resolves to the smart API when the smart API is
    // ready. This allows clients of this service to call service methods
    // which depend on the API, regardless of whether the API is ready or not.
    this.smartApiPromise = new Promise(
        (resolve, reject) => smartOnFhirClient.oauth2.ready(
            smart => resolve(smart), err => reject(err)));
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  getObservationsWithCode(code: LOINCCode, dateRange: Interval):
      Promise<Observation[]> {
    let cacheForCode = FhirHttpService.observationCache.get(code);

    if (!cacheForCode) {
      cacheForCode = new ObservationCache(code);
      FhirHttpService.observationCache.set(code, cacheForCode);
    }
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(([smartApi, _]) => {
          return cacheForCode.getResource(smartApi, dateRange)
              .then((results: Observation[]) => {
                return results.filter(
                    result =>
                        result.status !== ObservationStatus.EnteredInError);
              });
        });
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
    const queryParams = new ObservationCache(code).getQueryParams(dateRange);
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(
            ([smartApi, codes]) =>
                smartApi.patient.api.search(queryParams)
                    .then(response => !!response.data.entry));
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
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(([smartApi, _]) => {
          return FhirHttpService.medicationCache
              .getResource(smartApi, dateRange)
              .then(
                  (results: MedicationAdministration[]) => results.filter(
                      result => codes.includes(result.rxNormCode) &&
                          result.status !==
                              MedicationAdministrationStatus.ENTERED_IN_ERROR));
        });
  }

  /**
   * Determines whether their is a medication present with the given code
   * during the given date range
   * @param code The RxNormCode to get medications for
   * @param dateRange The date range to get medications for
   */
  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    return this.getMedicationAdministrationsWithCodes([code], dateRange)
        .then(medAdmins => {
          return medAdmins.length > 0 ? true : false;
        });
  }

  /**
   * Gets order for specified external id.
   * @param id The id to pull the order from.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(
            ([smartApi, codes]) =>
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
    if (!dateRange) {
      dateRange = APP_TIMESPAN;
    }
    // The Cerner implementation of the Encounter search does not offer any
    // filtering by date at this point, so we grab all the encounters
    // then filter them down to those which intersect with the date range
    // we query, and those that have a start date no earlier than a year
    // prior to now.
    return this.smartApiPromise.then(smartApi => {
      return FhirHttpService.encounterCache.getResource(smartApi).then(
          (results: Encounter[]) =>
              results
                  .filter(
                      (result: Encounter) =>
                          dateRange.intersection(result.period) !== null)
                  .filter(
                      (result: Encounter) => result.period.start >=
                          EARLIEST_ENCOUNTER_START_DATE));
    });
  }

  /**
   * Saves the current image of the graphs rendered as a DocumentReference
   * (static save).
   * @param html The inner HTML to keep in the Document.
   * @param date The date the note was written on.
   */
  saveStaticNote(image: HTMLCanvasElement, date: string): Promise<boolean> {
    return Promise.all([this.smartApiPromise, this.loadAllCodes]).then(([
                                                                         smartApi,
                                                                         codes
                                                                       ]) => {
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
      console.debug(
          'No microbiology parameters available in the configuration.');
      return Promise.resolve([]);
    }
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(
            ([smartApi, codes]) => {
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
      codeGroup: DiagnosticReportCodeGroup,
      dateRange: Interval): Promise<AnnotatedDiagnosticReport[]> {
    const codes = codeGroup.resourceCodes;
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(([smartApi, _]) => {
          return FhirHttpService.diagnosticReportCache
              .getResource(smartApi, dateRange)
              .then((results: DiagnosticReport[]) => {
                const annotatedReportsArr =
                    results
                        .filter((result: DiagnosticReport) => {
                          return codes.includes(result.code) &&
                              result.status !==
                              DiagnosticReportStatus.EnteredInError;
                        })
                        .map(report => this.addAttachment(report));
                return Promise.all(annotatedReportsArr);
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
    return Promise.all([this.smartApiPromise, this.loadAllCodes])
        .then(([smartApi, codes]) => {
          const httpHeaders = new HttpHeaders({
            'Accept': 'text/html',
            'Authorization': 'Bearer ' + smartApi.tokenResponse.access_token
          });
          return this.http
              .get(url, {headers: httpHeaders, responseType: 'text'})
              .toPromise()
              .then((res: any) => res)
              .catch(err => err.message);
        });
  }
}
