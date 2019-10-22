import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {environment} from '../../environments/environment';
import {DisplayGrouping, labResult} from '../clinicalconcepts/display-grouping';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ChartType} from '../graphtypes/graph/graph.component';


/**
 * Holds basic configuration information for clinical concepts. Eventually
 * in ResourceCodeManager these primitive structures get transformed into
 * more sophisticated structures like Axis and AxisGroup, but this structure
 * holds the information as it was read in from the configuration files.
 */
export class ConceptConfiguration {
  constructor(
      private groupNameToChartInfo: Map<string, [ChartType, boolean]>,
      private displayGroupNameToCodeList: Map<string, LOINCCode[]>) {}

  /**
   * Returns a map where keys are the name of a group of concepts
   * that should be displayed together, and the value is a tuple of
   * [the type of the chart, whether the chart should be displayed by default].
   */
  getGroupNameToChartInfo(): Map<string, [ChartType, boolean]> {
    return this.groupNameToChartInfo;
  }

  /**
   * Returns a map where keys are the name of a group of concepts to be
   * displayed together, and the values are a list of LOINC codes belonging
   * to that display group.
   */
  getDisplayGroupNameToCodeList(): Map<string, LOINCCode[]> {
    return this.displayGroupNameToCodeList;
  }
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

  /**
   * Load in both the display groups and the clinical conepts, and return
   * a ConceptConfiguration that represents them.
   */
  readonly loadConfigurationFromFiles: Promise<ConceptConfiguration> =
      Promise
          .all([
            this.loadDisplayGroupsFromFile(
                ResourceCodeCreator.assetPath + '/' + environment.labGroupFile),
            this.createConceptsFromFile(
                ResourceCodeCreator.assetPath + '/' +
                    environment.labConceptsFile,
                labResult)
          ])
          .then((results) => {
            return new ConceptConfiguration(results[0], results[1]);
          });

  /**
   * Reads in a JSON file and creates clinical concepts for each listed
   * configuration. Returns a map of listed display groupings to their
   * corresponding clinical concepts.
   */
  private createConceptsFromFile(
      filePath: string,
      displayGrouping: DisplayGrouping): Promise<Map<string, LOINCCode[]>> {
    const groupToConcept = new Map<string, LOINCCode[]>();
    return this.http.get(filePath).toPromise<any>().then(clinicalConcepts => {
      for (const concept of clinicalConcepts) {
        const loinc = new LOINCCode(
            concept.codeString, displayGrouping, concept.displayName,
            concept.showByDefault ? concept.showByDefault : false,
            concept.displayBounds ?
                [concept.displayBounds.lower, concept.displayBounds.upper] :
                undefined,
            concept.forceDisplayBounds ? concept.forceDisplayBounds : false);
        let concepts = new Array<LOINCCode>();

        if (!concept.groupNames) {
          concept.groupNames = [concept.displayName];
        }

        for (let groupName of concept.groupNames) {
          if (groupToConcept.has(groupName)) {
            concepts = groupToConcept.get(groupName);
          }
          concepts.push(loinc);
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
  private loadDisplayGroupsFromFile(filePath: string):
      Promise<Map<string, [ChartType, boolean]>> {
    return this.http.get(filePath).toPromise<any>().then(groups => {
      const displayGroupConfigurations =
          new Map<string, [ChartType, boolean]>();
      groups.forEach(group => {
        let chartType = ChartType.LINE;
        if (group.chartType === 'SCATTER') {
          chartType = ChartType.SCATTER;
        } else if (group.chartType === 'STEP') {
          chartType = ChartType.STEP;
        } else if (group.chartType === 'MICROBIO') {
          chartType = ChartType.MICROBIO;
        } else if (group.chartType === 'DIAGNOSTIC') {
          chartType = ChartType.DIAGNOSTIC;
        }
        displayGroupConfigurations.set(
            group.groupName, [chartType, group.displayGroupOnSameAxis]);
      });
      return displayGroupConfigurations;
    });
  }
}
