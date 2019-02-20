// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Interval} from 'luxon';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {ResourceCode} from './clinicalconcepts/resource-code-group';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {Observation} from './fhir-data-classes/observation';
import {FhirService} from './fhir.service';

@Injectable()
export class MockFhirService extends FhirService {
  errorMessage: string;

  private readonly folderName = 'DemoMockData';
  private readonly assetPath = './assets/' + this.folderName;
  private readonly medicationAdministrationsPath =
      this.assetPath + '/MedicationAdministrationMockData.json';
  private readonly medicationOrderPath =
      this.assetPath + '/MedicationOrderMockData.json';
  private readonly observationPath =
      this.assetPath + '/ObservationMockData.json';
  private readonly encountersPath = this.assetPath + '/EncounterMockData.json';
  private readonly diagnosticReportsPath =
      this.assetPath + '/DiagnosticReportMockData.json';

  private loincMap: Promise<Map<LOINCCode, Observation[]>>;
  private medicationAdministrationMapByCode:
      Promise<Map<RxNormCode, MedicationAdministration[]>>;
  private medicationAdministrationMapByOrderId:
      Promise<Map<string, MedicationAdministration[]>>;
  private medicationOrderMap: Promise<Map<string, MedicationOrder[]>>;
  private diagnosticReportMap: Promise<Map<ResourceCode, DiagnosticReport[]>>;
  private encounters: Promise<Encounter[]>;

  private constructResourceMap<K, V>(
      resourcePath: string, constructorFn: (data: any) => V,
      getCodesFn: (value: V) => K[]): Promise<Map<K, V[]>> {
    return this.http.get(resourcePath).toPromise<any>().then(data => {
      const returnedMap = new Map<K, V[]>();
      for (const json of data) {
        try {
          const obj = constructorFn(json.resource);
          for (const code of getCodesFn(obj)) {
            let existing = returnedMap.get(code);
            if (!existing) {
              existing = [];
            }
            existing.push(obj);
            returnedMap.set(code, existing);
          }
        } catch (error) {
          console.info(error);
        }
      }
      return returnedMap;
    });
  }

  constructor(private http: HttpClient) {
    super();
    this.loincMap = this.constructResourceMap<LOINCCode, Observation>(
        this.observationPath, (data) => new Observation(data),
        (obs) => obs.codes);

    this.medicationAdministrationMapByCode =
        this.constructResourceMap<RxNormCode, MedicationAdministration>(
            this.medicationAdministrationsPath,
            (data) => new MedicationAdministration(data),
            (admin) => [admin.rxNormCode]);

    this.medicationAdministrationMapByOrderId =
        this.constructResourceMap<string, MedicationAdministration>(
            this.medicationAdministrationsPath,
            (data) => new MedicationAdministration(data),
            (admin) => [admin.medicationOrderId]);

    this.medicationOrderMap =
        this.constructResourceMap<string, MedicationOrder>(
            this.medicationOrderPath, (data) => new MedicationOrder(data),
            (order) => [order.orderId]);

    this.diagnosticReportMap =
        this.constructResourceMap<ResourceCode, DiagnosticReport>(
            this.diagnosticReportsPath, (data) => new DiagnosticReport(data),
            (report) =>
                report.results.map(x => x.codes)
                    .reduce((prev: ResourceCode[], curr: ResourceCode[]) => {
                      return prev.concat(curr);
                    }, []));

    this.encounters =
        this.http.get(this.encountersPath).toPromise<any>().then(data => {
          const allEncounters = [];
          for (const json of data) {
            try {
              const encounter = new Encounter(json.resource);
              allEncounters.push(encounter);
            } catch (error) {
              console.info(error);
            }
          }
          return allEncounters;
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
    return this.loincMap.then(
        map => this.getObservations(map, code, dateRange, limitCount));
  }

  private getObservations(
      map: Map<LOINCCode, Observation[]>, code: LOINCCode, dateRange: Interval,
      limitCount = 0) {
    return map.has(code) ? map.get(code)
                               .filter(obs => dateRange.contains(obs.timestamp))
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
    return this.medicationAdministrationMapByCode.then(
        adminMap => adminMap.has(code) ?
            adminMap.get(code)
                .filter(obs => dateRange.contains(obs.timestamp))
                .slice(0, limitCount ? limitCount : undefined) :
            []);
  }

  /**
   * Returns arbitrary orders for current mock medications.
   * @param id The id to pull the order from.
   * TODO(b/117438708): Add more mock medication orders to JSON files for
   * different medications requested.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return this.medicationOrderMap.then(map => map.get(id)[0]);
  }

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string):
      Promise<MedicationAdministration[]> {
    return this.medicationAdministrationMapByOrderId.then(map => map.get(id));
  }

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  getEncountersForPatient(dateRange: Interval): Promise<Encounter[]> {
    return this.encounters.then(
        encounters => encounters.filter(
            encounter => dateRange.intersection(encounter.period) !== null));
  }

  /**
   * Prints the current HTML of the graphs rendered to the console.
   * @param html The inner HTML to keep in the Document.
   * @param date The date the note was written for.
   */
  saveStaticNote(html: string, date: string) {
    console.log('Save to note button clicked for mock data for date: ' + date);
    console.log(html);
  }

  /**
   * Gets the DiagnosticReports for the patient for any report that falls in
   * the given date range, whose contained Observations are in the codeGroup
   * provided.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all DiagnosticReports that covered any time in
   *     this
   *   date range.
   */
  getDiagnosticReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
    return this.diagnosticReportMap.then(reportMap => {
      let reports = new Array<DiagnosticReport>();
      for (const code of codeGroup.resourceCodes) {
        if (reportMap.has(code)) {
          reports = reports.concat(reportMap.get(code));
        }
      }
      reports.filter(
          report => report.specimens.map(s => s.type)
                        .find(specimen => specimen === codeGroup.label) !==
              undefined);
      return reports;
    });
  }
}
