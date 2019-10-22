import {HttpClient} from '@angular/common/http';
import {Injectable} from '@angular/core';

import {environment} from '../../environments/environment';
import {BCHMicrobioCode} from '../clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCode} from '../clinicalconcepts/diagnostic-report-code';
import {DisplayGrouping, labResult, med, microbio, radiology} from '../clinicalconcepts/display-grouping';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ResourceCode} from '../clinicalconcepts/resource-code-group';
import {RxNormCode} from '../clinicalconcepts/rx-norm';
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
  constructor(private http: HttpClient) {
    this.createConceptConfiguration();
  }

  private static assetPath = './assets/' + environment.conceptsFolder;

  /**
   * Map from DisplayGrouping to a tuple of file names that describe the groups
   * and concepts that belong to that grouping.
   * First file is the Group json file. Second file is the Concept json file.
   * These files should be located within the directory of the assetPath.
   */
  private readonly fileMap = new Map([
    [
      labResult,
      [
        environment.labGroupFile,
        environment.labConceptsFile,
      ]
    ],
    [
      radiology,
      [environment.radiologyGroupFile, environment.radiologyConceptsFile]
    ]
  ]);

  /**
   * Mapping from DisplayGrouping to a Promise that resolves to the
   * ConceptConfiguration object for that DisplayGrouping.
   */
  loadConfigurationFromFiles:
      Map<DisplayGrouping, Promise<ConceptConfiguration>>;

  /**
   * Load in both the display groups and the clinical conepts, and return
   * a ConceptConfiguration that represents them.
   */
  private createConceptConfiguration():
      Map<DisplayGrouping, Promise<ConceptConfiguration>> {
    if (!this.loadConfigurationFromFiles) {
      const configurationsMap =
          new Map<DisplayGrouping, Promise<ConceptConfiguration>>();
      this.fileMap.forEach((files, displayGrouping) => {
        configurationsMap.set(
            displayGrouping,
            Promise
                .all([
                  this.loadDisplayGroupsFromFile(
                      ResourceCodeCreator.assetPath + '/' + files[0]),
                  this.createConceptsFromFile(
                      ResourceCodeCreator.assetPath + '/' + files[1],
                      displayGrouping)
                ])
                .then((results) => {
                  return new ConceptConfiguration(results[0], results[1]);
                }));
      });
      this.loadConfigurationFromFiles = configurationsMap;
    }
    return this.loadConfigurationFromFiles;
  }

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
    } else if (displayGrouping === med) {
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
        let concepts = [];
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
  private loadDisplayGroupsFromFile(filePath: string):
      Promise<Map<string, [ChartType, boolean]>> {
    return this.http.get(filePath).toPromise<any>().then(groups => {
      const displayGroupConfigurations =
          new Map<string, [ChartType, boolean]>();
      groups.forEach(group => {
        let chartType = ChartType.LINE;
        if (group.graphType === 'SCATTER') {
          chartType = ChartType.SCATTER;
        } else if (group.graphType === 'STEP') {
          chartType = ChartType.STEP;
        } else if (group.graphType === 'MICROBIO') {
          chartType = ChartType.MICROBIO;
        } else if (group.graphType === 'DIAGNOSTIC') {
          chartType = ChartType.DIAGNOSTIC;
        }
        displayGroupConfigurations.set(
            group.groupName, [chartType, group.displayGroupOnSameAxis]);
      });
      return displayGroupConfigurations;
    });
  }
}
