// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file or at
// https://developers.google.com/open-source/licenses/bsd
import {Component, EventEmitter, forwardRef, Input, OnDestroy, Output} from '@angular/core';
import {MatDialog} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';
import * as c3 from 'c3';
import * as d3 from 'd3';
import {DateTime} from 'luxon';
import {CustomizableTimelineDialogComponent} from 'src/app/cardtypes/customizable-timeline/customizable-timeline-dialog/customizable-timeline-dialog.component';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';

import {GraphComponent} from '../graph/graph.component';
import {CustomizableGraphAnnotation} from './customizable-graph-annotation';

@Component({
  selector: 'app-customizable-graph',
  templateUrl: '../graph/graph.component.html',
  styleUrls: [
    '../../cardtypes/customizable-timeline/customizable-timeline.component.css'
  ],
  providers: [{
    provide: GraphComponent,
    useExisting: forwardRef(() => CustomizableGraphComponent)
  }]
})
export class CustomizableGraphComponent extends
    GraphComponent<CustomizableData> implements OnDestroy {
  // An event indicating that the points on the CustomizableGraph have changed.
  @Output() pointsChanged = new EventEmitter<CustomizableData>();
  @Input() inEditMode: boolean;
  // Whether or not the user is hovering over any point on the chart.
  private hoveringOverPoint = false;
  // The width and height of the dialog box that appears when the user clicks on
  // the chart.
  readonly dialogWidth = '450px';
  readonly dialogHeight = '350px';

  // The reference for the Dialog opened.
  private dialogRef: any;

  constructor(readonly sanitizer: DomSanitizer, public dialog: MatDialog) {
    super(sanitizer);
  }

  ngOnDestroy() {
    if (this.dialogRef && this.dialogRef.unsubscribe) {
      // Destroy the dialog ref to prevent memory leaks.
      this.dialogRef.unsubscribe();
    }
  }

  regenerateChart() {
    super.regenerateChart();
    const self = this;
    const chart: any =
        this.chart;  // We need the "any" declaration in order to access the
    // internals of the chart without throwing an error.

    if (!chart) {
      return;
    }
    chart.resize({height: 150});

    // Show a focus line corresponding to the correct x-value when hovering
    // anywhere on the chart.
    chart.internal.main.on('mousemove', function() {
      if (self.inEditMode) {
        const coordinates = d3.mouse(this);
        // Remove all other timestamps
        d3.select(chart.element)
            .select('.c3-xgrid-focus')
            .selectAll('text')
            .remove();
        self.showFocusLine(chart, coordinates);
      }
    });
    // Clear gridlines when not hovering over the chart.
    chart.internal.main.on('mouseout', function() {
      // clear all x-axis gridlines.
      chart.xgrids([]);
      // Remove all other timestamps
      d3.select(chart.element)
          .select('.c3-xgrid-focus')
          .selectAll('text')
          .remove();
    });
    // Logic to add a point when clicking on the chart.
    chart.internal.main.on('click', function() {
      if (self.inEditMode && !self.hoveringOverPoint) {
        const coordinates = d3.mouse(this);
        const parentCoordinates = d3.mouse(document.body);
        self.allowAddingPoints(chart, coordinates, parentCoordinates);
      }
    });
    // Send the chart to the back, allowing points to be displayed on top of the
    // axis.
    const chartLayer = d3.select(chart.element).select('.c3-chart');
    const chartLayerNode: any = chartLayer.node();
    const chartLayerParentNode = chartLayerNode.parentNode;
    const removedNode = chartLayer.remove();
    chartLayerParentNode.appendChild(removedNode.node());
    chartLayer.attr('clip-path', null);

    // Don't show the y-axis, but still set values so that the width is adjusted
    // & aligned with other charts.
    d3.select(chart.element).select('.c3-axis-y').style('visibility', 'hidden');

    // Update the annotations displayed for this chart.
    this.updateAnnotations();
  }

  // This function loads the data into the chart without needing the chart to be
  // re-rendered completely.
  private loadNewData() {
    this.chart.load({columns: this.data.c3DisplayConfiguration.allColumns});
  }

  // If the selected date already has an annotation, modify the time
  // by + 1 millisecond.
  private updateTime(millis: number) {
    if (this.data.annotations.has(millis)) {
      return this.updateTime(millis + 1);
    }
    return millis;
  }

  // Show a focus line with the timestamps when moving the mouse around the
  // chart.
  private showFocusLine(chart: any, coordinates: number[]) {
    const focusEl = d3.select(chart.element).select('line.c3-xgrid-focus');
    focusEl.attr('x1', coordinates[0]);
    focusEl.attr('x2', coordinates[0]);
    const timestamp =
        DateTime.fromJSDate(chart.internal.x.invert(coordinates[0]));
    // See time on hover
    d3.select(chart.element)
        .select('g.c3-xgrid-focus')
        .append('text')
        .attr('text-anchor', 'end')
        .attr('transform', 'rotate(-90)')
        .attr('x', 0)
        .attr('y', coordinates[0])
        .attr('dx', -4)
        .attr('dy', -5)
        .style('opacity', 1)
        .text(
            timestamp.toLocal().toLocaleString() + ' ' +
            timestamp.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE));
  }

  // Allow for the addition of a point to the CustomizableGraph, via a
  // CustomizableTimelineDialog
  private allowAddingPoints(
      chart: any, coordinates: number[], parentCoordinates: number[]) {
    const xCoordinate = chart.internal.x.invert(coordinates[0]);
    const yCoordinate =
        0;  // We want each clicked data point to show up at y=0.

    const dialogCoordinates = this.findDialogCoordinates(
        parentCoordinates[0] + 10, parentCoordinates[1] + 10);

    // Make the dialog show up near where the user clicked.
    this.dialogRef = this.dialog.open(CustomizableTimelineDialogComponent, {
      width: this.dialogWidth,
      height: this.dialogHeight,
      position:
          {top: dialogCoordinates[1] + 'px', left: dialogCoordinates[0] + 'px'},
      data: {date: xCoordinate}
    });
    this.dialogRef.afterClosed().subscribe(r => {
      if (r) {
        const result: CustomizableGraphAnnotation =
            r as CustomizableGraphAnnotation;
        // By default, the user selected date is the original date
        // corresponding to where the user chose to add the point.
        let userSelectedDate = result.timestamp;
        // TODO(b/122371627):  Use UUIDs instead of timestamps to track
        // annotations.
        userSelectedDate =
            DateTime.fromMillis(this.updateTime(userSelectedDate.toMillis()));
        result.timestamp = userSelectedDate;
        this.data.addPointToSeries(yCoordinate, result);
        this.data.annotations.get(userSelectedDate.toMillis())
            .addAnnotation(chart);
        this.loadNewData();
        // Add listeners for click events on the new annotation.
        this.addDeleteEvent(userSelectedDate.toMillis());
        this.addEditEvent(userSelectedDate.toMillis());
        this.pointsChanged.emit(this.data);
      }
    });
  }

  // Updates the annotations displayed on the chart after a new point is added
  // or the date range is changed.
  private updateAnnotations() {
    // We sort the points by timestamp.
    const timestamps = Array.from(this.data.annotations.keys()).sort();
    // Charted points are always sorted by timestamp.
    const chartedPoints = d3.select('#' + this.chartDivId)
                              .select('.c3-circles')
                              .selectAll('circle')
                              .nodes();
    if (chartedPoints.length > 0) {
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        const xPosition = d3.select(chartedPoints[i]).attr('cx');
        // Only add the annotation if the chart point is displayed given the
        // date range selected, and its x-position is greater than 0 (where the
        // y-axis is).
        if (Number(xPosition) >= 0) {
          this.data.annotations.get(timestamp).addAnnotation(this.chart);
          // Add listeners for click events on the new annotation.
          this.addDeleteEvent(timestamp);
          this.addEditEvent(timestamp);
        }
      }
    }
  }

  /**
   * Removes an annotation at the given time from the DOM.
   * @param millis The millis for this point to remove.
   */
  private removeAnnotation(millis: number) {
    d3.select('#' + this.chartDivId)
        .select('tooltip-custom-' + millis)
        .remove();
    d3.select('#' + this.chartDivId)
        .select('tooltip-connector-' + millis)
        .remove();
    this.updateAnnotations();
  }

  /**
   * Add a listener for a click event on the delete button of the annotation at
   * the given time.
   * @param millis The millis for this point to remove.
   */
  private addDeleteEvent(millis: number) {
    const self = this;
    const deleteIcon =
        d3.select('#' + this.chartDivId).select('#delete-' + millis);
    deleteIcon.on('click', function() {
      const time = DateTime.fromMillis(millis);
      self.data.removePointFromSeries(time);
      self.regenerateChart();
      self.pointsChanged.emit(self.data);
    });
  }

  /**
   * Add a listener for a click event on the edit button of the annotation at
   * the given time.
   * @param millis The millis for this point to remove.
   * @param xCoord The x-coordinate of where to show the dialog box.
   * @param yCoord The y-coordinate of where to show the dialog box.
   */
  private addEditEvent(millis: number) {
    const self = this;
    const editIcon = d3.select('#' + this.chartDivId).select('#edit-' + millis);
    const currAnnotation = this.data.annotations.get(millis);

    editIcon.on('click', function() {
      const parentCoordinates = d3.mouse(document.body);
      const dialogCoordinates = self.findDialogCoordinates(
          parentCoordinates[0] + 10, parentCoordinates[1] + 0);
      // Make the dialog show up near where the user clicked.
      self.dialogRef = self.dialog.open(CustomizableTimelineDialogComponent, {
        width: self.dialogWidth,
        height: self.dialogHeight,
        position: {
          top: dialogCoordinates[1] + 'px',
          left: dialogCoordinates[0] + 'px'
        },
        data: {
          title: currAnnotation.title,
          date: new Date(millis),
          description: currAnnotation.description,
          color: currAnnotation.color
        }
      });
      self.dialogRef.afterClosed().subscribe(r => {
        const chart: any = self.chart;
        if (r) {
          const result = r as CustomizableGraphAnnotation;
          // Update the bound data and annotation.
          let userSelectedDate = result.timestamp;
          if (userSelectedDate.toMillis() !== millis) {
            // Update the data point if the date is changed by user.
            // TODO(b/122371627):  Use UUIDs instead of timestamps to track
            // annotations.
            userSelectedDate = DateTime.fromMillis(
                self.updateTime(userSelectedDate.toMillis()));
            // The annotation is removed from the previous time and added to the
            // updated time.
            self.data.removePointFromSeries(DateTime.fromMillis(millis));
            result.timestamp = userSelectedDate;
            self.data.addPointToSeries(0, result);
          } else {
            // If the timestamp does not change, update the annotation in case
            // of changes made to the other fields.
            self.data.annotations.set(millis, result);
          }
          self.pointsChanged.emit(self.data);
          // Remove the annotation from the DOM.
          self.removeAnnotation(millis);
          self.regenerateChart();
        }
      });
    });
  }

  /**
   * Change the coordinates of the dialog's position if the dialog will go past
   * the edges of the screen.
   * @param xCoordinate The x coordinate to change, if necessary.
   * @param yCoordinate The y coordinate to change, if necessary.
   */
  findDialogCoordinates(xCoordinate: number, yCoordinate: number):
      Array<number> {
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const dialogWidth = Number(this.dialogWidth.replace('px', ''));
    const dialogHeight = Number(this.dialogHeight.replace('px', ''));
    if ((xCoordinate + dialogWidth) > windowWidth) {
      xCoordinate -= ((xCoordinate + dialogWidth) - windowWidth);
    }
    if ((yCoordinate + dialogHeight) > windowHeight) {
      yCoordinate -= ((yCoordinate + dialogHeight) - windowHeight);
    }
    return [xCoordinate, yCoordinate];
  }

  /**
   * @returns the c3.ChartConfiguration object to generate the c3 chart.
   * @override
   */
  generateChart(): c3.ChartConfiguration {
    // Give labels to each series and make a map of x-values to y-values.
    const yAxisConfig: c3.YAxisConfiguration = {
      min: 0,
      max: 5,
      padding: {top: 0, bottom: 0},
      tick: {
        count: 5,
        format: d => {
          // We add padding to our y-axis tick labels so that all y-axes of the
          // charts rendered on the page can be aligned.
          return (d)
              .toLocaleString(
                  'en-us', {minimumFractionDigits: 2, maximumFractionDigits: 2})
              .trim()
              .padStart(12, '\xa0');
        }
      }
    };

    const graph = this.generateBasicChart(yAxisConfig);

    graph.axis.x.height = 50;
    graph.data.type = 'scatter';
    graph.zoom = {enabled: false};
    const self = this;
    graph.data.onmouseover = function(d) {
      self.hoveringOverPoint = true;
    };
    graph.tooltip = {show: false};
    graph.transition = {duration: 0};
    graph.data.onmouseout = function(d) {
      // Add a timeout to ensure that the user can't add a point immediately
      // after moving away from an existing point.
      setTimeout(() => {
        self.hoveringOverPoint = false;
      }, 500);
    };
    graph.data.onclick = function(d, element) {
      self.hoveringOverPoint = true;
    };

    graph.data.color = function(color, d) {
      return self.data.annotations.get(DateTime.fromJSDate(d.x).toMillis())
          .color;
    };
    graph.point = {show: true, r: 5, focus: {expand: {enabled: false}}};
    return graph;
  }
}
