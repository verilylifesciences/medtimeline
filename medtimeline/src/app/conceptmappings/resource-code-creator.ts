// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.
import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {ChartType} from '../graphs/graphtypes/graph/graph.component';

import {ConceptFileConfiguration} from './concept-file-configuration';
import {BCHMicrobioCode} from './resource-codes/bch-microbio-code';
import {DiagnosticReportCode} from './resource-codes/diagnostic-report-code';
import {antibiotics, antifungals, antivirals, DisplayGrouping, microbio, radiology} from './resource-codes/display-grouping';
import {LOINCCode} from './resource-codes/loinc-code';
import {ResourceCode} from './resource-codes/resource-code-group';
import {RxNormCode} from './resource-codes/rx-norm';


/**
 * Holds basic configuration information for clinical concept groups.
 */
export class GroupConfiguration {
  constructor(
      readonly groupName: string, readonly chartType: ChartType,
      readonly showOnSameAxis: boolean,
      readonly displayGrouping: DisplayGrouping,
      readonly parentGroupName?: string) {}
}

/**
 * Responsible for reading in the configuration files defined in this
 * environment and parsing them into clinical concepts and their
 * corresponding groups.
 */
@Injectable()
export class ResourceCodeCreator {
  constructor(
      private http: HttpClient,
      private conceptFileConfiguration: ConceptFileConfiguration) {}

  private static stringToChartType = {
    'SCATTER': ChartType.SCATTER,
    'STEP': ChartType.STEP,
    'MICROBIO': ChartType.MICROBIO,
    'DIAGNOSTIC': ChartType.DIAGNOSTIC,
    'LINE': ChartType.LINE
  };


  private loadJsonForAllGroups: Promise<Array<[DisplayGrouping, any]>> =
      Promise.all(
          Array.from(this.conceptFileConfiguration.fileMap).map((entry) => {
            const displayGroup: DisplayGrouping = entry[0];
            const groupFile: string = entry[1][0];

            return this.http
                .get(this.conceptFileConfiguration.assetPath + '/' + groupFile)
                .toPromise<any>()
                .then(groups => {
                  // Without explicit typing here, the TS compiler complains.
                  const returned: [DisplayGrouping, any] =
                      [displayGroup, groups];
                  return returned;
                });
          }));

  private loadJsonForAllConcepts: Promise<Array<[DisplayGrouping, any]>> =
      Promise.all(
          Array.from(this.conceptFileConfiguration.fileMap).map((entry) => {
            const displayGroup: DisplayGrouping = entry[0];
            const conceptsFile: string = entry[1][1];

            return this.http
                .get(
                    this.conceptFileConfiguration.assetPath + '/' +
                    conceptsFile)
                .toPromise<any>()
                .then(clinicalConcepts => {
                  // Without explicit typing here, the TS compiler complains.
                  const returned: [DisplayGrouping, any] =
                      [displayGroup, clinicalConcepts];
                  return returned;
                });
          }));

  /**
   * Loads in configuration for all the display groupings, including the
   * grouping name, the chart type for the grouping, whether it's displayed
   * by default
   */
  loadAllGroups: Promise<Map<string, GroupConfiguration>> =
      this.loadJsonForAllGroups
          .then((groupsList) => {
            return groupsList.map(
                group => this.createGroupConfigurations(group[0], group[1]));
          })
          // Return one flattened map for all the display groups regardless of
          // their file source.
          .then(
              (allMaps) =>
                  new Map(allMaps.map((m) => Array.from(m))
                              .reduce((acc, val) => [...acc, ...val])));



  loadAllConcepts: Promise<Map<GroupConfiguration, ResourceCode[]>> =
      this.loadAllGroups.then((groupMap: Map<string, GroupConfiguration>) => {
        return this.loadJsonForAllConcepts
            .then((conceptsList) => {
              return conceptsList.map(
                  concept => this.createConcepts(concept[0], concept[1]));
            })
            .then((conceptsFromFile: Array<Map<string, ResourceCode[]>>) => {
              // Reduce into one flattened map, allowing for mixing across
              // concept groups.
              const allConceptsMap = new Map();
              for (const mapEntry of conceptsFromFile) {
                for (const entry of Array.from(mapEntry.entries())) {
                  const group = entry[0];
                  let resourceCodes = entry[1];

                  if (allConceptsMap.has(group)) {
                    resourceCodes =
                        resourceCodes.concat(allConceptsMap.get(group));
                  }
                  allConceptsMap.set(group, resourceCodes);
                }
              }

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
  private createConcepts(displayGrouping: DisplayGrouping, json: any):
      Map<string, ResourceCode[]> {
    const groupToConcept = new Map<string, ResourceCode[]>();

    for (const concept of json) {
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
      // If the concept has no higher level grouping, then use its display
      // name as the proxy for its grouping.
      if (!concept.groupNames) {
        concept.groupNames = [concept.displayName];
      }

      for (const groupName of concept.groupNames) {
        const concepts = groupToConcept.get(groupName) || [];
        concepts.push(code);
        groupToConcept.set(groupName, concepts);
      }
    }
    return groupToConcept;
  }

  /**
   * Reads in a JSON file for display group configurations and maps
   * display group names to simple chart configuration attributes.
   */
  private createGroupConfigurations(
      displayGrouping: DisplayGrouping,
      json: any): Map<string, GroupConfiguration> {
    return json.map(
        group =>
            [group.groupName,
             new GroupConfiguration(
                 group.groupName,
                 ResourceCodeCreator.stringToChartType[group.graphType],
                 group.displayGroupOnSameAxis, displayGrouping,
                 group.parentGroupName)]);
  }
}
