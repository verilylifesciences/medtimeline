// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {environment} from '../../environments/environment';
import {BCHMicrobioCode} from '../clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCode} from '../clinicalconcepts/diagnostic-report-code';
import {antibiotics, antifungals, antivirals, DisplayGrouping, labResult, microbio, radiology, vitalSign} from '../clinicalconcepts/display-grouping';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
import {ChartType} from '../graphs/graphtypes/graph/graph.component';


/**
 * Holds basic configuration information for clinical concept groups.
 */
export class GroupConfiguration {
  constructor(
      readonly groupName: string, readonly chartType: ChartType,
      readonly showOnSameAxis: boolean,
      readonly displayGrouping: DisplayGrouping) {}
}

/**
 * Responsible for reading in the configuration files defined in this
 * environment and parsing them into clinical concepts and their
 * corresponding groups.
 */
@Injectable()
export class ResourceCodeCreator {
  constructor(private http: HttpClient) {}

  private static assetPath = './assets/' + environment.conceptsFolder;

  private static stringToChartType = {
    'SCATTER': ChartType.SCATTER,
    'STEP': ChartType.STEP,
    'MICROBIO': ChartType.MICROBIO,
    'DIAGNOSTIC': ChartType.DIAGNOSTIC,
    'LINE': ChartType.LINE
  };


  /**
   * Map from DisplayGrouping to a tuple of file names that describe the groups
   * and concepts that belong to that grouping.
   * First file is the Group json file. Second file is the Concept json file.
   * These files should be located within the directory of the assetPath.
   */
  private readonly fileMap = new Map([
    [vitalSign, [environment.vitalGroupFile, environment.vitalConceptsFile]],
    [labResult, [environment.labGroupFile, environment.labConceptsFile]],
    [
      radiology,
      [environment.radiologyGroupFile, environment.radiologyConceptsFile]
    ],
    [
      antibiotics,
      [environment.antibioticGroupFile, environment.antibioticConceptsFile]
    ],
    [
      antivirals,
      [environment.antiviralGroupFile, environment.antiviralConceptsFile]
    ],
    [
      antifungals,
      [environment.antifungalGroupFile, environment.antifungalConceptsFile]
    ],
    [
      microbio,
      [environment.microbioGroupFile, environment.microbioConceptsFile]
    ]
  ]);

  /**
   * Loads in configuration for all the display groupings, including the
   * grouping name, the chart type for the grouping, whether it's displayed
   * by default
   */
  private loadAllGroups: Promise<Map<string, GroupConfiguration>> =
      Promise
          .all(Array.from(this.fileMap).map((entry) => {
            const displayGroup = entry[0];
            const groupFile = entry[1][0];
            return this.loadDisplayGroupsFromFile(
                ResourceCodeCreator.assetPath + '/' + groupFile, displayGroup);
          }))
          // Return one flattened map for all the display groups regardless of
          // their file source.
          .then(
              (allMaps) =>
                  new Map(allMaps.map((m) => Array.from(m))
                              .reduce((acc, val) => [...acc, ...val])));

  loadAllConcepts: Promise<Map<GroupConfiguration, ResourceCode[]>> =
      this.loadAllGroups.then((groupMap: Map<string, GroupConfiguration>) => {
        return Promise
            .all(Array.from(this.fileMap).map((entry) => {
              const displayGroup: DisplayGrouping = entry[0];
              const conceptsFile: string = entry[1][1];
              return this.createConceptsFromFile(
                  ResourceCodeCreator.assetPath + '/' + conceptsFile,
                  displayGroup);
            }))
            .then((conceptsFromFile: Array<Map<string, ResourceCode[]>>) => {
              // Reduce into one flattened map.
              const allConceptsMap =
                  new Map(conceptsFromFile.map((m) => Array.from(m))
                              .reduce((acc, val) => [...acc, ...val]));
              // Match up the display groupings to their corresponding
              // group configurations.
              const groupConfigurationToResourceCodes =
                  new Map<GroupConfiguration, ResourceCode[]>();
              allConceptsMap.forEach(
                  (concepts: ResourceCode[], groupName: string) => {
                    let groupConfiguration = groupMap.get(groupName);
                    // If there's no group configured for a clinical concept
                    // list, and the configuration was validated before running,
                    // we know that there is only one clinical concept in this
                    // group and that the group should be configured according
                    // to its attributes.
                    if (!groupConfiguration) {
                      groupConfiguration = new GroupConfiguration(
                          groupName, ChartType.LINE, true,
                          concepts[0].displayGrouping);
                    }

                    groupConfigurationToResourceCodes.set(
                        groupConfiguration, concepts);
                  });
              return groupConfigurationToResourceCodes;
            });
      });

  /**
   * Creates a ResourceCode. The type of ResourceCode is determined by the
   * passed in displayGrouping.
   *
   * @param displayGrouping DisplayGrouping for the ResourceCode
   * @param concept
   */
  private createResourceCode(displayGrouping: DisplayGrouping, concept: any) {
    const showByDefault = concept.showByDefault ? concept.showByDefault : false;
    const displayBounds: [number, number] = concept.displayBounds ?
        [concept.displayBounds.lower, concept.displayBounds.upper] :
        undefined;
    const forceDisplayBounds =
        concept.forceDisplayBounds ? concept.forceDisplayBounds : false;

    if (displayGrouping === radiology) {
      return new DiagnosticReportCode(
          concept.codeString, displayGrouping, concept.displayName,
          showByDefault, displayBounds, forceDisplayBounds);
    } else if (displayGrouping === microbio) {
      return new BCHMicrobioCode(
          concept.codeString, displayGrouping, concept.displayName,
          showByDefault, displayBounds, forceDisplayBounds);
    } else if ([antibiotics, antifungals, antivirals].includes(
                   displayGrouping)) {
      return new RxNormCode(
          concept.codeString, displayGrouping, concept.displayName,
          showByDefault, displayBounds, forceDisplayBounds);
    } else {
      return new LOINCCode(
          concept.codeString, displayGrouping, concept.displayName,
          showByDefault, displayBounds, forceDisplayBounds);
    }
  }

  /**
   * Reads in a JSON file and creates clinical concepts for each listed
   * configuration. Returns a map of listed display groupings to their
   * corresponding clinical concepts.
   */
  private createConceptsFromFile<R extends ResourceCode>(
      filePath: string,
      displayGrouping: DisplayGrouping,
      ): Promise<Map<string, R[]>> {
    const groupToConcept = new Map<string, R[]>();
    return this.http.get(filePath).toPromise<any>().then(clinicalConcepts => {
      for (const concept of clinicalConcepts) {
        const code = this.createResourceCode(displayGrouping, concept);
        // Concepts with innerComponentOnly=true are "components" of other
        // concepts. (See
        // http://hl7.org/fhir/DSTU2/observation-definitions.html#Observation.component
        // for more information.) In order for us to display these inner
        // components, the Resource Code needs to be created, but we do not
        // explicitly add them to a Resource Group.
        if (concept.innerComponentOnly) {
          continue;
        }
        let concepts = [];
        // If the concept has no higher level grouping, then use its display
        // name as the proxy for its grouping.
        if (!concept.groupNames) {
          concept.groupNames = [concept.displayName];
        }

        for (const groupName of concept.groupNames) {
          if (groupToConcept.has(groupName)) {
            concepts = groupToConcept.get(groupName);
          }
          concepts.push(code);
          groupToConcept.set(groupName, concepts);
        }
      }
      return groupToConcept;
    });
  }

  /**
   * Reads in a JSON file for display group configurations and maps
   * display group names to simple chart configuration attributes.
   */
  private loadDisplayGroupsFromFile(
      filePath: string, displayGrouping: DisplayGrouping):
      Promise<Map<string, GroupConfiguration>> {
    return this.http.get(filePath).toPromise<any>().then(groups => {
      return groups.map(
          group =>
              [group.groupName,
               new GroupConfiguration(
                   group.groupName,
                   ResourceCodeCreator.stringToChartType[group.graphType],
                   group.displayGroupOnSameAxis, displayGrouping)]);
    });
  }
}
