// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

// tslint:disable-next-line:max-line-length
import {Component, EventEmitter, Input, OnChanges, OnInit, Output, QueryList, SimpleChanges, ViewChildren} from '@angular/core';
import * as Color from 'color';
import {DateTime, Interval} from 'luxon';
import {GraphData} from 'src/app/graphs/graphdatatypes/graphdata';
import {LabeledSeries} from 'src/app/graphs/graphdatatypes/labeled-series';
import {AxisGroup} from 'src/app/graphs/graphtypes/axis-group';
import {LegendInfo} from 'src/app/graphs/graphtypes/legend-info';
import {recordGoogleAnalyticsEvent} from 'src/constants';

import {ChartType, GraphComponent} from '../../graphs/graphtypes/graph/graph.component';
import {LineGraphComponent} from '../../graphs/graphtypes/linegraph/linegraph.component';
import * as Colors from '../../theme/verily_colors';

/**
 * This card holds a label, one or more graphs on one or more axes, and a
 * dragger handle.
 */
@Component({
  selector: 'app-multigraphcard',
  styleUrls: ['../legendstyles.css', './multigraphcard.component.css'],
  templateUrl: './multigraphcard.html',
})
export class MultiGraphCardComponent implements OnChanges, OnInit {
  /** The GraphComponents this card holds. */
  @ViewChildren(GraphComponent)
  containedGraphs!: QueryList<GraphComponent<GraphData>>;

  @Input() id: string;

  /**
   *  The date range to use for graphs in this card
   */
  @Input() dateRange: Interval;

  /**
   * The AxisGroup displayed on this card.
   */
  @Input() axisGroup: AxisGroup;

  /**
   * The format of each object in the array is an object representing a line
   * drawn on the chart, that has a value, text, and class field. The value
   * field represents the x-position of the line to be drawn, while the class
   * represents the class name, and the text represents the text displayed near
   * the line.
   */
  @Input() eventlines: Array<{[key: string]: number | string}>;

  /** The x-regions to draw for this graph. */
  xRegions: Array<[DateTime, DateTime]>;

  /** Propogate remove events up to the card container.  */
  @Output() removeEvent = new EventEmitter();

  /**
   * The label for this graphcard.
   */
  label: string;

  /**
   * The units text for this card. Blank if the axes have more than one unit.
   */
  unitsLabel = '';

  /** Holds the color corresponding to this card. */
  color: Color = Colors.BLUE_GREY_500;  // Default color for a card component.

  /** Hold an instance of this enum so the HTML template can reference it. */
  ChartType: typeof ChartType = ChartType;

  /**
   * Maps legend categories to the corresponding series so that when you hover
   * over a legend category, it can highlight all the corresponding series.
   */
  readonly legendToSeries = new Map<LegendInfo, LabeledSeries[]>();

  /**
   * Sets up the class variables that are dependent on the @Input parameter to
   * this component, resourceCodeGroups.
   * @throws An Error if ResourceCodeGroups is undefined or contains mixed
   *     clinical concepts.
   */
  ngOnInit() {
    if (!this.axisGroup) {
      throw Error(
          'All MultiGraphCardComponents are expected to have an AxisGroup ' +
          ' as the data source, but none provided for card id ' + this.id);
    }
    this.label = this.axisGroup.label;
    this.color = this.axisGroup.displayGroup.fill;
  }

  ngOnChanges(changes: SimpleChanges) {
    const dateRange = changes.dateRange;
    if (dateRange && dateRange.previousValue !== dateRange.currentValue) {
      this.loadNewData();
    }
  }

  private addSeriesToLegendMap(series: LabeledSeries) {
    // We do not want to add the normalBound series to the legend
    if (series.legendInfo.label ===
        LineGraphComponent.NORMAL_BOUND_SERIES_NAME) {
      return;
    }
    if (!this.legendToSeries.has(series.legendInfo)) {
      this.legendToSeries.set(series.legendInfo, []);
    }
    const added: LabeledSeries[] = this.legendToSeries.get(series.legendInfo);
    added.push(series);

    this.legendToSeries.set(series.legendInfo, added);
  }

  private loadNewData() {
    Promise
        .all(this.axisGroup.axes.map(
            axis => axis.updateDateRange(this.dateRange)))
        .then(axisData => {
          this.getLabelText().then(lblText => {
            this.unitsLabel = lblText;
          });

          // Gather a list of all the unique legends and series displayed.
          this.legendToSeries.clear();
          for (const data of axisData) {
            for (const series of data.series) {
              this.addSeriesToLegendMap(series);
            }
          }

          // Kick off the promise to get all the x-regions. It will update
          // the class variable and then everything bound to it will update,
          // too.
          this.getAllXRegions();
        });
  }

  /**
   * Gets the label text for this card. If the axes have all matching units,
   * it returns the units; otherwise it returns a blank string.
   */
  private getLabelText(): Promise<string> {
    return Promise
        .all(this.axisGroup.axes.map(
            axis => axis.updateDateRange(this.dateRange)))
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
   * Gets all the X regions for the axes contained in this group.
   */
  private getAllXRegions() {
    return Promise.all(this.axisGroup.axes.map(axis => axis.getXRegions()))
        .then(nestedXRegions => {
          this.xRegions = [].concat(...nestedXRegions);
        });
  }

  /**
   * If the axes on this card have different units, make sure that each
   * axis displays its units on the y-axis, for clarity.
   */
  private updateAxisLabels() {
    for (const axis of this.axisGroup.axes) {
      axis.updateDateRange(this.dateRange).then(axisData => {
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
   * Returns true if any of the LabeledSeries passed in has a datapoint
   * in the time range.
   * This is just a convenience function because this can't be evaluated
   * directly in the Angular template.
   */
  hasData(labeledSeries: LabeledSeries[]) {
    return labeledSeries.map(s => s.hasPointInRange(this.dateRange))
        .some(s => s === true);
  }

  /**
   * Highlights the listed series in any graph they appear in for this card.
   */
  focusOnSeries(labeledSeries: LabeledSeries[]) {
    this.containedGraphs.forEach(graph => {
      graph.focusOnSeries(labeledSeries);
    });
  }

  /**
   * Removes highlight from any series on this card.
   */
  resetChart() {
    this.containedGraphs.forEach(graph => {
      graph.resetChart();
    });
  }

  // The events below need to get propogated up to the card container.

  /**
   *  Called when the user clicks the trashcan button on the card.
   */
  remove() {
    // We do not add a 'value' field because there is no internal value that
    // needs to be restored when the user reverts a deletion.
    this.removeEvent.emit({id: this.id});
    recordGoogleAnalyticsEvent('deleteConcept', 'deleteCard', this.label);
  }
}
