// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {AnnotatedDiagnosticReport, DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
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
      endpointSeries: LabeledSeries[], tooltipMap: Map<string, string>) {
    super(endpointSeries, tooltipMap, undefined);
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
    const points: LabeledSeries[] = [];

    const tooltipMap = new Map<string, string>();

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

      const specimen = report.specimens.find(s => (s.type === cultureType));
      if (specimen) {
        const annotatedReport =
            new AnnotatedDiagnosticReport(report, cultureType);
        // For this tooltip, the keys are timestamps.
        tooltipMap.set(
            annotatedReport.timestamp.toMillis().toString(),
            new MicrobioTooltip().getTooltip(annotatedReport, sanitizer));
        for (const series of LabeledSeries.fromDiagnosticReport(
                 report, annotatedReport.timestamp)) {
          points.push(series);
        }
      }
    }

    return new MicrobioGraphData(points, tooltipMap);
  }
}
