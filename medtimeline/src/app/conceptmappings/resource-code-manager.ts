// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {BCHMicrobioCode, BCHMicrobioCodeGroup} from '../clinicalconcepts/bch-microbio-code';
import {DiagnosticReportCodeGroup} from '../clinicalconcepts/diagnostic-report-code';
import {antibiotics, antifungals, antivirals, DisplayGrouping, labResult, microbio, radiology} from '../clinicalconcepts/display-grouping';
import {LOINCCodeGroup} from '../clinicalconcepts/loinc-code';
import {LOINCCode} from '../clinicalconcepts/loinc-code';
import {ResourceCode, ResourceCodeGroup} from '../clinicalconcepts/resource-code-group';
import {RxNormCodeGroup} from '../clinicalconcepts/rx-norm-group';
import {FhirService} from '../fhir.service';
import {Axis} from '../graphtypes/axis';
import {AxisGroup} from '../graphtypes/axis-group';
import {ChartType} from '../graphtypes/graph/graph.component';

import {ANNOTATION_CONFIGURATION} from './annotation-mapping';
import {ResourceCodeCreator} from './resource-code-creator';

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
  /**
   * A Promise that when resolved returns a Map from DisplayGrouping to
   * the list of AxisGroups that belong to that display group.
   */
  private displayGroupMapping: Promise<Map<DisplayGrouping, AxisGroup[]>>;

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

  constructor(private sanitizer: DomSanitizer) {}

  private addStaticGroups(
      mapping: Map<DisplayGrouping, AxisGroup[]>,
      fhirService: FhirService): Map<DisplayGrouping, AxisGroup[]> {
    const codeGroups = new Array<AxisGroup>();

    // TODO(laurendukes): Re-implement summary cards & monitoring for meds.
    // const medsSummaryGroup = RXNORM_CODES;
    // codeGroups.push(new AxisGroup([new Axis(
    //     fhirService, this.sanitizer,
    //     new RxNormCodeGroup(
    //         fhirService, 'Vancomycin & Gentamicin Summary', medsSummaryGroup,
    //         med, ChartType.STEP),
    //     'Vancomycin & Gentamicin Summary')]));

    // // Drug monitoring should be a scatterplot, and the related concepts
    // // should be displayed on the same axes.
    // const vancRxNorm = new RxNormCodeGroup(
    //     fhirService, 'Administrations', [RxNormCode.fromCodeString('11124')],
    //     med, ChartType.SCATTER);

    // // Drug monitoring should be a scatterplot, and the related concepts
    // // should be displayed on the same axes.
    // const vancMonitoring = [
    //   vancRxNorm,
    //   new LOINCCodeGroup(
    //       fhirService, 'Monitoring', ResourceCodeManager.vancMonitoring, med,
    //       ChartType.SCATTER,
    //       (observation: Observation, dateRange: Interval):
    //           Promise<AnnotatedObservation> => {
    //             return vancRxNorm.getResourceSet(dateRange).then(rxNorms => {
    //               // We know that we're only pushing in one RxNorm
    //               // so it's safe to grab the first (and only) one in
    //               // the list.
    //               return AnnotatedObservation.forMedicationMonitoring(
    //                   observation, rxNorms[0].orders);
    //             });
    //           })
    // ];

    // codeGroups.push(new AxisGroup(
    //     vancMonitoring.map(
    //         codeGroup => new Axis(
    //             fhirService, this.sanitizer, codeGroup, codeGroup.label)),
    //     'Vancomycin'));

    // const gentMonitoring = [
    //   new RxNormCodeGroup(
    //       fhirService, 'Administrations',
    //       [RxNormCode.fromCodeString('1596450')], med, ChartType.SCATTER),
    //   new LOINCCodeGroup(
    //       fhirService, 'Monitoring', ResourceCodeManager.gentMonitoring, med,
    //       ChartType.SCATTER)
    // ];

    // codeGroups.push(new AxisGroup(
    //     gentMonitoring.map(
    //         codeGroup => new Axis(
    //             fhirService, this.sanitizer, codeGroup, codeGroup.label)),
    //     'Gentamicin'));

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
   * Creates an AxisGroup for a group of concepts.
   * Determines ResourceCodeGroup type from the displayGrouping passed in.
   *
   * @param displayGrouping DisplayGroup to create ResourceCodeGroups with
   * @param fhirService FhirService to create ResourceCodeGroups with
   * @param chartType ChartType to create ResourceCodeGroups with
   * @param sameAxis Whether all the concepts should be shown on the same axis
   *     or not.
   * @param groupName The label for the AxisGroup
   * @param conceptList List of concepts to be included in the AxisGroup.
   */
  private createResourceGroups<R extends ResourceCode>(
      displayGrouping: DisplayGrouping, fhirService: FhirService,
      chartType: ChartType, sameAxis: boolean, groupName: string,
      conceptList: R[]): ResourceCodeGroup[] {
    const axisGroups = new Map<string, R[]>();
    // if all concepts should be shown on the same axis, we only have one axis
    // that contains all concepts from the concept list.
    if (sameAxis) {
      axisGroups.set(groupName, conceptList);

      // otherwise we need an axis for each concept with the label being the
      // concept's label.
    } else {
      conceptList.forEach(concept => {
        axisGroups.set(concept.label, [concept]);
      });
    }

    const resourceGroups = new Array<ResourceCodeGroup>();
    axisGroups.forEach((concepts, label) => {
      let group;
      if (displayGrouping === radiology) {
        group = new DiagnosticReportCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else if (displayGrouping === microbio) {
        group = new BCHMicrobioCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else if ([antibiotics, antifungals, antivirals].includes(
                     displayGrouping)) {
        group = new RxNormCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else {
        group = new LOINCCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      }
      resourceGroups.push(group);
    });
    return resourceGroups;
  }

  /**
   * Creates all AxisGroups.
   * @param resourceGroupMap Mapping from Axis Group label to the list of
   *     ResourceCodeGroups that should be included in the axis group.
   * @param fhirService FhirService to create Axes with.
   * @returns List of AxisGroups
   */
  private createAxisGroups(
      resourceGroupMap: Map<string, ResourceCodeGroup[]>,
      fhirService: FhirService): AxisGroup[] {
    const axisGroups = new Array<AxisGroup>();
    resourceGroupMap.forEach((resourceGroupList, groupName) => {
      // some resources are creating only for the purpose of annotations. These
      // have an undefined chartType. We filter these resource groups out
      // because they should not be included in AxisGroups.
      const axes =
          resourceGroupList
              .filter(resourceGroup => resourceGroup.chartType !== undefined)
              .map(
                  resourceGroup => new Axis(
                      fhirService, this.sanitizer, resourceGroup,
                      resourceGroup.label));
      if (axes.length > 0) {
        axisGroups.push(new AxisGroup(axes, groupName));
      }
    });
    return axisGroups;
  }

  /**
   * Creates a mapping of group names to a list of ResourceCodeGroups.
   * Creates all ResourceCodes and ResourceCodeGroups according to the
   * ResourceCodeCreator.
   *
   * @param fhirService the FhirService instance to create ResourceCodeGroups
   *     with.
   * @param resourceCodeCreator: ResourceCodeCreator instance
   * @returns Promise that when resolves gives a mapping from group name to
   * the list of ResourceCodeGroups in that group.
   */
  private getResourceCodeGroups<R extends ResourceCode>(
      fhirService: FhirService, resourceCodeCreator: ResourceCodeCreator):
      Promise<Map<string, ResourceCodeGroup[]>> {
    const resourceGroupPromises =
        new Array<Promise<Map<string, ResourceCodeGroup[]>>>();
    resourceCodeCreator.loadConfigurationFromFiles.forEach(
        (configurationPromise, displayGrouping) => {
          resourceGroupPromises.push(
              configurationPromise.then((configuration) => {
                const groupNameToResourceGroups =
                    new Map<string, ResourceCodeGroup[]>();
                const groupsChartInfo = configuration.getGroupNameToChartInfo();
                configuration.getDisplayGroupNameToCodeList().forEach(
                    (conceptList: R[], groupName: string) => {
                      const chartInfo = groupsChartInfo.get(groupName);
                      const chartType =
                          chartInfo ? chartInfo[0] : ChartType.LINE;
                      const sameAxis = chartInfo ? chartInfo[1] : false;
                      const resourceGroups = this.createResourceGroups(
                          displayGrouping, fhirService, chartType, sameAxis,
                          groupName, conceptList);
                      groupNameToResourceGroups.set(groupName, resourceGroups);
                    });
                return groupNameToResourceGroups;
              }));
        });
    return Promise.all(resourceGroupPromises)
        .then((results: Array<Map<string, ResourceCodeGroup[]>>) => {
          // flatten into a single mapping
          const allResourceGroups = new Map<string, ResourceCodeGroup[]>();
          for (const map of results) {
            map.forEach((resourceGroupList, groupName) => {
              allResourceGroups.set(groupName, resourceGroupList);
            });
          }
          return allResourceGroups;
        });
  }

  /**
   * Annotates ResourceCodeGroups that require additional information.
   * All ResourceCodeGroups need to be created before this method is called,
   * otherwise the group to annotate or the reference group may not be
   * created yet.
   *
   * @param: List of all ResourceCodeGroups that were created.
   */
  annotateResourceGroups(resourceGroups: ResourceCodeGroup[]) {
    const allResourceGroups = new Map<string, ResourceCodeGroup>();
    for (const resourceGroup of resourceGroups) {
      allResourceGroups.set(resourceGroup.label, resourceGroup);
    }
    for (const annotation of ANNOTATION_CONFIGURATION) {
      const group = allResourceGroups.get(annotation.groupName);
      const refGroup = allResourceGroups.get(annotation.refGroup);
      if (!group || !refGroup) {
        continue;
      }
      (group as LOINCCodeGroup)
          .setMakeAnnotated(annotation.makeAnnotatedFunction(refGroup));
    }
  }

  /**
   * Returns a map where the key is a clinical concept group and the value is
   * a list of axis groups belonging to the clinical concept group.
   */
  getDisplayGroupMapping(
      fhirService: FhirService, resourceCodeCreator: ResourceCodeCreator):
      Promise<Map<DisplayGrouping, AxisGroup[]>> {
    if (!this.displayGroupMapping) {
      this.displayGroupMapping =
          this.getResourceCodeGroups(fhirService, resourceCodeCreator)
              .then((resourceGroupMap) => {
                // flatten all resource group lists.
                const allResourceGroups =
                    [].concat.apply([], Array.from(resourceGroupMap.values()));
                this.annotateResourceGroups(allResourceGroups);
                const axisGroups =
                    this.createAxisGroups(resourceGroupMap, fhirService);
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
    return this.displayGroupMapping;
  }
}
