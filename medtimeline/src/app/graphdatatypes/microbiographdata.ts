// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';

import {AnnotatedDiagnosticReport} from '../fhir-data-classes/annotated-diagnotic-report';
import {DiagnosticReport} from '../fhir-data-classes/diagnostic-report';
import {MicrobioTooltip} from '../graphtypes/tooltips/microbio-tooltips';
import {CHECK_RESULT_CODE} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

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
      diagnosticReports: DiagnosticReport[],
      sanitizer: DomSanitizer): MicrobioGraphData {
    const points: LabeledSeries[] = [];

    const tooltipMap = new Map<string, string>();

    for (const report of diagnosticReports) {
      // Get the timestamp from the collection time of the specimen.
      const specimen = report.specimen;
      if (specimen) {
        const annotatedReport = new AnnotatedDiagnosticReport(report);
        for (const series of LabeledSeries.fromDiagnosticReport(
                  report, annotatedReport.timestamp)) {
          points.push(series);
          const isAbnormal = series.label.includes(CHECK_RESULT_CODE);
          const color = series.legendInfo.fill;
          // For this tooltip, the keys are timestamps.
          if (tooltipMap.has(annotatedReport.timestamp.toMillis().toString())) {
            const existingTT =
                tooltipMap.get(annotatedReport.timestamp.toMillis().toString());
            tooltipMap.set(
                annotatedReport.timestamp.toMillis().toString(),
                existingTT +
                    new MicrobioTooltip(false, color).getTooltip(
                        annotatedReport, sanitizer, isAbnormal));
          } else {
            tooltipMap.set(
                annotatedReport.timestamp.toMillis().toString(),
                new MicrobioTooltip(true, color).getTooltip(
                        annotatedReport, sanitizer, isAbnormal));
          }
        }
      }
    }

    return new MicrobioGraphData(points, tooltipMap);
  }
}
