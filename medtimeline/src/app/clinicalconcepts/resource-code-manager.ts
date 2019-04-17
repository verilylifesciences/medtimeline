// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {FhirService} from '../fhir.service';
import {Axis} from '../graphtypes/axis';
import {AxisGroup} from '../graphtypes/axis-group';
import {ChartType} from '../graphtypes/graph/graph.component';

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from './bch-microbio-code';
import {DisplayGrouping, labResult, med, microbio, vitalSign} from './display-grouping';
import {LOINCCode} from './loinc-code';
import {RXNORM_CODES, RxNormCode} from './rx-norm';
import {RxNormCodeGroup} from './rx-norm-group';

// We declare a new LOINCCode referencing a DocumentReference, but do not
// include it in the groupings below because it is not graphed/displayed in the
// configuration sidebar.
export const documentReferenceLoinc =
    new LOINCCode('68608-9', undefined, 'Summary', true);

const ovaAndParasiteExam = new BCHMicrobioCode(
    'OVAANDPARASITEEXAM', microbio, 'Ovo and Parasite Exam', false);

const salmonella = new BCHMicrobioCode(
    'SALMONELLAANDSHIGELLACULTURE', microbio, 'Salmonella and Shigella Culture',
    false);

/**
 * ResourceCodeManager is the centralized class where other components can
 * look to find an exhaustive listing of all the resource code groups that the
 * application may display.
 */
@Injectable()
export class ResourceCodeManager {
  private static axisGroups: AxisGroup[];
  private static displayGroupMapping: Map<DisplayGrouping, AxisGroup[]>;

  private static readonly labLoincs = [
    // Pull all the defaults to the top.
    new LOINCCode(
        '1988-5', labResult, 'C-Reactive Protein', true, [0, 100], true),
    new LOINCCode('4537-7', labResult, 'ESR', true, [0, 200]),
    new LOINCCode('3094-0', labResult, 'BUN', true),
    new LOINCCode('2160-0', labResult, 'Creatinine', true),
    new LOINCCode('1742-6', labResult, 'Alanine Aminotransferase (ALT)', true),
    new LOINCCode(
        '1920-8', labResult, 'Aspartate Aminotransferase (AST)', true),
    new LOINCCode('6768-6', labResult, 'Alkaline Phosphatase', true),
    new LOINCCode('1968-7', labResult, 'Bilirubin, Direct', true),
    new LOINCCode('1975-2', labResult, 'Bilirubin, Total', true),
    new LOINCCode('3084-1', labResult, 'Uric acid', false)
  ];

  private static readonly vitalLoincs = [
    new LOINCCode('8310-5', vitalSign, 'Body temperature', true, [35, 41]),
    new LOINCCode('8867-4', vitalSign, 'Heart Rate', true, [20, 300]),
    new LOINCCode('9279-1', vitalSign, 'Respiratory Rate', true, [6, 100]),
    new LOINCCode('59408-5', vitalSign, 'SpO2', true, [5, 100], true)
  ];

  /**
   * Although these two measurements have independent LOINC codes they only ever
   * appear as sub-measurements of the larger entity for "blood pressure" in the
   * way that BCH data shows up.
   */
  private static readonly diastolicBP = new LOINCCode(
      '8462-4', vitalSign, 'Diastolic Blood Pressure', true, [25, 150]);
  private static readonly systolicBP = new LOINCCode(
      '8480-6', vitalSign, 'Systolic Blood Pressure', true, [30, 250]);

  private static readonly bloodPressureLoincs = [
    new LOINCCode('55284-4', vitalSign, 'Blood Pressure', true),
    new LOINCCode('76214-6', vitalSign, 'Mean Arterial Pressure', true)
  ];

  private static readonly gentMonitoring = [
    new LOINCCode('31091-2', labResult, 'Gentamicin, Peak/Post Q24H'),
    new LOINCCode('3663-2', labResult, 'Gentamicin, Peak/Post Q8H'),
    new LOINCCode('31092-0', labResult, 'Gentamicin, Trough/Pre Q24H'),
    new LOINCCode('3665-7', labResult, 'Gentamicin, Trough/Pre Q8H')
  ];

  private static readonly vancMonitoring = [
    new LOINCCode('20578-1', labResult, 'Vancomycin Level, Random', true),
    new LOINCCode('4092-3', labResult, 'Vancomycin Level, Trough/Pre', true),
  ];

  private static readonly urineGroup = [
    new LOINCCode('5769-5', labResult, 'Bacteria, Urinalysis'),
    new LOINCCode('50551-1', labResult, 'Bilirubin, Urinalysis'),
    new LOINCCode('5794-3', labResult, 'Blood, Urinalysis'),
    new LOINCCode('21033-6', labResult, 'Budding Yeast, Urinalysis'),
    new LOINCCode('41865-7', labResult, 'Hyphal Yeast, Urinalysis'),
    new LOINCCode('25157-9', labResult, 'Epithelial Cast, Urinalysis'),
    new LOINCCode('50558-6', labResult, 'Nitrite, Urinalysis'),
    new LOINCCode('57735-3', labResult, 'Protein, Urinalysis'),
    new LOINCCode('58449-0', labResult, 'Red Blood Cell Clump, Urinalysis'),
    new LOINCCode('13945-1', labResult, 'Red Cells, Urinalysis'),
    new LOINCCode('11277-1', labResult, 'Squamous Epithelial, Urinalysis'),
    new LOINCCode('50563-6', labResult, 'Urobilinogen, Urinalysis'),
    new LOINCCode('5799-2', labResult, 'White Blood Cell Enzyme, Urinalysis'),
    new LOINCCode('33825-1', labResult, 'White Blood Cell Clump, Urinalysis'),
    new LOINCCode('20408-1', labResult, 'White Cells, Urinalysis'),
  ];

  private static readonly csfGroup = [
    new LOINCCode('10333-3', labResult, 'Appearance, CSF'),
    new LOINCCode('13517-8', labResult, 'Atypical Lymph, CSF'),
    new LOINCCode('12278-8', labResult, 'Band, CSF'),
    new LOINCCode('30374-3', labResult, 'Basophil, CSF'),
    new LOINCCode('12208-5', labResult, 'Eosinophil, CSF'),
    new LOINCCode('2342-4', labResult, 'Glucose, CSF'),
    new LOINCCode('10328-3', labResult, 'Lymphocyte, CSF'),
    new LOINCCode('10329-1', labResult, 'Monocyte, CSF'),
    new LOINCCode('12278-8', labResult, 'Neutrophil/Band, CSF')
  ];

  private static readonly otherFluidGroup = [
    new LOINCCode('9335-1', labResult, 'Appearance, Other Fluid'),
    new LOINCCode('31208-2', labResult, 'Cell Count Source, Other Fluid'),
    new LOINCCode('47938-6', labResult, 'Cell Count, Other Source'),
    new LOINCCode('38256-4', labResult, 'Cells Counted, Other Fluid'),
    new LOINCCode('6824-7', labResult, 'Color, Other Fluid'),
    new LOINCCode('12209-3', labResult, 'Eosinophil, Other Fluid')
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

  constructor(
      private fhirService: FhirService, private sanitizer: DomSanitizer) {
    if (ResourceCodeManager.axisGroups) {
      return;
    }


    const codeGroups = new Array<AxisGroup>();
    // All the labs and vitals are linecharts and displayed on
    // independent axes.
    for (const [conceptGroup, codePairs] of ResourceCodeManager.typeToPairs) {
      for (const loinc of codePairs) {
        codeGroups.push(new AxisGroup([new Axis(
            this.fhirService, this.sanitizer,
            new LOINCCodeGroup(
                this.fhirService, loinc.label, new Array(loinc), conceptGroup,
                ChartType.LINE, loinc.displayBounds, loinc.forceDisplayBounds),
            loinc.label)]));
      }
    }

    const bpLocation = new LOINCCodeGroup(
        this.fhirService, 'Blood Pressure Details',
        [new LOINCCode('41904-4', vitalSign, 'Blood Pressure Location', true)],
        vitalSign, ChartType.SCATTER);
    // Add the blood pressure LOINCs.
    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new LOINCCodeGroup(
            this.fhirService, 'Blood Pressure',
            ResourceCodeManager.bloodPressureLoincs, vitalSign, ChartType.LINE,
            [25, 200], false,
            (observation: Observation, dateRange: Interval):
                Promise<AnnotatedObservation> => {
                  return bpLocation.getResourceSet(dateRange).then(obsSet => {
                    return AnnotatedObservation.forBloodPressure(
                        observation,
                        // We only pass in the first ObservationSet, since we
                        // know there is only one code whose observations we
                        // care about.
                        obsSet[0]);
                  });
                }),
        'Blood Pressure')]));

    const cbc = [
      new LOINCCodeGroup(
          this.fhirService, 'Hematocrit',
          [new LOINCCode('4544-3', labResult, 'Hematocrit', false, [10, 70])],
          labResult, ChartType.LINE, [10, 70]),
      new LOINCCodeGroup(
          this.fhirService, 'Hemoglobin',
          [new LOINCCode('718-7', labResult, 'Hemoglobin', false, [0.5, 30])],
          labResult, ChartType.LINE, [0.5, 30]),
      new LOINCCodeGroup(
          this.fhirService, 'Platelet',
          [new LOINCCode('777-3', labResult, 'Platelet', false, [0.5, 30])],
          labResult, ChartType.LINE, [0.5, 30]),
      new LOINCCodeGroup(
          this.fhirService, 'White Blood Cell',
          [new LOINCCode('26464-8', labResult, 'White Blood Cell', false)],
          labResult, ChartType.LINE),
    ];

    codeGroups.push(new AxisGroup(
        cbc.map(
            codeGroup => new Axis(
                this.fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Complete Blood Count'));

    const cbcWBC = [
      new LOINCCodeGroup(
          this.fhirService, 'Neutrophil/Band',
          [new LOINCCode(
              '35332-6', labResult, 'Neutrophil/Band', true, [0, 100])],
          labResult, ChartType.LINE, [0, 100]),
      // TODO: add Immature Granulocytes
      // TODO: add Lymphocyte
      new LOINCCodeGroup(
          this.fhirService, 'Monocyte',
          [new LOINCCode('5905-5', labResult, 'Monocyte', false, [0, 100])],
          labResult, ChartType.LINE, [0, 100]),
      new LOINCCodeGroup(
          this.fhirService, 'Eosinophil',
          [new LOINCCode('713-8', labResult, 'Eosinophil', false, [0, 100])],
          labResult, ChartType.LINE, [0, 100]),
      new LOINCCodeGroup(
          this.fhirService, 'Basophil',
          [new LOINCCode('706-2', labResult, 'Basophil', false, [0, 100])],
          labResult, ChartType.LINE, [0, 100]),

    ];
    codeGroups.push(new AxisGroup(
        cbcWBC.map(
            codeGroup => new Axis(
                this.fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Complete Blood Count White Blood Cell'));

    const medsSummaryGroup = RXNORM_CODES;
    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new RxNormCodeGroup(
            this.fhirService, 'Vancomycin & Gentamicin Summary',
            medsSummaryGroup, med, ChartType.STEP),
        'Vancomycin & Gentamicin Summary')]));

    // Drug monitoring should be a scatterplot, and the related concepts
    // should be displayed on the same axes.
    const vancRxNorm = new RxNormCodeGroup(
        this.fhirService, 'Medication Administrations',
        [RxNormCode.fromCodeString('11124')], med, ChartType.SCATTER);

    // Drug monitoring should be a scatterplot, and the related concepts
    // should be displayed on the same axes.
    const vancMonitoring = [
      vancRxNorm,
      new LOINCCodeGroup(
          this.fhirService, 'Monitoring', ResourceCodeManager.vancMonitoring,
          med, ChartType.SCATTER,
          undefined,  // no meaningful y-axis ranges
          false,
          (observation: Observation, dateRange: Interval):
              Promise<AnnotatedObservation> => {
                return vancRxNorm.getResourceSet(dateRange).then(rxNorms => {
                  // We know that we're only pushing in one RxNorm
                  // so it's safe to grab the first (and only) one in
                  // the list.
                  return AnnotatedObservation.forMedicationMonitoring(
                      observation, rxNorms[0].orders);
                });
              })
    ];

    codeGroups.push(new AxisGroup(
        vancMonitoring.map(
            codeGroup => new Axis(
                this.fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Vancomycin'));

    const gentMonitoring = [
      new RxNormCodeGroup(
          this.fhirService, 'Medication Administrations',
          [RxNormCode.fromCodeString('1596450')], med, ChartType.SCATTER),
      new LOINCCodeGroup(
          this.fhirService, 'Monitoring', ResourceCodeManager.gentMonitoring,
          med, ChartType.SCATTER)
    ];

    codeGroups.push(new AxisGroup(
        gentMonitoring.map(
            codeGroup => new Axis(
                this.fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Gentamicin'));

    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new LOINCCodeGroup(
            this.fhirService, 'Urinalysis', ResourceCodeManager.urineGroup,
            labResult, ChartType.SCATTER),
        'Urinalysis')]));

    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new LOINCCodeGroup(
            this.fhirService, 'CSF', ResourceCodeManager.csfGroup, labResult,
            ChartType.SCATTER),
        'CSF')]));

    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new LOINCCodeGroup(
            this.fhirService, 'Other Fluid',
            ResourceCodeManager.otherFluidGroup, labResult, ChartType.SCATTER),
        'Other Fluid')]));

    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            this.fhirService, 'Stool', ResourceCodeManager.stoolGroup, microbio,
            ChartType.MICROBIO),
        'Stool')]));

    codeGroups.push(new AxisGroup([new Axis(
        this.fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            this.fhirService, 'NP Swab', ResourceCodeManager.npSwabGroup,
            microbio, ChartType.MICROBIO),
        'NP Swab')]));
    ResourceCodeManager.axisGroups = codeGroups;

    const mapping = new Map<DisplayGrouping, AxisGroup[]>();
    for (const group of this.getResourceCodeGroups()) {
      if (mapping.has(group.displayGroup)) {
        mapping.get(group.displayGroup).push(group);
      } else {
        mapping.set(group.displayGroup, [group]);
      }
    }
    ResourceCodeManager.displayGroupMapping = mapping;
  }

  /**
   * Returns the ResourceCodeGroups to be displayed. If the maps have already
   * been constructed, returns the static variable holding the information.
   * If not, constructs the maps and saves them into the static class variable,
   * then returns.
   */
  getResourceCodeGroups(): AxisGroup[] {
    return ResourceCodeManager.axisGroups;
  }

  /**
   * Returns a map where the key is a clinical concept group and the value is
   * a list of LOINC code groups belonging to the clinical concept group.
   */
  getDisplayGroupMapping(): Map<DisplayGrouping, AxisGroup[]> {
    return ResourceCodeManager.displayGroupMapping;
  }
}
