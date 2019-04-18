// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, forwardRef, Inject} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

import {GraphComponent} from '../graph/graph.component';
import {LineGraphComponent} from '../linegraph/linegraph.component';

@Component({
  selector: 'app-scatterplot',
  templateUrl: '../graph/graph.component.html',
  styleUrls: ['../graph.css'],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => ScatterplotComponent)
  }]
})
export class ScatterplotComponent extends LineGraphComponent {
  constructor(
      sanitizer: DomSanitizer,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    super(sanitizer, uiConstants);
    this.chartTypeString = 'scatter';
  }
}
