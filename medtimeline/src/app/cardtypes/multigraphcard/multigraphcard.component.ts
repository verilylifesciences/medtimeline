// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChildren} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Color} from 'color';
import {Interval} from 'luxon';
import {DisplayGrouping} from 'src/app/clinicalconcepts/display-grouping';
import {ResourceCodesForCard} from 'src/app/clinicalconcepts/resource-code-manager';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';

import {FhirService} from '../../fhir.service';
import {ChartType, GraphComponent} from '../../graphtypes/graph/graph.component';
import * as Colors from '../../theme/bch_colors';
import {Card} from '../card';

/**
 * This card holds a label, one or more graphs on one or more axes, and a
 * dragger handle.
 */
@Component({
  selector: 'app-multigraphcard',
  styleUrls: ['../legendstyles.css'],
  templateUrl: './multigraphcard.html',
})

export class MultiGraphCardComponent implements OnInit, OnChanges {
  // The GraphComponents this card holds.
  @ViewChildren(GraphComponent)
  containedGraphs!: QueryList<GraphComponent<GraphData>>;

  @Input() id: string;

  // Over which time interval the card should display data
  @Input() dateRange: Interval;

  // The ResourceCodeGroups displayed on this card.
  @Input() resourceCodeGroups: ResourceCodesForCard;

  /** Propogate remove events up to the card container.  */
  @Output() onRemove = new EventEmitter();

  // An error message if there's an error in data retrieval.
  // TODO(b/119878664): Surface any errors in the UI.
  private readonly errorMessage: string;

  // The label for this graphcard.
  label: string;

  /**
   * The units text for this card. Blank if the axes have more than one unit.
   */
  unitsLabel = '';

  // Holds the color corresponding to this card.
  color: Color =
      Colors.BOSTON_WARM_GRAY;  // Default color for a card component.

  // The Card holding the Axes to display on this MultiGraphCard.
  card: Card;

  // Hold an instance of this enum so the HTML template can reference it.
  ChartType: typeof ChartType = ChartType;

  // Holds a timer for when the chart should be resized.
  private resizeTimer;
  private readonly RESIZE_WAIT = 250;

  // Holds the display groups for the legend.
  uniqueDisplayGroups = new Array<DisplayGrouping>();

  readonly userEditable = false;

  constructor(
      private fhirService: FhirService, private sanitizer: DomSanitizer) {}

  ngOnInit() {
    this.initializeData();
  }

  private initializeData() {
    this.card = new Card(
        this.fhirService, this.resourceCodeGroups.resourceCodeGroups,
        this.dateRange, this.sanitizer);
    if (this.resourceCodeGroups) {
      this.label = this.resourceCodeGroups.label;
      this.color = this.resourceCodeGroups.displayGrouping.fill;
      this.getLabelText().then(lblText => {
        this.unitsLabel = lblText;
      });
    }
  }

  // Any time the data range changes, we need to re-request the data for the
  // specified range.
  ngOnChanges(changes: SimpleChanges) {
    const dateRangeChange = changes['dateRange'];
    if (dateRangeChange.previousValue !== dateRangeChange.currentValue) {
      this.initializeData();
    }
  }

  // This function is called upon resize to re-render all the contained graphs
  // so they snap to the correct size.
  renderContainedGraphs() {
    const self = this;
    const unique = new Set<DisplayGrouping>();
    if (this.containedGraphs) {
      // Wait until the resize is "done" to re-render each graph. This reduces
      // choppy, computationally expensive re-renders as elements resize.
      clearTimeout(this.resizeTimer);
      this.resizeTimer = setTimeout(() => {
        self.containedGraphs.forEach(graph => {
          graph.regenerateChart();
          Array.from(graph.displayGroupToSeries.keys()).forEach(group => {
            unique.add(group);
          });
        });
        this.uniqueDisplayGroups = Array.from(unique.keys());
      }, this.RESIZE_WAIT);
    }
  }

  /**
   * Gets the label text for this card. If the axes have all matching units,
   * it returns the units; otherwise it returns a blank string.
   */
  getLabelText(): Promise<string> {
    return Promise.all(this.card.axes.map(axis => axis.getDataFromFhir()))
        .then(dataArray => dataArray.map(data => data.series))
        .then(seriesNestedArray => {
          const flattened: LabeledSeries[] = [].concat(...seriesNestedArray);
          return flattened.map(series => series.unit);
        })
        .then(allUnits => {
          const units = new Set<string>(allUnits);
          if (units.size === 1 && allUnits[0] !== undefined) {
            return ' (' + allUnits[0] + ')';
          } else {
            return '';
          }
        });
  }

  focusOnDisplayGroup(displayGroup: DisplayGrouping) {
    this.containedGraphs.forEach(graph => {
      graph.focusOnDisplayGroup(displayGroup);
    });
  }

  resetChart(displayGroup: DisplayGrouping) {
    this.containedGraphs.forEach(graph => {
      graph.resetChart(displayGroup);
    });
  }

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    this.onRemove.emit(this.id);
  }
}
