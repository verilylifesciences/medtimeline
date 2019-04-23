// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {DateTime, Interval} from 'luxon';
import {FhirResourceType} from 'src/constants';

import {environment} from '../environments/environment';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {ResourceCode} from './clinicalconcepts/resource-code-group';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation, ObservationStatus} from './fhir-data-classes/observation';
import {FhirService} from './fhir.service';

@Injectable()
export class MockFhirService extends FhirService {
  private readonly assetPath = './assets/' + environment.mockDataFolder + '/';
  private readonly allFilePaths =
      environment.mockDataFiles.map(x => this.assetPath + x + '.json');

  private readonly loincMap = new Map<LOINCCode, Observation[]>();
  private readonly medicationAdministrationMapByCode =
      new Map<RxNormCode, MedicationAdministration[]>();
  private readonly medicationAdministrationMapByOrderId =
      new Map<string, MedicationAdministration[]>();
  private readonly medicationOrderMap = new Map<string, MedicationOrder[]>();
  private readonly diagnosticReportMap =
      new Map<ResourceCode, DiagnosticReport[]>();
  private readonly encounters = new Array<Encounter>();
  private readonly allDataPromise: Promise<void[]>;

  private constructResourceMap<K, V>(
      json: any, mapToUpdate: Map<K, V[]>, constructorFn: (any) => V,
      getCodesFn: (value: V) => K[]) {
    try {
      const obj = constructorFn(json.resource);
      const uniqueCodes = Array.from(new Set(getCodesFn(obj)));
      for (const code of uniqueCodes) {
        let existing = mapToUpdate.get(code);
        if (!existing) {
          existing = [];
        }
        existing.push(obj);
        mapToUpdate.set(code, existing);
      }
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.debug(err);
    }
  }

  private mapAllData(): Promise<void[]> {
    return Promise.all(this.allFilePaths.map(filePath => {
      return this.http.get(filePath).toPromise<any>().then(data => {
        try {
          let entry = data.entry;
          // Sometimes data comes to us in bundles, and then we want to flatten
          // it into a series of resources.
          if (data.length > 0) {
            entry = data.map(bundle => bundle.entry).flat();
          }
          for (const json of entry) {
            const resourceType = json.resource.resourceType;
            if (resourceType === FhirResourceType.Observation) {
              this.constructResourceMap(
                  json, this.loincMap, (x: any) => new Observation(x),
                  (obs) => obs.codes);
            }

            if (resourceType === FhirResourceType.MedicationAdministration) {
              this.constructResourceMap(
                  json, this.medicationAdministrationMapByCode,
                  (d) => new MedicationAdministration(d),
                  (admin) => [admin.rxNormCode]);

              this.constructResourceMap(
                  json, this.medicationAdministrationMapByOrderId,
                  (d) => new MedicationAdministration(d),
                  (admin) => [admin.medicationOrderId]);
            }

            if (resourceType === FhirResourceType.MedicationOrder) {
              this.constructResourceMap(
                  json, this.medicationOrderMap, (d) => new MedicationOrder(d),
                  (order) => [order.orderId]);
            }

            if (resourceType === FhirResourceType.Encounter) {
              const encounter = new Encounter(json.resource);
              this.encounters.push(encounter);
            }

            if (resourceType === FhirResourceType.DiagnosticReport) {
              this.constructResourceMap(
                  json, this.diagnosticReportMap,
                  (d) => new DiagnosticReport(d),
                  (report) =>
                      report.results.map(x => x.codes)
                          .reduce(
                              (prev: ResourceCode[], curr: ResourceCode[]) => {
                                return prev.concat(curr);
                              },
                              []));
            }
          }
        } catch {
          console.warn(
              'Trouble reading file: ' + filePath +
              '. Continuing on since this is the mock server.');
        }
      });
    }));
  }

  constructor(private http: HttpClient) {
    super();
    this.allDataPromise = this.mapAllData();
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
    return this.allDataPromise.then(
        map =>
            this.getObservations(this.loincMap, code, dateRange, limitCount));
  }

  private getObservations(
      map: Map<LOINCCode, Observation[]>, code: LOINCCode, dateRange: Interval,
      limitCount = 0) {
    return map.has(code) ?
        map.get(code)
            .filter(obs => dateRange.contains(obs.timestamp))
            .filter(obs => obs.status !== ObservationStatus.EnteredInError)
            .slice(0, limitCount ? limitCount : undefined) :
        [];
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount Unused in this implementation, as this is just a
   *     time-saving feature for HTTP calls.
   */
  getMedicationAdministrationsWithCode(
      code: RxNormCode, dateRange: Interval,
      limitCount?: number): Promise<MedicationAdministration[]> {
    return this.allDataPromise.then(
        x => {return this.medicationAdministrationMapByCode.has(code) ?
                  this.medicationAdministrationMapByCode.get(code)
                      .filter(obs => dateRange.contains(obs.timestamp))
                      .slice(0, limitCount ? limitCount : undefined) :
                  []});
  }

  /**
   * Returns arbitrary orders for current mock medications.
   * @param id The id to pull the order from.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return this.allDataPromise.then(
        x => this.medicationOrderMap.has(id) ?
            this.medicationOrderMap.get(id)[0] :
            undefined);
  }

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string, code: RxNormCode):
      Promise<MedicationAdministration[]> {
    return this.allDataPromise.then(
        x => this.medicationAdministrationMapByOrderId.get(id));
  }

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  getEncountersForPatient(dateRange: Interval): Promise<Encounter[]> {
    return this.allDataPromise.then(
        x => this.encounters.filter(
            encounter => dateRange.intersection(encounter.period) !== null &&
                encounter.period.start >= DateTime.utc().minus({years: 1})));
  }

  /**
   * Prints the current HTML of the graphs rendered to the console.
   * @param html The inner HTML to keep in the Document.
   * @param date The date the note was written for.
   */
  saveStaticNote(image: HTMLCanvasElement, date: string): Promise<boolean> {
    console.log('Save to note button clicked for mock data for date: ' + date);
    console.log(image);
    return Promise.resolve(true);
  }

  /**
   * Gets the DiagnosticReports for the patient for any report that falls in
   * the given date range, whose contained Observations are in the codeGroup
   * provided.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all DiagnosticReports that covered any time in
   *     this date range.
   */
  getDiagnosticReports(
      codeGroup: BCHMicrobioCodeGroup, dateRange: Interval,
      limitCount?: number): Promise<DiagnosticReport[]> {
    return this.allDataPromise.then(x => {
      let reports = new Array<DiagnosticReport>();
      for (const code of codeGroup.resourceCodes) {
        if (this.diagnosticReportMap.has(code)) {
          reports = reports.concat(this.diagnosticReportMap.get(code));
        }
      }
      reports
          .filter(
              report => report.specimens.map(s => s.type)
                            .find(specimen => specimen === codeGroup.label) !==
                  undefined)
          .slice(0, limitCount ? limitCount : undefined);
      return reports;
    });
  }
}
