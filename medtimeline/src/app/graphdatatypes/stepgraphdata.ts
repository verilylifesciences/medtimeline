// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {Interval} from 'luxon';

import {DisplayGrouping, negFinalMB, negPrelimMB, posFinalMB, posPrelimMB} from '../clinicalconcepts/display-grouping';
import {DiagnosticReport, DiagnosticReportStatus} from '../fhir-data-classes/diagnostic-report';
import {MedicationOrder, MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {CHECK_RESULT_CODE, NEG_CODE, NEGFLORA_CODE} from '../fhir-data-classes/observation-interpretation-valueset';
import {MedicationTooltip} from '../graphtypes/tooltips/medication-tooltips';


import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * StepGraphData holds configurations for a step graph. A step graph displays
 * one or more LabeledSeries.
 */

export class StepGraphData extends GraphData {
  // The spacing between discrete values on the y-axis.
  static readonly Y_AXIS_SPACING = 10;

  constructor(
      /** A list of the LabeledSeries data to plot. */
      readonly dataSeries: LabeledSeries[],
      /** A list of the LabeledSeries representing end points. */
      readonly endpointSeries: LabeledSeries[],
      /**
       * The map of y values to discrete labels to display on the y axis of the
       * stepgraph.
       */
      readonly yAxisMap: Map<number, string>, tooltipMap: Map<string, string>,
      keyFn: (data: string) => string) {
    super(dataSeries.concat(endpointSeries), tooltipMap, keyFn);
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
    // Give labels to each series and make a map of x-values to y-values.
    const yAxisMap = new Map<number, string>();
    let currYPosition = StepGraphData.Y_AXIS_SPACING;
    medicationOrderListGroup = medicationOrderListGroup.sort((a, b) => {
      return a.resourceList[a.resourceList.length - 1]
                 .lastAdmininistration.timestamp.toMillis() -
          b.resourceList[b.resourceList.length - 1]
              .lastAdmininistration.timestamp.toMillis();
    });

    const tooltipMap = new Map<string, string>();
    for (const medOrderSet of medicationOrderListGroup) {
      // Each MedicationOrderSet represents multiple MedicationOrders
      // for the same medicine.
      for (const medOrder of medOrderSet.resourceList) {
        const labeledSeries = LabeledSeries.fromMedicationOrder(
            medOrder, dateRange, currYPosition);
        const administrationSeries = labeledSeries[0];
        const endpointSeries = labeledSeries[1];
        data.push(administrationSeries);
        endpoints.push(endpointSeries);
        yAxisMap.set(currYPosition, medOrder.administrationsForOrder.label);

        // For this custom tooltip, the key is the series ID, and the value is
        // the medication tooltip that shows the first and last doses for the
        // medication.
        tooltipMap.set(
            administrationSeries.label,
            new MedicationTooltip().getTooltip(medOrder, sanitizer));
      }
      currYPosition += StepGraphData.Y_AXIS_SPACING;
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
        data, endpoints, yAxisMap, tooltipMap,
        // Our tooltip key here is the series ID, so we pass in a
        // custom key function.
        (seriesObj: any) => {
          return seriesObj.id;
        });
  }
}
