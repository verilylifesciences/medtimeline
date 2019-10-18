// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {environment} from '../../environments/environment';
import {BCHMicrobioCode, BCHMicrobioCodeGroup} from '../clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCode, DiagnosticReportCodeGroup} from '../clinicalconcepts/diagnostic-report-code';
import {DisplayGrouping, labResult, med, microbio, radiology, vitalSign} from '../clinicalconcepts/display-grouping';
import {LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {RXNORM_CODES, RxNormCode} from '../clinicalconcepts/rx-norm';
import {RxNormCodeGroup} from '../clinicalconcepts/rx-norm-group';
import {AnnotatedObservation} from '../fhir-data-classes/annotated-observation';
import {Observation} from '../fhir-data-classes/observation';
import {FhirService} from '../fhir.service';
import {Axis} from '../graphtypes/axis';
import {AxisGroup} from '../graphtypes/axis-group';
import {ChartType} from '../graphtypes/graph/graph.component';

import {ConceptConfiguration, ResourceCodeCreator} from './resource-code-creator';
import {bloodPressureLoincs} from './resource-code-manager-exports';

// We declare a new LOINCCode referencing a DocumentReference, but do not
// include it in the groupings below because it is not graphed/displayed in the
// configuration sidebar.
export const documentReferenceLoinc =
    new LOINCCode('68608-9', undefined, 'Summary', true);

const ovaAndParasiteExam = new BCHMicrobioCode(
    'OVAANDPARASITEEXAM', microbio, 'Ova and Parasite Exam', false);

/**
 * ResourceCodeManager is the centralized class where other components can
 * look to find an exhaustive listing of all the resource code groups that the
 * application may display.
 */
@Injectable()
export class ResourceCodeManager {
  /* Visible for testing */
  static readonly vitalLoincs = [
    new LOINCCode('8310-5', vitalSign, 'Temperature', true, [35, 41]),
    new LOINCCode('8867-4', vitalSign, 'Heart Rate', true, [20, 300]),
    new LOINCCode('9279-1', vitalSign, 'Respiratory Rate', true, [6, 100]),
    new LOINCCode(
        '59408-5', vitalSign, 'Oxygen Saturation (SpO2)', true, [5, 100], true)
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

  // "bloodPressureLoincs" is in file resource-code-manager-exports.ts because
  // of circular dependency issues.

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

  private static stoolGroupMB = [
    new BCHMicrobioCode(
        'CDIFFICILEEIAWRFLXTOAMPLIFIEDDNA', microbio,
        'C difficile EIA w/rflx to amplified DNA', true),
    new BCHMicrobioCode(
        'CAMPYLOBACTERCULTURE', microbio, 'Campylobacter Culture', true),
    new BCHMicrobioCode(
        'ENTEROHEMORRHAGICECOLITEST', microbio, 'Enterohemorrhagic E coli Test',
        true),
    new BCHMicrobioCode(
        'SALMONELLAANDSHIGELLACULTURE', microbio,
        'Salmonella and Shigella Culture', true),
    new BCHMicrobioCode('YERSINIACULTURE', microbio, 'Yersinia Culture', true),
  ];

  // Visible for testing.
  static respiratoryGroupMB = [
    new BCHMicrobioCode(
        'ADENOVIRUSPCRRESPQUAL', microbio, 'Adenovirus PCR, Resp, QuaL', true),
    new BCHMicrobioCode(
        'INFLUENZAABRSVPCRWASUBTYPEQUAL', microbio,
        'Influenza A/B, RSV PCR w/A Subtype, QuaL', true),
    new BCHMicrobioCode(
        'RESPIRATORYCULTUREANDGRAMSTAIN', microbio,
        'Respiratory Culture and Gram Stain', true),
    new BCHMicrobioCode(
        'VIRALDFARESPIRATORY', microbio, 'Viral DFA Respiratory', true),
    new BCHMicrobioCode(
        'PARAINFLUENZA1DFA', microbio, 'Parainfluenza 1 DFA', true),
    new BCHMicrobioCode(
        'PARAINFLUENZA123DFA', microbio, 'Parainfluenza 1, 2, 3 DFA', true),
    new BCHMicrobioCode(
        'PARAINFLUENZA2DFA', microbio, 'Parainfluenza 2 DFA', true),
    new BCHMicrobioCode(
        'PARAINFLUENZA3DFA', microbio, 'Parainfluenza 3 DFA', true),
  ];

  // Visible for testing.
  static otherGroupMB = [
    new BCHMicrobioCode(
        'AFBCULTUREANDSTAIN', microbio, 'AFB Culture and Stain', true),
    new BCHMicrobioCode(
        'ANAEROBICCULTURE', microbio, 'Anaerobic Culture', true),
    new BCHMicrobioCode(
        'ASPERGILLUSGALACTOMANNANEIA', microbio,
        'Aspergillus galactomannan EIA', true),
    new BCHMicrobioCode(
        'CMVSHELLVIALCULTURE', microbio, 'CMV Shell Vial Culture', true),
    new BCHMicrobioCode(
        'CATHETERTIPTUBINGFOREIGNBODYCULTURE', microbio,
        'Catheter Tip/Tubing/Foreign Body Culture', true),
    new BCHMicrobioCode(
        'FLUIDCULTUREANDGRAMSTAIN', microbio, 'Fluid Culture and Gram Stain',
        true),
    new BCHMicrobioCode('FUNGUSCULTURE', microbio, 'Fungus Culture', true),
    new BCHMicrobioCode('KOHFUNGALSTAIN', microbio, 'KOH Fungal Stain', true),
    new BCHMicrobioCode(
        'TISSUECULTUREANDGRAMSTAIN', microbio, 'Tissue Culture and Gram Stain',
        true),
    new BCHMicrobioCode('VZVDFA', microbio, 'VZV DFA', true),
    new BCHMicrobioCode(
        'VIRALCULTURENONRESPIRATORY', microbio,
        'Viral Culture, Non Respiratory', true),
    new BCHMicrobioCode(
        'WOUNDCULTUREANDGRAMSTAIN', microbio, 'Wound Culture and Gram Stain',
        true),
    new BCHMicrobioCode('HSVDFA', microbio, 'HSV DFA', true),
    new BCHMicrobioCode(
        'HERPESSIMPLEXVIRUS12PCRQUAL', microbio,
        'Herpes Simplex Virus 1/2 PCR, QuaL', true),
  ];

  private static bloodGroupMB = [
    new BCHMicrobioCode(
        'ADENOVIRUSPCRQUANT', microbio, 'Adenovirus PCR, QuaNT', true),
    new BCHMicrobioCode(
        'BLOODCULTUREROUTINEAEROBIC', microbio,
        'Blood Culture Routine, Aerobic', true),
    new BCHMicrobioCode(
        'BLOODCULTUREAEROBICANDANAEROBIC', microbio,
        'Blood Culture, Aerobic and Anaerobic', true),
    new BCHMicrobioCode(
        'BLOODCULTUREFUNGUS', microbio, 'Blood Culture, Fungus', true),
    new BCHMicrobioCode(
        'CYTOMEGALOVIRUSPCRQUANT', microbio, 'Cytomegalovirus PCR, QuaNT',
        true),
    new BCHMicrobioCode(
        'EPSTEINBARRVIRUSPCRQUANT', microbio, 'Epstein-Barr Virus PCR, QuaNT',
        true),
  ];

  private static csfGroupMB = [
    new BCHMicrobioCode(
        'CSFCULTUREANDGRAMSTAIN', microbio, 'CSF Culture and Gram Stain', true),
    new BCHMicrobioCode(
        'ENTEROVIRUSPCRCSFQUAL', microbio, 'Enterovirus PCR, CSF, QuaL', true)
  ];

  // TODO- Issue #30: Add more codes to DiagnosticReportCode as we get more data
  // The values 'RADRPT' and 'CT Report' are not actually in the official FHIR
  // documentation, but are seen in the Cerner sandbox.
  private static radiologyGroup = [
    new DiagnosticReportCode('RADRPT', radiology, 'Radiology Report', true),
    new DiagnosticReportCode('CT Report', radiology, 'CT Report', true)
  ];

  private static typeToPairs: Array<[DisplayGrouping, LOINCCode[]]> =
      [[vitalSign, ResourceCodeManager.vitalLoincs]];

  private static bpLoinc =
      new LOINCCode('41904-4', vitalSign, 'Blood Pressure Location', true);

  constructor(private sanitizer: DomSanitizer) {}

  private addStaticGroups(
      mapping: Map<DisplayGrouping, AxisGroup[]>,
      fhirService: FhirService): Map<DisplayGrouping, AxisGroup[]> {
    const codeGroups = new Array<AxisGroup>();
    // All the labs and vitals are linecharts and displayed on
    // independent axes.
    for (const [conceptGroup, codePairs] of ResourceCodeManager.typeToPairs) {
      for (const loinc of codePairs) {
        codeGroups.push(new AxisGroup([new Axis(
            fhirService, this.sanitizer,
            new LOINCCodeGroup(
                fhirService, loinc.label, new Array(loinc), conceptGroup,
                ChartType.LINE),
            loinc.label)]));
      }
    }

    const bpLocation = new LOINCCodeGroup(
        fhirService, 'Blood Pressure Details', [ResourceCodeManager.bpLoinc],
        vitalSign, ChartType.SCATTER);
    // Add the blood pressure LOINCs.
    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new LOINCCodeGroup(
            fhirService, 'Blood Pressure', bloodPressureLoincs, vitalSign,
            ChartType.LINE,
            (observation: Observation, dateRange: Interval):
                Promise<AnnotatedObservation> => {
                  return bpLocation.getResourceSet(dateRange).then(obsSet => {
                    return AnnotatedObservation.forBloodPressure(
                        observation,
                        // We only pass in the first ObservationSet,
                        // since we know there is only one code whose
                        // observations we care about.
                        obsSet[0]);
                  });
                }),
        'Blood Pressure')]));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new DiagnosticReportCodeGroup(
            fhirService, 'Radiology', ResourceCodeManager.radiologyGroup,
            radiology, ChartType.DIAGNOSTIC),
        'Radiology')]));

    const medsSummaryGroup = RXNORM_CODES;
    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new RxNormCodeGroup(
            fhirService, 'Vancomycin & Gentamicin Summary', medsSummaryGroup,
            med, ChartType.STEP),
        'Vancomycin & Gentamicin Summary')]));

    // Drug monitoring should be a scatterplot, and the related concepts
    // should be displayed on the same axes.
    const vancRxNorm = new RxNormCodeGroup(
        fhirService, 'Administrations', [RxNormCode.fromCodeString('11124')],
        med, ChartType.SCATTER);

    // Drug monitoring should be a scatterplot, and the related concepts
    // should be displayed on the same axes.
    const vancMonitoring = [
      vancRxNorm,
      new LOINCCodeGroup(
          fhirService, 'Monitoring', ResourceCodeManager.vancMonitoring, med,
          ChartType.SCATTER,
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
                fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Vancomycin'));

    const gentMonitoring = [
      new RxNormCodeGroup(
          fhirService, 'Administrations',
          [RxNormCode.fromCodeString('1596450')], med, ChartType.SCATTER),
      new LOINCCodeGroup(
          fhirService, 'Monitoring', ResourceCodeManager.gentMonitoring, med,
          ChartType.SCATTER)
    ];

    codeGroups.push(new AxisGroup(
        gentMonitoring.map(
            codeGroup => new Axis(
                fhirService, this.sanitizer, codeGroup, codeGroup.label)),
        'Gentamicin'));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            fhirService, 'Stool', ResourceCodeManager.stoolGroupMB, microbio,
            ChartType.MICROBIO),
        'Stool')]));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            fhirService, 'Respiratory', ResourceCodeManager.respiratoryGroupMB,
            microbio, ChartType.MICROBIO),
        'Respiratory')]));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            fhirService, 'Other', ResourceCodeManager.otherGroupMB, microbio,
            ChartType.MICROBIO),
        'Other')]));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            fhirService, 'Blood', ResourceCodeManager.bloodGroupMB, microbio,
            ChartType.MICROBIO),
        'Blood')]));

    codeGroups.push(new AxisGroup([new Axis(
        fhirService, this.sanitizer,
        new BCHMicrobioCodeGroup(
            fhirService, 'CSF Microbiology', ResourceCodeManager.csfGroupMB,
            microbio, ChartType.MICROBIO),
        'CSF Microbiology')]));

    for (const group of codeGroups) {
      if (mapping.has(group.displayGroup)) {
        mapping.get(group.displayGroup).push(group);
      } else {
        mapping.set(group.displayGroup, [group]);
      }
    }
    return mapping;
  }


  /**
   * Returns the ResourceCodeGroups to be displayed. If the maps have already
   * been constructed, returns the static variable holding the information.
   * If not, constructs the maps and saves them into the static class
   * variable, then returns.
   */
  private getResourceCodeGroups(
      fhirService: FhirService,
      resourceCodeCreator: ResourceCodeCreator): Promise<AxisGroup[]> {
    return resourceCodeCreator.loadConfigurationFromFiles.then(
        (configuration: ConceptConfiguration) => {
          const codeGroups = new Array<AxisGroup>();
          configuration.getDisplayGroupNameToCodeList().forEach(
              (conceptList: LOINCCode[], groupName: string) => {
                const groups = configuration.getGroupNameToChartInfo();
                let chartType = ChartType.LINE;
                let sameAxis = false;
                if (groups.has(groupName)) {
                  const displayGroup = groups.get(groupName);
                  chartType = displayGroup[0];
                  sameAxis = displayGroup[1];
                }
                const axes = [];
                if (sameAxis) {
                  axes.push(new Axis(
                      fhirService, this.sanitizer,
                      new LOINCCodeGroup(
                          fhirService, groupName, conceptList, labResult,
                          chartType)));
                } else {
                  conceptList.forEach((concept) => {
                    axes.push(new Axis(
                        fhirService, this.sanitizer,
                        new LOINCCodeGroup(
                            fhirService, concept.label, [concept], labResult,
                            chartType),
                        concept.label));
                  });
                }
                codeGroups.push(new AxisGroup(axes, groupName));
              });
          return codeGroups;
        });
  }

  /**
   * Returns a map where the key is a clinical concept group and the value is
   * a list of axis groups belonging to the clinical concept group.
   */
  getDisplayGroupMapping(
      fhirService: FhirService, resourceCodeCreator: ResourceCodeCreator):
      Promise<Map<DisplayGrouping, AxisGroup[]>> {
    return this.getResourceCodeGroups(fhirService, resourceCodeCreator)
        .then((axisGroups) => {
          let mapping = new Map<DisplayGrouping, AxisGroup[]>();
          for (const group of axisGroups) {
            if (mapping.has(group.displayGroup)) {
              mapping.get(group.displayGroup).push(group);
            } else {
              mapping.set(group.displayGroup, [group]);
            }
          }
          // A shim to make the two paradigms work together-- add in
          // statically declared groups after we're done resolving.
          mapping = this.addStaticGroups(mapping, fhirService);

          return mapping;
        });
  }
}
