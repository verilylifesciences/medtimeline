// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {ChartPoint} from 'chart.js';
import {CHECK_RESULT_CODE, PARTIAL} from 'src/app/fhir-data-classes/observation-interpretation-valueset';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {UI_CONSTANTS_TOKEN} from 'src/constants';
import {WHITE} from 'src/app/theme/verily_colors';

import {GraphComponent} from '../graph/graph.component';
import {StepGraphComponent} from '../stepgraph/stepgraph.component';

@Component({
  selector: 'app-microbio-graph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => MicrobioGraphComponent)
  }]
})
export class MicrobioGraphComponent extends StepGraphComponent {
  constructor(
      sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
  }

  adjustGeneratedChartConfiguration() {
    // Color points that fall outside of their respective normal ranges.
    for (let i = 0; i < this.data.series.length; i++) {
      const chartjsSeries = this.chartData[i];
      const labeledSeries = this.data.series[i];

      const isPositive = labeledSeries.label.includes(CHECK_RESULT_CODE);
      const isPartial = labeledSeries.label.includes(PARTIAL);

      const pointStyle = new Array<string>();
      const pointBackgroundColors = new Array<string>();
      const pointBorderColors = new Array<string>();

      for (let pt of chartjsSeries.data) {
        // pt could also be a number here, so we constrain it to when it's a
        // ChartPoint. For some reason Typescript doesn't like it when we do a
        // test to see if pt is an instanceof ChartPoint so checking for the
        // y-attribute is a workaround.
        pt = pt as ChartPoint;
        // Making positive points be triangular rather than circular
        if (isPositive) {
          pointStyle.push('triangle');
        } else {
          pointStyle.push('circle');
        }
        // Making partial points have an outline rather than filled in
        if (isPartial) {
          pointBackgroundColors.push(WHITE.rgb().string());
          pointBorderColors.push(labeledSeries.legendInfo.outline.rgb().string());
        } else {
          pointBackgroundColors.push(labeledSeries.legendInfo.fill.rgb().string());
          pointBorderColors.push(labeledSeries.legendInfo.outline.rgb().string());
        }
        (chartjsSeries as any).pointStyle = pointStyle;
        (chartjsSeries as any).pointBackgroundColor = pointBackgroundColors;
        (chartjsSeries as any).pointBorderColor = pointBorderColors;
      }
    }
  }
  /***************************
   * Legend interactions
   * Because of the unique nature of the series in the MicrobioGraph, we do not
   * allow legend interactions for microbiology graphs. This prevents errors
   * that occur when the user hovers over a legend element that might correspond
   * to many series on the chart.
   */

  /**
   * @override
   */
  resetChart() {}

  /**
   * @override
   */
  focusOnSeries(labeledSeries: LabeledSeries[]) {}
}
