// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Interval} from 'luxon';

import {DisplayGrouping, negFinalMB, negPrelimMB, posFinalMB, posPrelimMB} from '../clinicalconcepts/display-grouping';
import {DiagnosticReport, DiagnosticReportStatus} from '../fhir-data-classes/diagnostic-report';
import {MedicationOrder, MedicationOrderSet} from '../fhir-data-classes/medication-order';
import {CHECK_RESULT_CODE, NEG_CODE, NEGFLORA_CODE} from '../fhir-data-classes/observation-interpretation-valueset';

import {GraphData} from './graphdata';
import {LabeledSeries} from './labeled-series';

/**
 * StepGraphData holds configurations for a step graph. A step graph displays
 * one or more LabeledSeries.
 */

export class StepGraphData extends GraphData {
  // The spacing between discrete values on the y-axis.
  private static readonly Y_AXIS_SPACING = 10;

  /** A list of the LabeledSeries data to plot. */
  readonly dataSeries: LabeledSeries[];

  /** A list of the LabeledSeries representing end points. */
  readonly endpointSeries: LabeledSeries[];

  /**
   * The DisplayGroups (for example, lab results, vital signs, medications)
   * associated with particular series. We use this to make a custom legend
   * for the graph.
   */
  readonly seriesToDisplayGroup = new Map<LabeledSeries, DisplayGrouping>();

  /**
   * Maps a series' ID to its corresponding MedicationOrder or DiagnosticReport.
   */
  readonly idMap = new Map<string, MedicationOrder|DiagnosticReport>();

  /**
   * The chart type (scatter, line, etc) of each series displayed on the
   * stepgraph.
   */
  readonly types: {[key: string]: string} = {};

  /**
   * The map of y values to discrete labels to display on the y axis of the
   * stepgraph.
   */
  readonly yAxisMap = new Map<number, string>();


  private constructor(
      dataSeries: LabeledSeries[], endpointSeries: LabeledSeries[],
      yAxisMap: Map<number, string>,
      seriesToDisplayGroup?: Map<LabeledSeries, DisplayGrouping>,
      idMap?: Map<string, MedicationOrder|DiagnosticReport>) {
    super(dataSeries);
    this.endpointSeries = endpointSeries;
    this.yAxisMap = yAxisMap;
    this.seriesToDisplayGroup = seriesToDisplayGroup;
    this.idMap = idMap;
  }

  /**
   * Converts a list of MedicationOrderSets to a StepGraphData object.
   * @param medicationOrderListGroup A list of MedicationOrderSets to display.
   * @returns a new StepGraphData for this observation set.
   * @throws Error if the observations in observationGroup have different units.
   */
  static fromMedicationOrderSetList(
      medicationOrderListGroup: MedicationOrderSet[],
      dateRange: Interval): StepGraphData {
    const data: LabeledSeries[] = [];
    const endpoints: LabeledSeries[] = [];
    // Give labels to each series and make a map of x-values to y-values.
    const yAxisMap = new Map<number, string>();
    let currYPosition = StepGraphData.Y_AXIS_SPACING;
    const seriesToDisplayGroup = new Map<LabeledSeries, DisplayGrouping>();
    const idMap = new Map<string, MedicationOrder>();
    medicationOrderListGroup = medicationOrderListGroup.sort((a, b) => {
      return a.resourceList[a.resourceList.length - 1]
                 .lastAdmininistration.timestamp.toMillis() -
          b.resourceList[b.resourceList.length - 1]
              .lastAdmininistration.timestamp.toMillis();
    });

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

        // Set up maps of the series to the concepts for the custom legend.
        seriesToDisplayGroup.set(
            endpointSeries, medOrder.rxNormCode.displayGrouping);
        seriesToDisplayGroup.set(
            administrationSeries, medOrder.rxNormCode.displayGrouping);

        idMap.set(administrationSeries.label, medOrder);
      }
      currYPosition += StepGraphData.Y_AXIS_SPACING;
    }
    return new StepGraphData(
        data, endpoints, yAxisMap, seriesToDisplayGroup, idMap);
  }

  /**
   * Converts a list of DiagnosticReports to a StepGraphData object.
   * All DiagnosticReports in the list should belong to the same culture type.
   * @param diagnosticReports A list of DiagnosticReports to display.
   * @returns a new StepGraphData for this set.
   */
  static fromDiagnosticReports(
      diagnosticReports: DiagnosticReport[],
      cultureType: string): StepGraphData {
    // TODO(b/121266814): Make constants or enum for cultureType.
    const points: LabeledSeries[] = [];
    // We keep the yAxisMap mapping y-axis positions to labels to be consistent
    // with other forms of StepGraphData.
    const yAxisMap = new Map<number, string>();
    let currYPosition = StepGraphData.Y_AXIS_SPACING;
    const idMap = new Map<string, DiagnosticReport>();
    const seriesToDisplayGroup = new Map<LabeledSeries, DisplayGrouping>();
    // We create a master y-axis map mapping discrete labels (Observation
    // displays) to y-values. This must be uniform across all DiagnosticReports.
    for (const report of diagnosticReports) {
      for (const observation of report.results) {
        if (!Array.from(yAxisMap.values()).includes(observation.display)) {
          yAxisMap.set(currYPosition, observation.display);
          currYPosition += StepGraphData.Y_AXIS_SPACING;
        }
      }
    }

    for (const report of diagnosticReports) {
      // Find the specimen in the report with the correct Culture type.
      // We throw an error if there are mutiple specimens of the same type for
      // a DiagnosticReport.
      const seen = new Set();
      const hasDuplicates = report.specimens.some(function(s) {
        return seen.size === seen.add(s.type).size;
      });
      if (hasDuplicates) {
        throw Error('Report has multiple specimens with same type.');
      }
      const specimen = report.specimens.find(s => (s.type === cultureType));
      if (specimen) {
        const collectedTime = specimen.collectedDateTime ?
            specimen.collectedDateTime :
            (specimen.collectedPeriod ? specimen.collectedPeriod.start :
                                        undefined);
        idMap.set(report.id, report);
        const docStatus = report.status;
        for (const series of LabeledSeries.fromDiagnosticReport(
                 report, collectedTime, yAxisMap)) {
          if (series.label.includes(CHECK_RESULT_CODE)) {
            if (docStatus === DiagnosticReportStatus.Preliminary) {
              seriesToDisplayGroup.set(series, posPrelimMB);
            } else if (docStatus === DiagnosticReportStatus.Final) {
              seriesToDisplayGroup.set(series, posFinalMB);
            }
          } else if (
              series.label.includes(NEGFLORA_CODE) ||
              series.label.includes(NEG_CODE)) {
            if (docStatus === DiagnosticReportStatus.Preliminary) {
              seriesToDisplayGroup.set(series, negPrelimMB);
            } else if (docStatus === DiagnosticReportStatus.Final) {
              seriesToDisplayGroup.set(series, negFinalMB);
            }
          }
          points.push(series);
        }
      }
    }

    return new StepGraphData(
        [],  // No series representing "lines" on this chart
        points, yAxisMap, seriesToDisplayGroup, idMap);
  }
}
