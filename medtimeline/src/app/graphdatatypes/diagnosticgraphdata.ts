// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';

import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnostic-report';
import {DiagnosticTooltip} from '../graphtypes/tooltips/diagnostic-tooltips';

import {LabeledSeries} from './labeled-series';
import {StepGraphData} from './stepgraphdata';

/**
 * DiagnosticGraphData holds configurations for a diagnosticReport graph. The format
 * of a diagnostic graph is simliar to a step graph in that each y-axis
 * position represents a single modality test, and points plotted along
 * that position represent results for that test.
 */

export class DiagnosticGraphData extends StepGraphData {
  private constructor(
      endpointSeries: LabeledSeries[], tooltipMap: Map<string, string>) {
    super(endpointSeries, tooltipMap, undefined);
  }

  /**
   * Converts a list of DiagnosticReports to a StepGraphData object
   * @param diagnosticReports A list of DiagnosticReports to display.
   * @returns a new DiagnosticGraphData for this set.
   */
  static fromDiagnosticReports(
      diagnosticReports: DiagnosticReport[],
      sanitizer: DomSanitizer): DiagnosticGraphData {
    const points: LabeledSeries[] = [];

    // The key of the map is the DateTime timestamp while the values
    // of the map contain the inner html of the tooltip.
    const tooltipMap = new Map<string, string>();

    // Iterate through diagnosticReports to generate tooltips and
    // values for the DiagnosticGraphData
    for (const report of diagnosticReports) {
      const annotatedReport = new AnnotatedDiagnosticReport(report);
      // Adding a new DiagnosticTooltip to the tooltipMap.
      // If there is already a tooltip at the timestamp, we do not
      // overwrite the existing tooltip but rather add to it.
      if (tooltipMap.has(report.timestamp.toMillis().toString())) {
        const existingTT =
            tooltipMap.get(report.timestamp.toMillis().toString());
        tooltipMap.set(
            report.timestamp.toMillis().toString(),
            existingTT +
                new DiagnosticTooltip(false).getTooltip(
                  annotatedReport, sanitizer));
      } else {
        // If there is no existing tooltip, we create a new tooltip.
        tooltipMap.set(
            report.timestamp.toMillis().toString(),
            new DiagnosticTooltip().getTooltip(
              annotatedReport, sanitizer));
      }
      // Pushing the LabeledSeries generated from the Diagnostic
      // Report to generate a new DiagnosticGraphData
      for (const series of LabeledSeries.fromDiagnosticReport(
            annotatedReport, report.timestamp)) {
        points.push(series);
      }
    }
    return new DiagnosticGraphData(points, tooltipMap);
  }
}
