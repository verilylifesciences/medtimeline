// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Input} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';

import {ChartType} from '../graph/graph.component';
import {GraphComponent} from '../graph/graph.component';
import {LineGraphComponent} from '../linegraph/linegraph.component';

@Component({
  selector: 'app-scatterplot',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../../cardtypes/cardstyles.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => ScatterplotComponent)
  }]
})
export class ScatterplotComponent extends LineGraphComponent {
  constructor(sanitizer: DomSanitizer) {
    super(sanitizer);
    this.chartType = ChartType.SCATTER;
  }
}
