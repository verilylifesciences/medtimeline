// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Input, Output, ViewChild} from '@angular/core';
import {DateTime, Interval} from 'luxon';
import {FhirService} from 'src/app/fhir.service';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';
import {GraphComponent} from 'src/app/graphtypes/graph/graph.component';


@Component({
  selector: 'app-customizable-timeline',
  templateUrl: './customizable-timeline.component.html',
  styleUrls: ['./customizable-timeline.component.css']
})

/**
 * The customizable timeline lets the user plot any events they'd like to keep
 * track of as little flags along a timeline.
 */
export class CustomizableTimelineComponent {
  // The GraphComponent this card holds.
  @ViewChild(GraphComponent) containedGraph!: GraphComponent<GraphData>;

  // The unique ID for this displayed card.
  @Input() id: string;

  // Over which time interval the card should display data
  @Input() dateRange: Interval;

  // An event indicating that the event lines displayed on all other charts need
  // to be updated.
  // The format of each object in the array is an object representing a line
  // drawn on the chart, that has a value, text, and class field. The value
  // field represents the x-position of the line to be drawn, while the class
  // represents the class name, and the text represents the text displayed near
  // the line.
  @Output()
  updateEventLines =
      new EventEmitter<Array<{[key: string]: number | string}>>();

  // The data for the graph contained.
  data: CustomizableData;

  // Whether or not this CustomizableTimeline is being edited.
  inEditMode = false;

  constructor(private fhirService: FhirService) {
    // We need to initialize the data with a point so that the c3 chart can show
    // the x-axis with the dates (otherwise, it turns up blank). This date is
    // the earliest possible date: Tuesday, April 20th, 271,821 BCE.
    this.data = CustomizableData.fromInitialPoint(
        DateTime.fromJSDate(new Date(-8640000000000000)), 0,
        new CustomizableGraphAnnotation(), fhirService);
    this.renderContainedGraph();
  }

  // Render the contained graph in the event of a resize.
  renderContainedGraph() {
    if (this.containedGraph && this.containedGraph.chart) {
      this.inEditMode = false;
      this.containedGraph.regenerateChart();
    }
  }

  // Listens for an event indicating that the points on the CustomizableGraph
  // have been changed, and emits an event with the modified eventlines
  // displayed on all other charts.
  pointsChanged($event) {
    const times = Array.from($event.annotations.keys())
                      .map(x => Number(x))
                      .sort((a, b) => a - b);

    // Remove the first point (with the earliest possible date) that was added
    // in order to display the x-axis.
    times.shift();
    const eventlines = times.map(x => {
      return {
        value: x,
        text: $event.annotations.get(x).title,
        class: 'color' + $event.annotations.get(x).color.hex().replace('#', '')
      };
    });
    this.updateEventLines.emit(eventlines);
  }

  // Switch to editing mode.
  private edit() {
    this.inEditMode = true;
  }

  // Switch from editing mode.
  private save() {
    this.inEditMode = false;
  }
}
