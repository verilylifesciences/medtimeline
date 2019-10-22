// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {DateTime, Interval} from 'luxon';
import {FhirResourceType} from 'src/constants';
import {v4 as uuid} from 'uuid';

import {environment} from '../environments/environment';

import {BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCodeGroup} from './clinicalconcepts/diagnostic-report-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
import {ResourceCode} from './clinicalconcepts/resource-code-group';
import {RxNormCode} from './clinicalconcepts/rx-norm';
import {ResourceCodeCreator} from './conceptmappings/resource-code-creator';
import {ResourceCodeManager} from './conceptmappings/resource-code-manager';
import {AnnotatedDiagnosticReport} from './fhir-data-classes/annotated-diagnostic-report';
import {AnnotatedMicrobioReport} from './fhir-data-classes/annotated-microbio-report';
import {DiagnosticReport} from './fhir-data-classes/diagnostic-report';
import {Encounter} from './fhir-data-classes/encounter';
import {MedicationAdministration} from './fhir-data-classes/medication-administration';
import {MedicationOrder} from './fhir-data-classes/medication-order';
import {MicrobioReport} from './fhir-data-classes/microbio-report';
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
  private microbioJson: JSON;

  constructor(
      private http: HttpClient, resourceCodeManager: ResourceCodeManager,
      resourceCodeCreator: ResourceCodeCreator) {
    super(resourceCodeManager, resourceCodeCreator);
    this.allDataPromise = this.mapAllData();
  }

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
        if (filePath.includes('_MB_data')) {
          this.microbioJson = data;
        }
        try {
          let entry = data.entry;
          // Sometimes data comes to us in bundles, and then we want to flatten
          // it into a series of resources.
          if (data.length > 0) {
            entry = data.map(bundle => bundle.entry).flat();
          }
          for (const json of entry) {
            const mockRequestId = uuid();
            const resourceType = json.resource.resourceType;
            if (resourceType === FhirResourceType.Observation) {
              this.constructResourceMap(
                  json, this.loincMap,
                  (x: any) => new Observation(x, mockRequestId),
                  (obs) => obs.codes);
            }

            if (resourceType === FhirResourceType.MedicationAdministration) {
              this.constructResourceMap(
                  json, this.medicationAdministrationMapByCode,
                  (d) => new MedicationAdministration(d, mockRequestId),
                  (admin) => [admin.rxNormCode]);

              this.constructResourceMap(
                  json, this.medicationAdministrationMapByOrderId,
                  (d) => new MedicationAdministration(d, mockRequestId),
                  (admin) => [admin.medicationOrderId]);
            }

            if (resourceType === FhirResourceType.MedicationOrder) {
              this.constructResourceMap(
                  json, this.medicationOrderMap,
                  (d) => new MedicationOrder(d, mockRequestId),
                  (order) => [order.orderId]);
            }

            if (resourceType === FhirResourceType.Encounter) {
              const encounter = new Encounter(json.resource, mockRequestId);
              this.encounters.push(encounter);
            }

            // Not used for microbio data, but only for diagnosticReport data
            if (resourceType === FhirResourceType.DiagnosticReport) {
              this.constructResourceMap(
                  json, this.diagnosticReportMap,
                  (d) => new DiagnosticReport(d, mockRequestId),
                  (report) => [report.code]);
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

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount If set, the number of observations that should be
   *     queried for
   */
  getObservationsWithCode(
      code: LOINCCode,
      dateRange: Interval,
      ): Promise<Observation[]> {
    return this.allDataPromise.then(
        map => this.getObservations(this.loincMap, code, dateRange));
  }

  private getObservations(
      map: Map<LOINCCode, Observation[]>, code: LOINCCode,
      dateRange: Interval) {
    return map.has(code) ?
        map.get(code)
            .filter(obs => dateRange.contains(obs.timestamp))
            .filter(obs => obs.status !== ObservationStatus.EnteredInError) :
        [];
  }

  observationsPresentWithCode(code: LOINCCode, dateRange: Interval):
      Promise<boolean> {
    return this.getObservationsWithCode(code, dateRange)
        .then(results => results.length > 0);
  }

  /**
   * Gets medication data from a specified date range with a specific Rx code
   * @param code The RxNormCode codes for which to get observations.
   * @param dateRange The time interval observations should fall between.
   */
  getMedicationAdministrationsWithCodes(
      codes: RxNormCode[],
      dateRange: Interval): Promise<MedicationAdministration[]> {
    return this.allDataPromise.then(x => {
      const allMedAdmins = new Array<MedicationAdministration>();
      this.medicationAdministrationMapByCode.forEach((medAdmins, code) => {
        if (codes.includes(code)) {
          allMedAdmins.push(...medAdmins.filter(
              medAdmin => dateRange.contains(medAdmin.timestamp)));
        }
      });
      return Promise.resolve(allMedAdmins);
    });
  }

  medicationsPresentWithCode(code: RxNormCode, dateRange: Interval):
      Promise<boolean> {
    return this.getMedicationAdministrationsWithCodes([code], dateRange)
        .then(obs => obs.length > 0, rejection => {
          // If any MedicationAdministration for this code results in an error,
          // do not show any MedicationAdministrations at all.
          throw rejection;
        });
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
   * Gets the MicrobioReports for the patient for any report that falls in
   * the given date range, whose contained Observations are in the codeGroup
   * provided.
   * @param codeGroup The CodeGroup to retrieve MicrobioReports for.
   * @param dateRange Return all MicrobioReports that covered any time in
   *     this date range.
   */
  getMicrobioReports(
      codeGroup: BCHMicrobioCodeGroup, dateRange: Interval,
      limitCount?: number): Promise<MicrobioReport[]> {
    return this.allDataPromise.then(x => {
      const microbioReports =
          MicrobioReport
              .parseAndFilterMicrobioData(this.microbioJson, codeGroup)
              .filter(
                  report => dateRange.contains(
                      new AnnotatedMicrobioReport(report).timestamp));
      return microbioReports.slice(0, limitCount ? limitCount : undefined);
    });
  }

  /**
   * Gets the AnnotatedDiagnosticReports for the patient for any report that
   * falls in the given date range, whose contained Observations are in the
   * codeGroup provided. Gets the html attachments linked in the json files as
   * well.
   *
   * We are returning AnnotatedDiagnosticReport rather than DiagnosticReport
   * because we need to access the html attachments.
   * @param codeGroup The CodeGroup to retrieve DiagnosticReports for.
   * @param dateRange Return all AnnotatedDiagnosticReports that covered any
   *     time in this date range.
   */
  getAnnotatedDiagnosticReports(
      codeGroup: DiagnosticReportCodeGroup, dateRange: Interval,
      limitCount?: number): Promise<AnnotatedDiagnosticReport[]> {
    return this.allDataPromise.then(x => {
      const annotatedReportsArr =
          new Array<Promise<AnnotatedDiagnosticReport>>();
      for (const code of codeGroup.resourceCodes) {
        if (this.diagnosticReportMap.has(code)) {
          const reports = this.diagnosticReportMap.get(code);
          for (const report of reports) {
            annotatedReportsArr.push(this.addAttachment(report));
          }
        }
      }
      return Promise.all(annotatedReportsArr).then(annotatedReports => {
        annotatedReports = annotatedReports.filter(
            report => dateRange.contains(report.timestamp));
        return annotatedReports.slice(0, limitCount ? limitCount : undefined);
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
    return this.http.get(url, {responseType: 'text'})
        .toPromise()
        .then((res: any) => res)
        .catch((err => err.message));
  }
}
