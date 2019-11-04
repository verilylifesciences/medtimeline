import {antibiotics, antifungals, antivirals, labResult, microbio, radiology, vitalSign} from './resource-codes/display-grouping';

/**
 * Holds information for where the JSON files defining groupings and individual
 * clinical concepts are.
 */
export class ConceptFileConfiguration {
  /**
   * Map from DisplayGrouping to a tuple of file names that describe the groups
   * and concepts that belong to that grouping.
   * First file is the Group json file. Second file is the Concept json file.
   * These files should be located within the directory of the assetPath.
   */
  readonly fileMap;

  /**
   * The path to where all these files can be found.
   */
  readonly assetPath;

  constructor(
      private conceptsFolder = 'clinical_concept_configuration',

      vitalGroupFile = 'vital_sign_groups.json',
      vitalConceptsFile = 'vital_signs.json',

      labConceptsFile = 'lab_results.json', labGroupFile = 'lab_groups.json',

      radiologyConceptsFile = 'radiology_results.json',
      radiologyGroupFile = 'radiology_groups.json',

      antibioticConceptsFile = 'medications_antibiotics.json',
      antibioticGroupFile = 'medication_groups_antibiotics.json',

      antiviralConceptsFile = 'medications_antivirals.json',
      antiviralGroupFile = 'medication_groups_antivirals.json',

      antifungalConceptsFile = 'medications_antifungals.json',
      antifungalGroupFile = 'medication_groups_antifungals.json',

      microbioGroupFile = 'microbio_groups.json',
      microbioConceptsFile = 'microbio_results.json') {
    this.fileMap = new Map([
      [vitalSign, [vitalGroupFile, vitalConceptsFile]],
      [labResult, [labGroupFile, labConceptsFile]],
      [radiology, [radiologyGroupFile, radiologyConceptsFile]],
      [antibiotics, [antibioticGroupFile, antibioticConceptsFile]],
      [antivirals, [antiviralGroupFile, antiviralConceptsFile]],
      [antifungals, [antifungalGroupFile, antifungalConceptsFile]],
      [microbio, [microbioGroupFile, microbioConceptsFile]]
    ]);

    this.assetPath = './assets/' + this.conceptsFolder;
  }
}