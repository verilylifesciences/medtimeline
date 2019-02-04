// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';

import {LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {FhirService} from '../fhir.service';
import {ChartType} from '../graphtypes/graph/graph.component';

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from './bch-microbio-code';
import {DisplayGrouping, document, labResult, med, microbio, vitalSign} from './display-grouping';
import {LOINCCode} from './loinc-code';
import {ResourceCodeGroup} from './resource-code-group';
import {RXNORM_CODES, RxNormCode} from './rx-norm';
import {RxNormCodeGroup} from './rx-norm-group';

// We declare a new LOINCCode referencing a DocumentReference, but do not
// include it in the groupings below because it is not graphed/displayed in the
// configuration sidebar.
export const documentReferenceLoinc =
    new LOINCCode('68608-9', document, 'Summary', true);

const ovaAndParasiteExam = new BCHMicrobioCode(
    'OVAANDPARASITEEXAM', microbio, 'Ovo and Parasite Exam', false);

const salmonella = new BCHMicrobioCode(
    'SALMONELLAANDSHIGELLACULTURE', microbio, 'Salmonella and Shigella Culture',
    false);

export const diastolicBP =
    new LOINCCode('8462-4', vitalSign, 'Diastolic Blood Pressure', true);
export const systolicBP =
    new LOINCCode('8480-6', vitalSign, 'Systolic Blood Pressure', true);

export class ResourceCodesForCard {
  // Each ResourceCodeGroup represents data series on one axis. The type of
  // ResourceCodeGroups can be mixed here, hence the vague typing.
  readonly resourceCodeGroups: ResourceCodeGroup[];

  // The label for the card.
  readonly label: string;

  // The display grouping for the card.
  readonly displayGrouping: DisplayGrouping;

  // Whether there is data to display for any of the resource code groups.
  dataAvailable: boolean;

  constructor(
      resourceCodeGroups: ResourceCodeGroup[], label: string,
      displayGrouping: DisplayGrouping) {
    // Throw an error if the DisplayGroupings don't match each other or the
    // provided DisplayGrouping for the card.
    if (!resourceCodeGroups.every(x => x.displayGrouping === displayGrouping)) {
      throw Error(
          'All ResourceCodeGroups in the same card must ' +
          'have the same DisplayGrouping');
    }
    this.resourceCodeGroups = resourceCodeGroups;
    this.label = label;
    this.displayGrouping = displayGrouping;
    Promise
        .all(this.resourceCodeGroups.map(
            rsc => rsc.dataAvailableInAppTimeScope()))
        .then(rsc => {
          const flattened: boolean[] = [].concat.apply([], rsc);
          this.dataAvailable =
              flattened.reduce((prev, curr) => prev || curr, false);
        });
  }
}

/**
 * ResourceCodeManager is the centralized class where other components can
 * look to find an exhaustive listing of all the resource code groups that the
 * application may display.
 * TODO(b/119185198): Eventually RxNorms should be listed here, too.
 */
@Injectable()
export class ResourceCodeManager {
  private static resourceCodeGroups: ResourceCodesForCard[];
  private static displayGroupMapping:
      Map<DisplayGrouping, ResourceCodesForCard[]>;

  private static readonly labLoincs = [
    // Pull all the defaults to the top.
    new LOINCCode('26464-8', labResult, 'WBC', true),
    new LOINCCode('764-1', labResult, 'Neutrophil/Band', true),
    new LOINCCode('38518-7', labResult, 'Immature Granulocytes', true),
    new LOINCCode('1988-5', labResult, 'C-Reactive Protein', true),
    new LOINCCode('30341-2', labResult, 'ESR', true),
    new LOINCCode('3094-0', labResult, 'BUN', true),
    new LOINCCode('2160-0', labResult, 'Creatinine', true),
    new LOINCCode('1742-6', labResult, 'ALT', true),
    new LOINCCode('1920-8', labResult, 'AST', true),
    // The rest show up alphabetically below.
    new LOINCCode('6768-6', labResult, 'Alkaline Phosphatase', false),
    new LOINCCode('707-0', labResult, 'Basophil', false),
    new LOINCCode('1968-7', labResult, 'Bilirubin, Direct', false),
    new LOINCCode('1975-2', labResult, 'Bilirubin, Total', false),
    new LOINCCode('714-6', labResult, 'Eosinophil', false),
    new LOINCCode('2324-2', labResult, 'GGTP', false),
    new LOINCCode('4544-3', labResult, 'Hematocrit', false),
    new LOINCCode('718-7', labResult, 'Hemoglobin', false),
    new LOINCCode('14804-9', labResult, 'LDH', false),
    new LOINCCode('737-7', labResult, 'Lymphocyte', false),
    new LOINCCode('743-5', labResult, 'Monocyte', false),
    new LOINCCode('777-3', labResult, 'Platelet', false),
  ];

  private static readonly vitalLoincs = [
    new LOINCCode('8310-5', vitalSign, 'Temperature', true),
    new LOINCCode('8867-4', vitalSign, 'Heart Rate', true),
    new LOINCCode('9279-1', vitalSign, 'Respiratory Rate', true),
    new LOINCCode('55284-4', vitalSign, 'Blood pressure', true),
    new LOINCCode('59408-5', vitalSign, 'Oxygen Saturation', true)
  ];

  private static readonly gentMonitoring = [
    new LOINCCode('35668-3', labResult, 'Gent Level', false),
    new LOINCCode('3663-2', labResult, 'Gent Pk', false),
    new LOINCCode('3665-7', labResult, 'Gent Tr', false)
  ];

  private static readonly vancMonitoring = [
    new LOINCCode('20578-1', labResult, 'Vanc Level', true),
    new LOINCCode('4092-3', labResult, 'Vanc Tr', true),
    new LOINCCode('4090-7', labResult, 'Vanc Pk', true)
  ];


  private static readonly urineGroup = [
    new LOINCCode('5767-9', labResult, 'Appearance, Urinalysis', false),
    new LOINCCode('5769-5', labResult, 'Bacteria, Urinalysis', false),
    new LOINCCode('50551-1', labResult, 'Bilirubin, Urinalysis', false),
    new LOINCCode('5794-3', labResult, 'Blood, Urinalysis', false),
    new LOINCCode('5778-6', labResult, 'Color, Urinalysis', false),
    new LOINCCode('50555-2', labResult, 'Glucose, Urinalysis', false),
    new LOINCCode('57734-6', labResult, 'Ketone, Urinalysis', false),
    new LOINCCode('50558-6', labResult, 'Nitrite, Urinalysis', false),
    new LOINCCode('50560-2', labResult, 'pH, Urinalysis', false),
    new LOINCCode('57735-3', labResult, 'Protein, Urinalysis', false),
    new LOINCCode('13945-1', labResult, 'Red Cells, Urinalysis', false),
    new LOINCCode('5810-7', labResult, 'Specific Gravity, Urinalysis', false),
    new LOINCCode(
        '11277-1', labResult, 'Squamous Epithelial, Urinalysis', false),
    new LOINCCode('50563-6', labResult, 'Urobilinogen, Urinalysis', false),
    new LOINCCode('5799-2', labResult, 'WBC Enzyme, Urinalysis', false),
    new LOINCCode('5799-2', labResult, 'White Cells, Urinalysis', false)
  ];

  // TODO(b/117431412): Figure out which microbio concepts to display.
  private static stoolGroup = [
    new BCHMicrobioCode(
        'OVAANDPARASITEEXAM', microbio, 'Ovo and Parasite Exam', true),
    new BCHMicrobioCode(
        'SALMONELLAANDSHIGELLACULTURE', microbio,
        'Salmonella and Shigella Culture', true)
  ];

  private static npSwabGroup = [
    new BCHMicrobioCode(
        'INFLUENZAABRSVPCRWASUBTYPEQUAL', microbio,
        'nfluenza A/B, RSV PCR w/A Subtype, QuaL', true),
    new BCHMicrobioCode(
        'ADENOVIRUSPCRRESPQUAL', microbio, 'Adenovirus PCR, Resp, QuaL', true),
    new BCHMicrobioCode(
        'VIRALDFARESPIRATORY', microbio, 'Viral DFA Respiratory', true)
  ];

  private static typeToPairs: Array<[DisplayGrouping, LOINCCode[]]> = [
    [vitalSign, ResourceCodeManager.vitalLoincs],
    [labResult, ResourceCodeManager.labLoincs],
  ];

  constructor(private fhirService: FhirService) {
    if (!ResourceCodeManager.resourceCodeGroups) {
      const codeGroups: ResourceCodesForCard[] = [];
      // All the labs and vitals are linecharts and displayed on
      // independent axes.
      for (const [conceptGroup, codePairs] of ResourceCodeManager.typeToPairs) {
        for (const loinc of codePairs) {
          codeGroups.push(new ResourceCodesForCard(
              [new LOINCCodeGroup(
                  this.fhirService, loinc.label, new Array(loinc), conceptGroup,
                  ChartType.LINE)],
              loinc.label, conceptGroup));
        }
      }

      // TODO(b/118874488): Allow for configuration of RxNormCodeGroups.
      const medsSummaryGroup = RXNORM_CODES;
      codeGroups.push(new ResourceCodesForCard(
          [new RxNormCodeGroup(
              this.fhirService, 'Vanc & Gent Summary', medsSummaryGroup, med,
              ChartType.STEP)],
          'Vanc & Gent Summary', med));

      // Drug monitoring should be a scatterplot, and the related concepts
      // should be displayed on the same axes.
      codeGroups.push(new ResourceCodesForCard(
          [
            new RxNormCodeGroup(
                this.fhirService, 'Medication Administrations',
                [RxNormCode.fromCodeString('11124')], med, ChartType.SCATTER),
            new LOINCCodeGroup(
                this.fhirService, 'Monitoring',
                ResourceCodeManager.vancMonitoring, med, ChartType.SCATTER)
          ],
          'Vancomycin', med));

      codeGroups.push(new ResourceCodesForCard(
          [new LOINCCodeGroup(
              this.fhirService, 'Gentamicin',
              ResourceCodeManager.gentMonitoring, med, ChartType.SCATTER)],
          'Gentamicin', med));


      codeGroups.push(new ResourceCodesForCard(
          [new LOINCCodeGroup(
              this.fhirService, 'Urinalysis', ResourceCodeManager.urineGroup,
              labResult, ChartType.SCATTER)],
          'Urinalysis', labResult));

      codeGroups.push(new ResourceCodesForCard(
          [new BCHMicrobioCodeGroup(
              this.fhirService, 'Stool', ResourceCodeManager.stoolGroup,
              microbio, ChartType.MICROBIO)],
          'Stool', microbio));

      codeGroups.push(new ResourceCodesForCard(
          [new BCHMicrobioCodeGroup(
              this.fhirService, 'NP Swab', ResourceCodeManager.npSwabGroup,
              microbio, ChartType.MICROBIO)],
          'NP Swab', microbio));
      ResourceCodeManager.resourceCodeGroups = codeGroups;
    }

    if (!ResourceCodeManager.displayGroupMapping) {
      const mapping = new Map<DisplayGrouping, ResourceCodesForCard[]>();
      for (const group of this.getResourceCodeGroups()) {
        if (mapping.has(group.displayGrouping)) {
          mapping.get(group.displayGrouping).push(group);
        } else {
          mapping.set(group.displayGrouping, [group]);
        }
      }
      ResourceCodeManager.displayGroupMapping = mapping;
    }
  }

  /**
   * Returns the ResourceCodeGroups to be displayed. If the maps have already
   * been constructed, returns the static variable holding the information.
   * If not, constructs the maps and saves them into the static class variable,
   * then returns.
   */
  getResourceCodeGroups(): ResourceCodesForCard[] {
    return ResourceCodeManager.resourceCodeGroups;
  }

  /**
   * Returns a map where the key is a clinical concept group and the value is
   * a list of LOINC code groups belonging to the clinical concept group.
   */
  getDisplayGroupMapping(): Map<DisplayGrouping, ResourceCodesForCard[]> {
    return ResourceCodeManager.displayGroupMapping;
  }
}
