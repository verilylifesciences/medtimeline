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
import {ResourceCode} from './clinicalconcepts/resource-code-group';
import {documentReferenceLoinc} from './clinicalconcepts/resource-code-manager';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DebuggerService} from './debugger.service';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {LabeledClass} from './fhir-resource-set';
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
            smartApi.patient.api.fetchAll(queryParams)
                .then(
                    (results: any[]) =>
                        results
                            .map(result => {
                              return new Observation(result);
                            })
                            .filter(
                                result => result.status !==
                                    ObservationStatus.EnteredInError),
                    // Do not return any Observations for this code if one of
                    // the Observation constructions throws an error.
                    rejection => {
                      this.debugService.logError(rejection);
                      throw rejection;
                    }));
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If provided, the maximum number of observations to
   *     query for.
   */
  getMedicationAdministrationsWithCode(
      code: RxNormCode, dateRange: Interval,
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
            smartApi.patient.api.fetchAll(queryParams)
                .then(
                    (results: any[]) =>
                        results
                            .filter(
                                result =>
                                    LabeledClass.extractMedicationEncoding(
                                        result) === code)
                            .map(result => {
                              try {
                                return new MedicationAdministration(result);
                              } catch (e) {
                                this.debugService.logError(e);
                                throw e;
                              }
                            }),
                    // Do not return any MedicationAdministrations for
                    // this code if one of the MedicationAdministration
                    // constructions throws an error.
                    rejection => {
                      this.debugService.logError(rejection);
                      throw rejection;
                    }));
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
                      return new MedicationOrder(result.data);
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
            smartApi.patient.api.fetchAll(queryParams)
                .then(
                    (results: any[]) => {
                      return results
                          .filter(
                              result => LabeledClass.extractMedicationEncoding(
                                            result) === code)
                          .map(result => {
                            return new MedicationAdministration(result);
                          })
                          .filter(admin => admin.medicationOrderId === id);
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
        smartApi => smartApi.patient.api.fetchAll(queryParams)
                        .then(
                            (results: any[]) => {
                              results =
                                  results
                                      .map(result => {
                                        return new Encounter(result);
                                      })
                                      .filter(
                                          encounter =>
                                              dateRange.intersection(
                                                  encounter.period) !== null)
                                      .filter(
                                          encounter => encounter.period.start >=
                                              EARLIEST_ENCOUNTER_START_DATE);
                              return results;
                            },
                            rejection => {
                              this.debugService.logError(rejection);
                              throw rejection;
                            }));
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
                return this.parseMicrobioData(res, codeGroup);
              });
        },
        rejection => {
          this.debugService.logError(rejection);
          throw rejection;
        });
  }

  // Visible only for testing convenience.
  parseMicrobioData(json: any, codeGroup: BCHMicrobioCodeGroup) {
    const diagnosticReports: DiagnosticReport[] =
        json.entry.map(result => new DiagnosticReport(result.resource));

    const mapToUpdate = new Map<ResourceCode, DiagnosticReport[]>();
    // Get all unique codes for all DiagnosticReport results.
    for (const report of diagnosticReports) {
      const codes: ResourceCode[] =
          report.results.map(r => r.codes)
              .reduce((prev: ResourceCode[], curr: ResourceCode[]) => {
                return prev.concat(curr);
              }, []);
      const uniqueCodes: ResourceCode[] = Array.from(new Set(codes));
      for (const code of uniqueCodes) {
        let existing = mapToUpdate.get(code);
        if (!existing) {
          existing = [];
        }
        existing.push(report);
        mapToUpdate.set(code, existing);
      }
    }
    let reports = new Array<DiagnosticReport>();
    for (const code of codeGroup.resourceCodes) {
      if (mapToUpdate.has(code)) {
        reports = reports.concat(mapToUpdate.get(code));
      }
    }
    return reports;
  }
}
