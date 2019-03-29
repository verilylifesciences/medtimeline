// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {DateTime} from 'luxon';

import {AnnotatedDiagnosticReport, DiagnosticReport, DiagnosticReportStatus} from '../fhir-data-classes/diagnostic-report';
import {MicrobioTooltip} from '../graphtypes/tooltips/microbio-tooltips';

import {LabeledSeries} from './labeled-series';
import {StepGraphData} from './stepgraphdata';

/**
 * MicrobioGraphData holds configurations for a microbiology graph. The format
 * of a microbiology graph is simliar to a step graph in that each y-axis
 * position represents a single microbiology test, and points plotted along
 * that position represent results for that test.
 */

export class MicrobioGraphData extends StepGraphData {
  private constructor(
      series: LabeledSeries[], endpointSeries: LabeledSeries[],
      yAxisMap: Map<number, string>, tooltipMap: Map<string, string>,
      keyFn: (data: string) => string,
      /**
       * Maps the report ID to the report status. This is used for custom
       * styling of display points.
       */
      readonly reportIdToStatus: Map<string, DiagnosticReportStatus>) {
    super(series, endpointSeries, yAxisMap, tooltipMap, keyFn);
  }

  /**
   * Converts a list of DiagnosticReports to a StepGraphData object.
   * All DiagnosticReports in the list should belong to the same culture type.
   * @param diagnosticReports A list of DiagnosticReports to display.
   * @returns a new StepGraphData for this set.
   */
  static fromDiagnosticReports(
      diagnosticReports: DiagnosticReport[], cultureType: string,
      sanitizer: DomSanitizer): MicrobioGraphData {
    // TODO(b/121266814): Make constants or enum for cultureType.
    const points: LabeledSeries[] = [];
    // We keep the yAxisMap mapping y-axis positions to labels to be consistent
    // with other forms of StepGraphData.
    let currYPosition = StepGraphData.Y_AXIS_SPACING;
    const yAxisMap = new Map<number, string>();
    const tooltipMap = new Map<string, string>();
    const timestampToId = new Map<string, string>();
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

    const reportIdToStatus = new Map<string, DiagnosticReportStatus>();
    for (const report of diagnosticReports) {
      // Find the specimen in the report with the correct Culture type.
      // We throw an error if there are mutiple specimens of the same type for
      // a DiagnosticReport.
      const seen = new Set();
      const hasDuplicates = report.specimens.some((s) => {
        return seen.size === seen.add(s.type).size;
      });
      if (hasDuplicates) {
        throw Error('Report has multiple specimens with same type.');
      }

      reportIdToStatus.set(report.id, report.status);

      const specimen = report.specimens.find(s => (s.type === cultureType));
      if (specimen) {
        const annotatedReport =
            new AnnotatedDiagnosticReport(report, cultureType);
        // For this tooltip, the keys are report IDs.
        tooltipMap.set(
            report.id,
            new MicrobioTooltip().getTooltip(annotatedReport, sanitizer));
        const ts = annotatedReport.timestamp.toMillis().toString();
        timestampToId.set(ts, report.id);
        for (const series of LabeledSeries.fromDiagnosticReport(
                 report, annotatedReport.timestamp, yAxisMap)) {
          points.push(series);
        }
      }
    }

    return new MicrobioGraphData(
        [],  // No series representing "lines" on this chart
        points, yAxisMap, tooltipMap,
        // Because the keys here are report IDs we have to pass in a custom
        // function to translate the graph's x-values to the appropriate
        // tooltip.
        (reportPoint: any) => {
          return timestampToId.get(
              DateTime.fromJSDate(reportPoint.x).toMillis().toString());
        },
        reportIdToStatus);
  }
}
