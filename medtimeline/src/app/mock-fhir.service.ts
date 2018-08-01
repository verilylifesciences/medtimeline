// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';
import {Interval} from 'luxon';

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from './clinicalconcepts/bch-microbio-code';
import {LOINCCode} from './clinicalconcepts/loinc-code';
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

  readonly rxnormCodeText = {
    '248656': 'Azithromycin',  // Code found online.
    '308182': 'Amoxicillin',
    '281': 'Acyclovir'  // Code found in Mock data json file supplied to us.
  };

  // These order id's are random and there is no meaning associated with them.
  // Acycylovir's order id was found in the Mock data json file supplied to us.
  readonly rxNormOrders = {
    '248656': ['12345678'],
    '308182':
        [
          '23865893', '85426486'
        ],  // This individual might have had two orders for amoxicillin in this
            // mock time period.
    '281': ['2516412263']
  };

  constructor(private http: HttpClient) {
    super();
  }

  /**
   * Gets observations from a specified date range with a specific LOINC code.
   * @param code The LOINC code for which to get observations.
   * @param dateRange The time interval observations should fall between.
   * @param limitCount Unused in this implementation, as this is just a
   *     time-saving feature for HTTP calls.
   */
  getObservationsWithCode(
      code: LOINCCode, dateRange: Interval,
      limitCount?: number): Promise<Observation[]> {
    return this.http.get(this.observationPath)
        .toPromise<any>()
        .then(data => {
          // We filter the mock data by reading in the value from a
          // locally stored JSON file, and filtering for observations
          // based on the LOINC Code and date range parameters.
          return data.filter((obj) => {
            obj.resource.code.coding = obj.resource.code.coding === undefined ?
                [] :
                obj.resource.code.coding.filter(
                    c => (c.code === code.codeString));
            return (obj.resource.code.coding.length !== 0);
          });
        })
        .then(data => {
          const observations = [];
          for (const json of data) {
            try {
              observations.push(new Observation(json.resource));
            } catch (error) {
              console.info(error);
            }
          }
          return observations;
        });
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
    return this.http.get(this.medicationAdministrationsPath)
        .toPromise<any>()
        .then(data => {
          return data
              .map(d => {
                try {
                  return new MedicationAdministration(d.resource);
                } catch (error) {
                  console.info(error);
                  return undefined;
                }
              })
              .filter(medAdmin => {
                if (medAdmin === undefined) {
                  return false;
                } else {
                  return medAdmin.rxNormCode.codeString === code.codeString;
                }
              });
        });
  }

  /**
   * Returns arbitrary orders for current mock medications.
   * @param id The id to pull the order from.
   * TODO(b/117438708): Add more mock medication orders to JSON files for
   * different medications requested.
   */
  getMedicationOrderWithId(id: string): Promise<MedicationOrder> {
    return this.http.get(this.medicationOrderPath)
        .toPromise<any>()
        .then(data => {
          // We filter the mock data by reading in the value from a
          // locally stored JSON file, and filtering for observations
          // based on the LOINC Code and date range parameters.
          return data.filter(obj => {
            return (obj.resource.id === id);
          });
        })
        .then(data => {
          if (data.length > 0) {
            for (const json of data) {
              try {
                return new MedicationOrder(json.resource);
              } catch (error) {
                console.info(error);
              }
            }
          }
        });
  }

  /**
   * Gets administrations for specified order id.
   * @param id The id to pull the order from.
   */
  getMedicationAdministrationsWithOrder(id: string):
      Promise<MedicationAdministration[]> {
    return this.http.get(this.medicationAdministrationsPath)
        .toPromise<any>()
        .then(data => {
          // We filter the mock data by reading in the value from a
          // locally stored JSON file, and filtering for administrations
          // based on the order id.
          return data.filter((obj) => {
            return (obj.resource.prescription.reference === id);
          });
        })
        .then(data => {
          const admins = [];
          for (const json of data) {
            admins.push(new MedicationAdministration(json.resource));
          }
          return admins;
        });
  }

  /**
   * Gets the encounters for the patient for any encounter that falls in the
   * given date range.
   * @param dateRange Return all encounters that covered any time in this
   *   date range.
   */
  getEncountersForPatient(dateRange: Interval): Promise<Encounter[]> {
    return this.http.get(this.encountersPath).toPromise<any>().then(data => {
      const encounters = [];
      for (const json of data) {
        encounters.push(new Encounter(json.resource));
      }
      return encounters.filter(
          encounter => dateRange.intersection(encounter.period) !== null);
    });
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
   * @param dateRange Return all DiagnosticReports that covered any time in this
   *   date range.
   */
  getDiagnosticReports(codeGroup: BCHMicrobioCodeGroup, dateRange: Interval):
      Promise<DiagnosticReport[]> {
    return this.http.get(this.diagnosticReportsPath)
        .toPromise<any>()
        .then(data => {
          let reports = [];
          for (const json of data) {
            try {
              reports.push(new DiagnosticReport(json.resource));
            } catch (e) {
              console.info(e);
            }
          }
          // Filter reports by having the correct specimen type in their
          // specimen list.
          reports = reports.filter(report => {
            const matchingSpecimen = report.specimens.find(
                specimen => specimen.type === codeGroup.label);
            return (matchingSpecimen !== undefined);
          });
          // Filter remaining reports by having a code in their results list
          // that matches a code in the codegroup's list of resourcecodes.
          reports = reports.filter(report => {
            const results = report.results;
            return this.findResultWithCode(codeGroup, results) !== undefined;
          });
          return reports;
        });
  }

  // This method returns the first Observation that contains the same code as
  // any code in the codegroup's resource list.
  private findResultWithCode(
      codeGroup: BCHMicrobioCodeGroup, results: Observation[]): Observation {
    // Find the first Observation in results.
    return results.find(result => {
      // Check whether the Observation has some code matching a code in the
      // codegroup's list.
      return result.codes.some(code => {
        return this.findMatchingCode(codeGroup, code as BCHMicrobioCode) !==
            undefined;
      });
    });
  }

  // This method returns the first BCHMicrobioCode that is contained in the list
  // of codes of the codegroup.
  private findMatchingCode(
      codeGroup: BCHMicrobioCodeGroup, code: BCHMicrobioCode): BCHMicrobioCode {
    return (codeGroup.resourceCodes.find(
               resourceCode => resourceCode.codeString === code.codeString)) as
        BCHMicrobioCode;
  }
}
