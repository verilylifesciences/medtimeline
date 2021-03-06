// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Injectable} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {FhirService} from '../fhir-server/fhir.service';
import {Axis} from '../graphs/graphtypes/axis';
import {AxisGroup} from '../graphs/graphtypes/axis-group';
import {ChartType} from '../graphs/graphtypes/graph/graph.component';

import {ANNOTATION_CONFIGURATION} from './annotation-mapping';
import {GroupConfiguration, ResourceCodeCreator} from './resource-code-creator';
import {BCHMicrobioCode, BCHMicrobioCodeGroup} from './resource-codes/bch-microbio-code';
import {DiagnosticReportCode, DiagnosticReportCodeGroup} from './resource-codes/diagnostic-report-code';
import {antibiotics, antifungals, antivirals, DisplayGrouping, labResult, microbio, radiology} from './resource-codes/display-grouping';
import {LOINCCodeGroup} from './resource-codes/loinc-code';
import {LOINCCode} from './resource-codes/loinc-code';
import {ResourceCode, ResourceCodeGroup} from './resource-codes/resource-code-group';
import {RxNormCode} from './resource-codes/rx-norm';
import {RxNormCodeGroup} from './resource-codes/rx-norm-group';

// We declare a new LOINCCode referencing a DocumentReference, but do not
// include it in the groupings below because it is not graphed/displayed in the
// configuration sidebar.
export const documentReferenceLoinc =
    new LOINCCode('68608-9', undefined, 'Summary', true);

/**
 * ResourceCodeManager is the centralized class where other components can
 * look to find an exhaustive listing of all the resource code groups that the
 * application may display.
 */
@Injectable()
export class ResourceCodeManager {
  /** Keep the same group mapping across instances. */
  private static displayGroupMapping:
      Promise<Map<DisplayGrouping, AxisGroup[]>>;

  constructor(private sanitizer: DomSanitizer) {}

  /**
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

      if (concepts[0] instanceof LOINCCode) {
        group = new LOINCCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else if (concepts[0] instanceof RxNormCode) {
        group = new RxNormCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else if (concepts[0] instanceof DiagnosticReportCode) {
        group = new DiagnosticReportCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      } else if (concepts[0] instanceof BCHMicrobioCode) {
        group = new BCHMicrobioCodeGroup(
            fhirService, label, concepts, displayGrouping, chartType);
      }
      if (group) {
        resourceGroups.push(group);
      }
    });
    return resourceGroups;
  }

  /**
   * Creates all AxisGroups.
   * @param resourceGroupMap Mapping from Axis Group label to the list of
   *     ResourceCodeGroups that should be included in the axis group.
   * @param fhirService FhirService to create Axes with.
   * @param resourceCodeCreator ResourceCodeCreator to get the group
   *     configurations
   * @returns List of AxisGroups
   */
  private createAxisGroups(
      resourceGroupMap: Map<string, ResourceCodeGroup[]>,
      fhirService: FhirService,
      resourceCodeCreator: ResourceCodeCreator): Promise<AxisGroup[]> {
    return resourceCodeCreator.loadAllGroups.then(groupConfigurationMapping => {
      // mapping of Axis group name to the list of axes in that group. Axes
      // may come from different resource Groups in the case of medications so
      // we need to keep track of the mapping and create the axis group after
      // creating all of the axes.
      const axisGroupMapping = new Map<string, Axis[]>();
      resourceGroupMap.forEach((resourceGroupList, groupName) => {
        // some resources are creating only for the purpose of annotations.
        // These have an undefined chartType. We filter these resource groups
        // out because they should not be included in AxisGroups.
        const axes =
            resourceGroupList
                .filter(resourceGroup => resourceGroup.chartType !== undefined)
                .map(
                    resourceGroup => new Axis(
                        fhirService, this.sanitizer, resourceGroup,
                        resourceGroup.label));
        if (axes.length > 0) {
          let axisGroupName = groupName;
          const groupConfig = groupConfigurationMapping.get(groupName);
          // if a Resource Group has a parent group (such as Medication
          // Administrations and Medication Monitoring), we want the Axis Group
          // name to be the parent group's name.
          if (groupConfig && groupConfig.parentGroupName) {
            axisGroupName = groupConfig.parentGroupName;
          }

          if (!axisGroupMapping.has(axisGroupName)) {
            axisGroupMapping.set(axisGroupName, new Array<Axis>());
          }
          axisGroupMapping.get(axisGroupName).push(...axes);
        }
      });
      const axisGroups = new Array<AxisGroup>();
      axisGroupMapping.forEach((axisList, axisGroupName) => {
        // if the group is in the group configuration mapping, we use that
        // display group. Otherwise we leave the display group to be inferred
        // during AxisGroup creation.
        const displayGroup = groupConfigurationMapping.has(axisGroupName) ?
            groupConfigurationMapping.get(axisGroupName).displayGrouping :
            undefined;
        axisGroups.push(new AxisGroup(axisList, axisGroupName, displayGroup));
      });
      return axisGroups;
    });
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
    return resourceCodeCreator.loadAllConcepts.then(
        (groupConfigurationToResourceCodes) => {
          const groupNameToResourceGroups =
              new Map<string, ResourceCodeGroup[]>();
          groupConfigurationToResourceCodes.forEach(
              (codeList: R[], config: GroupConfiguration) => {
                const resourceGroups = this.createResourceGroups(
                    config.displayGrouping, fhirService, config.chartType,
                    config.showOnSameAxis, config.groupName, codeList);
                groupNameToResourceGroups.set(config.groupName, resourceGroups);
              });
          return groupNameToResourceGroups;
        });
  }

  /**
   * Annotates ResourceCodeGroups that require additional information.
   * All ResourceCodeGroups need to be created before this method is called,
   * otherwise the group to annotate or the reference group may not be
   * created yet.
   * @param: List of all ResourceCodeGroups that were created.
   */
  annotateResourceGroups(resourceGroups: Map<string, ResourceCodeGroup[]>) {
    for (const annotation of ANNOTATION_CONFIGURATION) {
      const groups = resourceGroups.get(annotation.groupName);
      const refGroup = resourceGroups.get(annotation.refGroup);
      if ((!groups || !refGroup) || (refGroup.length > 1)) {
        continue;
      }
      for (const group of groups) {
        // Right now we only support annotating LOINCCodeGroups; could be
        // extended in the future.
        if (group instanceof LOINCCodeGroup) {
          group.setMakeAnnotated(annotation.makeAnnotatedFunction(refGroup[0]));
        }
      }
    }
  }

  /**
   * Returns a map where the key is a clinical concept group and the value is
   * a list of axis groups belonging to the clinical concept group.
   */
  getDisplayGroupMapping(
      fhirService: FhirService, resourceCodeCreator: ResourceCodeCreator):
      Promise<Map<DisplayGrouping, AxisGroup[]>> {
    if (!ResourceCodeManager.displayGroupMapping) {
      ResourceCodeManager.displayGroupMapping =
          this.getResourceCodeGroups(fhirService, resourceCodeCreator)
              .then((resourceGroupMap) => {
                this.annotateResourceGroups(resourceGroupMap);
                return this
                    .createAxisGroups(
                        resourceGroupMap, fhirService, resourceCodeCreator)
                    .then(axisGroups => {
                      const mapping = new Map<DisplayGrouping, AxisGroup[]>();
                      for (const group of axisGroups) {
                        if (mapping.has(group.displayGroup)) {
                          mapping.get(group.displayGroup).push(group);
                        } else {
                          mapping.set(group.displayGroup, [group]);
                        }
                      }
                      return mapping;
                    });
              });
    }
    return Promise.resolve(ResourceCodeManager.displayGroupMapping);
  }
}
