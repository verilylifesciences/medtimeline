// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {DomSanitizer} from '@angular/platform-browser';
import {CHECK_RESULT_CODE} from 'src/app/fhir-data-classes/observation-interpretation-valueset';

import {AnnotatedMicrobioReport} from '../../fhir-data-classes/annotated-microbio-report';
import {MicrobioReport} from '../../fhir-data-classes/microbio-report';
import {AnnotatedTooltip} from '../graphtypes/tooltips/annotated-tooltip';
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
      endpointSeries: LabeledSeries[],
      tooltipMap: Map<string, AnnotatedTooltip[]>) {
    super(endpointSeries, tooltipMap, undefined);
  }

  /**
   * Converts a list of MicrobioReports to a StepGraphData object.
   * All MicrobioReports in the list should belong to the same culture type.
   * @param microbioReports A list of MicrobioReports to display.
   * @returns a new StepGraphData for this set.
   */
  static fromMicrobioReports(
      microbioReports: MicrobioReport[],
      sanitizer: DomSanitizer): MicrobioGraphData {
    const points: LabeledSeries[] = [];

    const tooltipMap = new Map<string, AnnotatedTooltip[]>();
    for (const report of microbioReports) {
      // Get the timestamp from the collection time of the specimen.
      const specimen = report.specimen;
      if (specimen) {
        const annotatedReport = new AnnotatedMicrobioReport(report);
        for (const series of LabeledSeries.fromMicrobioReport(
                 report, annotatedReport.timestamp)) {
          points.push(series);
          const isAbnormal = series.label.includes(CHECK_RESULT_CODE);
          const color = series.legendInfo.fill;
          // For this tooltip, the keys are timestamps.
          if (tooltipMap.has(annotatedReport.timestamp.toMillis().toString())) {
            tooltipMap.get(annotatedReport.timestamp.toMillis().toString())
                .push(new MicrobioTooltip(false, color)
                          .getTooltip(annotatedReport, sanitizer, isAbnormal));
          } else {
            tooltipMap.set(
                annotatedReport.timestamp.toMillis().toString(),
                [new MicrobioTooltip(true, color)
                     .getTooltip(annotatedReport, sanitizer, isAbnormal)]);
          }
        }
      }
    }

    return new MicrobioGraphData(points, tooltipMap);
  }
}
