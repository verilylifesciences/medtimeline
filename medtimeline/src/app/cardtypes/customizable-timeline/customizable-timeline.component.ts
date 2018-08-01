// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Input, ViewChild} from '@angular/core';
import {DateTime, Interval} from 'luxon';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {GraphComponent} from 'src/app/graphtypes/graph/graph.component';
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/tooltips/tooltip';


@Component({
  selector: 'app-customizable-timeline',
  templateUrl: './customizable-timeline.component.html',
  styleUrls: ['./customizable-timeline.component.css']
})

// TODO(b/120783502): Create class that both CustomizableTimeline and
// MultigraphCard can extend.
export class CustomizableTimelineComponent {
  // The GraphComponent this card holds.
  @ViewChild(GraphComponent) containedGraph!: GraphComponent<GraphData>;

  // The unique ID for this displayed card.
  @Input() id: string;

  // Over which time interval the card should display data
  @Input() dateRange: Interval;

  // The data for the graph contained.
  data: CustomizableData;

  constructor() {
    // We need to initialize the data with a point so that the c3 chart can show
    // the x-axis with the dates (otherwise, it turns up blank). This date is
    // the earliest possible date: Tuesday, April 20th, 271,821 BCE.
    this.data = CustomizableData.fromInitialPoint(
        DateTime.fromJSDate(new Date(-8640000000000000)), 0,
        new CustomizableGraphAnnotation());
  }

  // Render the contained graphs in the event of a resize.
  renderContainedGraph() {
    if (this.containedGraph && this.containedGraph.chart) {
      this.containedGraph.regenerateChart();
    }
  }
}
