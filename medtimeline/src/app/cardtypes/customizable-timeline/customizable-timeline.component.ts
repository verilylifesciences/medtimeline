// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// tslint:disable-next-line:max-line-length
import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild} from '@angular/core';
import {Interval} from 'luxon';
import {FhirService} from 'src/app/fhir.service';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {GraphComponent} from 'src/app/graphtypes/graph/graph.component';

/**
 * The customizable timeline lets the user plot any events they'd like to keep
 * track of as little flags along a timeline.
 */
@Component({
  selector: 'app-customizable-timeline',
  templateUrl: './customizable-timeline.component.html',
  styleUrls: ['./customizable-timeline.component.css']
})
export class CustomizableTimelineComponent implements OnChanges {
  // The GraphComponent this card holds.
  @ViewChild(GraphComponent) containedGraph!: GraphComponent<GraphData>;

  // The unique ID for this displayed card.
  @Input() id: string;

  /**
   * The x-axis for this card.
   */
  @Input() dateRange: Interval;
  //  Data stored before deletion of the card. This is separate from this.data
  //  to avoid unnecessary re-rendering of the graph.
  @Input() deletedData: any;

  // An event indicating that the event lines displayed on all other charts need
  // to be updated.
  @Output()
  updateEventLines =
      new EventEmitter<{[key: string]: string | CustomizableData}>();

  /** Propogate remove events up to the card container.  */
  @Output() removeEvent = new EventEmitter();

  // The data for the graph contained.
  data: CustomizableData;

  // Whether or not this CustomizableTimeline is being edited.
  inEditMode = false;

  constructor(private fhirService: FhirService) {
    this.data = CustomizableData.defaultEmptySeries();
    this.renderContainedGraph();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.deletedData && changes.deletedData.currentValue) {
      this.data = this.deletedData;
    }
  }

  // Render the contained graph in the event of a resize.
  renderContainedGraph() {
    if (this.containedGraph) {
      this.inEditMode = false;
      this.containedGraph.generateChart();
    }
  }

  // Listens for an event indicating that the points on the CustomizableGraph
  // have been changed, and emits an event with the modified eventlines
  // displayed on all other charts.
  pointsChanged($event) {
    this.updateEventLines.emit({data: this.data, id: this.id});
  }

  // Called when the user clicks the trashcan button on the card.
  remove() {
    this.removeEvent.emit({id: this.id, value: this.data});
  }
}
