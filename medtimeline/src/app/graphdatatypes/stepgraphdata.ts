// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';

import {MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {MedicationTooltip} from '../graphtypes/tooltips/medication-tooltips';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';
import {AnnotatedTooltip} from '../graphtypes/tooltips/annotated-tooltip';

/**
 * StepGraphData holds configurations for a step graph. A step graph displays
 * one or more LabeledSeries.
 */

export class StepGraphData extends GraphData {
  constructor(
      /** A list of the LabeledSeries data to plot. */
      dataSeries: LabeledSeries[],
      /** A list of the LabeledSeries representing end points. */
      // readonly endpointSeries: LabeledSeries[],
      /** A map of tooltips for the data points. */
      tooltipMap: Map<string, AnnotatedTooltip[]>,
      /**
       *  The function to call to get the key for the tooltip map for a point.
       */
      keyFn: (data: string) => string) {
    super(dataSeries, tooltipMap, keyFn);
  }

  /**
   * Converts a list of MedicationOrderSets to a StepGraphData object.
   * @param medicationOrderListGroup A list of MedicationOrderSets to display.
   * @returns a new StepGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different units.
   */
  static fromMedicationOrderSetList(
      medicationOrderListGroup: MedicationOrderSet[], dateRange: Interval,
      sanitizer: DomSanitizer): StepGraphData {
    const data: LabeledSeries[] = [];
    const endpoints: LabeledSeries[] = [];

    medicationOrderListGroup = medicationOrderListGroup.sort((a, b) => {
      return a.resourceList[a.resourceList.length - 1]
                 .lastAdmininistration.timestamp.toMillis() -
          b.resourceList[b.resourceList.length - 1]
              .lastAdmininistration.timestamp.toMillis();
    });

    const tooltipMap = new Map<string, AnnotatedTooltip[]>();
    for (const medOrderSet of medicationOrderListGroup) {
      // Each MedicationOrderSet represents multiple MedicationOrders
      // for the same medicine.
      for (const medOrder of medOrderSet.resourceList) {
        const labeledSeries = LabeledSeries.fromMedicationOrder(
            medOrder, dateRange, medOrder.administrationsForOrder.label);
        const administrationSeries = labeledSeries[0];
        const endpointSeries = labeledSeries[1];
        data.push(administrationSeries);
        endpoints.push(endpointSeries);

        // For this custom tooltip, the key is the series ID, and the value is
        // the medication tooltip that shows the first and last doses for the
        // medication.
        tooltipMap.set(
            medOrderSet.rxNormCode.label.toLowerCase() +
                medOrder.firstAdministration.timestamp,
            [new MedicationTooltip().getTooltip(medOrder, sanitizer)]);
        tooltipMap.set(
            medOrderSet.rxNormCode.label.toLowerCase() +
                medOrder.lastAdmininistration.timestamp,
            [new MedicationTooltip().getTooltip(medOrder, sanitizer)]);
      }
    }
    // Do not display the units for Medication administration values on the card
    // for MedicationSummary.
    for (const series of data) {
      series.unit = undefined;
    }
    for (const series of endpoints) {
      series.unit = undefined;
    }
    return new StepGraphData(
        endpoints,  // do not render medication administrations, only endpoints
        tooltipMap,
        // Our tooltip key here is the drug name plus the timestamp.
        (tooltipContext: any) => {
          const xValue = tooltipContext.dataPoints[0].label;
          const yValue = tooltipContext.dataPoints[0].value;
          return yValue.toLowerCase() +
              DateTime.fromISO(xValue).toMillis().toString();
        });
  }
}
