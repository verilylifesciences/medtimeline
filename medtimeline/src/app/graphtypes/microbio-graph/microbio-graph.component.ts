// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

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

  prepareForChartConfiguration() {
    super.prepareForChartConfiguration();
    // Make the points a little bigger for microbio series since there is info
    // encoded in their point styling.
    for (const series of this.chartData) {
      series.pointRadius = 5;
      series.pointBorderWidth = 2;
    }
  }
}
