// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, forwardRef, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import * as c3 from 'c3';
import * as d3 from 'd3';
import {DateTime, Interval} from 'luxon';
// tslint:disable-next-line:max-line-length
import {CustomizableTimelineDialogComponent} from 'src/app/cardtypes/customizable-timeline/customizable-timeline-dialog/customizable-timeline-dialog.component';
import {CustomizableData} from 'src/app/graphdatatypes/customizabledata';

import {GraphComponent} from '../graph/graph.component';
import {RenderedCustomizableChart} from '../graph/renderedcustomizablechart';

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
    GraphComponent<CustomizableData> implements OnChanges, OnDestroy {
  /**
   * An event indicating that the points on the CustomizableGraph have changed.
   */
  @Output() pointsChanged = new EventEmitter<CustomizableData>();
  /**
   * Holds whether this graph is in edit mode.
   */
  @Input() inEditMode: boolean;

  // The reference for the Dialog opened.
  private dialogRef: any;

  renderedChart: RenderedCustomizableChart;
  chartConfiguration: c3.ChartConfiguration;

  constructor(readonly sanitizer: DomSanitizer, public dialog: MatDialog) {
    super(sanitizer);
    this.chartTypeString = 'scatter';
    const renderedConstructor = (dateRange: Interval, divId: string) =>
        new RenderedCustomizableChart(dateRange, divId);
  }

  ngOnDestroy() {
    if (this.dialogRef && this.dialogRef.unsubscribe) {
      // Destroy the dialog ref to prevent memory leaks.
      this.dialogRef.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.inEditMode && this.renderedChart) {
      this.renderedChart.inEditMode = changes.inEditMode.currentValue;
    }
    super.ngOnChanges(changes);
  }

  adjustGeneratedChartConfiguration() {
    const self = this;

    // Show the time as we hover across the graph.
    this.chartOptions.onHover = function(event) {
      const chart: any = this;
      const yScale = chart.scales[GraphComponent.Y_AXIS_ID];
      const xScale = chart.scales[GraphComponent.X_AXIS_ID];
      const currentDate =
          DateTime.fromJSDate(xScale.getValueForPixel(event.offsetX).toDate());
      const currentDateString = currentDate.toLocaleString() + ' ' +
          currentDate.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE);

      chart.clear();
      chart.draw();
      if (self.dateRange.contains(currentDate)) {
        chart.ctx.beginPath();
        chart.ctx.moveTo(event.offsetX, 0);
        chart.ctx.strokeStyle = '#A0A0A0';
        chart.ctx.lineTo(event.offsetX, yScale.bottom);
        chart.ctx.stroke();
        chart.ctx.fillText(currentDateString, event.offsetX, yScale.bottom / 2);
      }
    };

    // Update the annotations displayed for this chart.
    this.updateAnnotations();
  }

  // If the selected date already has an annotation, modify the time
  // by + 1 millisecond.
  private updateTime(millis: number) {
    if (this.data.annotations.has(millis)) {
      return this.updateTime(millis + 1);
    }
    return millis;
  }

  /**
   * Allow for the addition of a point to the CustomizableGraph, via a
   * CustomizableTimelineDialog.
   * (Visible only for testing.)
   */
  addPoint(clickCoordinates: [number, number], parentCoordinates: [
    number, number
  ]) {
    if (this.inEditMode) {
      this.dialogRef = this.openDialog(clickCoordinates);
    }
  }

  private openDialog(
      clickCoordinates: [number, number],
      editedAnnotation?: CustomizableGraphAnnotation) {
    const xCoordinate =
        this.renderedChart.getClickCoordinate(clickCoordinates[0]);
    // Make the dialog show up near where the user clicked.
    const data = editedAnnotation ? {
      title: editedAnnotation.title,
      date: new Date(editedAnnotation.timestamp.toMillis()),
      description: editedAnnotation.description,
      color: editedAnnotation.color,
      dateRange: this.dateRange,
    } :
                                    {
                                      date: xCoordinate,
                                      dateRange: this.dateRange,
                                    };

    this.dialogRef =
        this.dialog.open(CustomizableTimelineDialogComponent, {data: data});
    this.dialogRef.afterClosed().subscribe(r => {
      if (r) {
        if (editedAnnotation) {
          this.data.removePointFromSeries(
              DateTime.fromMillis(editedAnnotation.timestamp.toMillis()));
          this.removeAnnotation(editedAnnotation.timestamp.toMillis());
          this.generateChart();
        }

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
        this.data.addPointToSeries(result);
        // Only display the annotation if the user selected date is within the
        // current date range.
        const entireInterval = Interval.fromDateTimes(
            this.dateRange.start.toLocal().startOf('day'),
            this.dateRange.end.toLocal().endOf('day'));
        if (entireInterval.contains(userSelectedDate)) {
          this.data.annotations.get(userSelectedDate.toMillis())
              .addAnnotation();
          // Add listeners for click events on the new annotation.
          this.addDeleteEvent(userSelectedDate.toMillis());
          this.addEditListener(userSelectedDate.toMillis());
        }
        this.pointsChanged.emit(this.data);
        this.generateChart();
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
    const entireInterval = Interval.fromDateTimes(
        this.dateRange.start.toLocal().startOf('day'),
        this.dateRange.end.toLocal().endOf('day'));
    if (chartedPoints.length > 0) {
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        // Only add the annotation if the chart point is displayed given the
        // date range selected.
        if (entireInterval.contains(DateTime.fromMillis(timestamp))) {
          this.data.annotations.get(timestamp).addAnnotation();
          // Add listeners for click events on the new annotation.
          this.addDeleteEvent(timestamp);
          this.addEditListener(timestamp);
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
      self.generateCustomChart();
      self.pointsChanged.emit(self.data);
    });
  }

  /**
   * Add a listener for a click event on the edit button of the annotation at
   * the given time.
   * Visible only for testing.
   * @param millis The millis for this point to remove.
   */
  addEditListener(millis: number) {
    const self = this;
    const editIcon = d3.select('#' + this.chartDivId).select('#edit-' + millis);
    const currAnnotation = this.data.annotations.get(millis);

    editIcon.on('click', function() {
      const parentCoordinates = d3.mouse(document.body);
      self.dialogRef = self.openDialog(parentCoordinates, currAnnotation);
    });
  }

  /**
   * @returns the c3.ChartConfiguration object to generate the c3 chart.
   * @override
   */
  generateCustomChart(): c3.ChartConfiguration {
    this.generateChart();

    this.chartConfiguration.data.type = 'scatter';
    const self = this;
    this.chartConfiguration.data.onmouseover = function(d) {
      self.renderedChart.hoveringOverPoint = true;
    };
    this.chartConfiguration.tooltip = {show: false};
    this.chartConfiguration.data.onmouseout = function(d) {
      // Add a timeout to ensure that the user can't add a point immediately
      // after moving away from an existing point.
      setTimeout(() => {
        self.renderedChart.hoveringOverPoint = false;
      }, 500);
    };
    this.chartConfiguration.data.onclick = function(d, element) {
      self.renderedChart.hoveringOverPoint = true;
    };

    this.chartConfiguration.data.color = function(color, d) {
      return self.data.annotations.get(DateTime.fromJSDate(d.x).toMillis())
          .color;
    };
    this.chartConfiguration
        .point = {show: true, r: 5, focus: {expand: {enabled: false}}};
    return this.chartConfiguration;
  }

  // This is not relevant for the CustomizableGraph, so its implementation for
  // this class is empty.
  adjustDataDependent() {}

  onRendered() {
    this.renderedChart.initialize(
        (coords: [number, number], parentCoords: [number, number]) =>
            this.addPoint(coords, parentCoords));
  }
}
