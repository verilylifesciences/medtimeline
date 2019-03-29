// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// tslint:disable-next-line:max-line-length
import {Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChildren} from '@angular/core';
import {DomSanitizer} from '@angular/platform-browser';
import {Color} from 'color';
import {DisplayGrouping} from 'src/app/clinicalconcepts/display-grouping';
import {GraphData} from 'src/app/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphdatatypes/labeled-series';
import {AxisGroup} from 'src/app/graphtypes/axis-group';
import {DateTimeXAxis} from 'src/app/graphtypes/graph/datetimexaxis';

import {FhirService} from '../../fhir.service';
import {ChartType, GraphComponent} from '../../graphtypes/graph/graph.component';
import * as Colors from '../../theme/bch_colors';

/**
 * This card holds a label, one or more graphs on one or more axes, and a
 * dragger handle.
 */
@Component({
  selector: 'app-multigraphcard',
  styleUrls: ['../legendstyles.css'],
  templateUrl: './multigraphcard.html',
})
export class MultiGraphCardComponent implements OnChanges, OnInit {
  /** The GraphComponents this card holds. */
  @ViewChildren(GraphComponent)
  containedGraphs!: QueryList<GraphComponent<GraphData>>;

  @Input() id: string;

  /**
   *  The x-axis to use for graphs in this card
   */
  @Input() xAxis: DateTimeXAxis;

  /**
   * The AxisGroup displayed on this card.
   */
  @Input() resourceCodeGroups: AxisGroup;

  /**
   * The format of each object in the array is an object representing a line
   * drawn on the chart, that has a value, text, and class field. The value
   * field represents the x-position of the line to be drawn, while the class
   * represents the class name, and the text represents the text displayed near
   * the line.
   */
  @Input() eventlines: Array<{[key: string]: number | string}>;

  /** Propogate remove up to the card container.  */
  @Output() removeEvent = new EventEmitter();

  /** The label for this graphcard. */
  label: string;

  /**
   * The units text for this card. Blank if the axes have more than one unit.
   */
  unitsLabel = '';

  /** Holds the color corresponding to this card. */
  color: Color =
      Colors.BOSTON_WARM_GRAY;  // Default color for a card component.

  /** Hold an instance of this enum so the HTML template can reference it. */
  ChartType: typeof ChartType = ChartType;

  /** Holds the display groups for the legend. */
  uniqueDisplayGroups = new Array<DisplayGrouping>();

  /** Whether the user can edit parts of this chart. */
  readonly userEditable = false;

  constructor(
      private fhirService: FhirService, private sanitizer: DomSanitizer) {}


  /**
   * Sets up the class variables that are dependent on the @Input parameter to
   * this component, resourceCodeGroups.
   * @throws An Error if ResourceCodeGroups is undefined or contains mixed
   *     clinical concepts.
   */
  ngOnInit() {
    if (!this.resourceCodeGroups) {
      throw Error(
          'All MultiGraphCardComponents are expected to have an AxisGroup ' +
          ' as the data source, but none provided for card id ' + this.id);
    }
    this.label = this.resourceCodeGroups.label;
    this.color = this.resourceCodeGroups.displayGroup.fill;
  }

  ngOnChanges(changes: SimpleChanges) {
    const axisChange = changes['xAxis'];
    if (axisChange && axisChange.previousValue !== axisChange.currentValue) {
      this.loadNewData();
    }
  }

  private loadNewData() {
    Promise
        .all(this.resourceCodeGroups.axes.map(
            axis => axis.updateDateRange(this.xAxis.dateRange)))
        .then(axisData => {
          this.getLabelText().then(lblText => {
            this.unitsLabel = lblText;
          });

          // Set x-regions on each section of the graph.
          this.setRegions();

          this.containedGraphs.forEach(graph => {
            graph.generateFromScratch();
          });
        });
  }

  /**
   * Gets the label text for this card. If the axes have all matching units,
   * it returns the units; otherwise it returns a blank string.
   */
  getLabelText(): Promise<string> {
    return Promise
        .all(this.resourceCodeGroups.axes.map(
            axis => axis.updateDateRange(this.xAxis.dateRange)))
        .then(dataArray => dataArray.map(data => data.series))
        .then(seriesNestedArray => {
          const flattened: LabeledSeries[] = [].concat(...seriesNestedArray);
          return flattened.map(series => series.unit)
              .filter(v => v !== undefined);
        })
        .then(allUnits => {
          const units = new Set<string>(allUnits);
          if (units.size === 1 && allUnits[0] !== undefined) {
            return ' (' + allUnits[0] + ')';
          } else {
            this.updateAxisLabels();
            return '';
          }
        });
  }

  /**
   * If the axes on this card have different units, make sure that each
   * axis displays its units on the y-axis, for clarity.
   */
  updateAxisLabels() {
    for (const axis of this.resourceCodeGroups.axes) {
      axis.updateDateRange(this.xAxis.dateRange).then(axisData => {
        if (axisData && axis.label && axisData.series &&
            axisData.series.length > 0 && axisData.series[0].unit) {
          const units = ' (' + axisData.series[0].unit + ')';
          // Only add units if not done so already.
          if (axis.label.indexOf(units) === -1) {
            axis.label += units;
          }
        }
      });
    }
  }

  /**
   * Get all the regions for the axes on this card, and plot all the regions on
   * every axis of the card.
   */
  setRegions() {
    let allRegions = [];
    const self = this;
    Promise
        .all(this.resourceCodeGroups.axes.map(
            axis => axis.updateDateRange(this.xAxis.dateRange)))
        .then(data => {
          if (data.length > 1) {
            for (const dataAxis of data) {
              if (dataAxis.xRegions) {
                allRegions = allRegions.concat(dataAxis.xRegions);
              }
            }
          }
        })
        .then(x => {
          return Promise
              .all(this.resourceCodeGroups.axes.map(async function(axis) {
                return {
                  data: await axis.updateDateRange(self.xAxis.dateRange),
                  axis: axis
                };
              }))
              .then(d => {
                d.forEach(data => {
                  data.data.xRegions =
                      allRegions.filter(region => (region.axis === 'x'));
                  // TODO(b/129284629): handle this post-rendering
                  data.axis.alreadyResolvedData = data.data;
                });
                this.containedGraphs.forEach(
                    graph => graph.generateFromScratch());
              });
        });
  }

  focusOnDisplayGroup(displayGroup: DisplayGrouping) {
    this.containedGraphs.forEach(graph => {
      graph.focusOnDisplayGroup(displayGroup);
    });
  }

  resetChart() {
    this.containedGraphs.forEach(graph => {
      graph.resetChart();
    });
  }

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    // We do not add a 'value' field because there is no internal value that
    // needs to be restored when the user reverts a deletion.
    this.removeEvent.emit({id: this.id});
  }
}
