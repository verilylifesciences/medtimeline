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
  // An event indicating that the points on the CustomizableGraph have changed.
  @Output() pointsChanged = new EventEmitter<CustomizableData>();
  @Input() inEditMode: boolean;
  // Kept around for compatibility with the custom timeline. To be removed.
  @Input() dateRange: Interval;

  // The reference for the Dialog opened.
  private dialogRef: any;

  renderedChart: RenderedCustomizableChart;
  chartConfiguration: c3.ChartConfiguration;

  constructor(readonly sanitizer: DomSanitizer, public dialog: MatDialog) {
    super(sanitizer);
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
      (this.renderedChart as RenderedCustomizableChart).inEditMode =
          changes.inEditMode.currentValue;
    } else {
      this.generateChart();
    }
  }

  generateChart() {
    super.generateChart();
    // Once the chart is rendered, only display the data points in the current
    // date range. This is due to a C3 bug that plots some points
    // outside of the x-axis/y-axis boundaries upon loading additional data.
    this.loadNewData();
    // Update the annotations displayed for this chart.
    this.updateAnnotations();
  }

  // This function loads the data into the chart without needing the chart to be
  // re-rendered completely. We only load data that is strictly within the date
  // range being displayed on the chart, due to a C3 bug that plots some points
  // outside of the x-axis/y-axis boundaries.
  private loadNewData() {
    const columnsToLoad: any = [['x_'], ['']];
    const entireInterval = Interval.fromDateTimes(
        this.dateRange.start.toLocal().startOf('day'),
        this.dateRange.end.toLocal().endOf('day'));
    for (let i = 1; i < this.data.c3DisplayConfiguration.allColumns[0].length;
         i++) {
      // Only add the data to the array being loaded if it is within the date
      // range.
      if (entireInterval.contains(
              this.data.c3DisplayConfiguration.allColumns[0][i])) {
        columnsToLoad[0].push(
            this.data.c3DisplayConfiguration.allColumns[0][i]);
        columnsToLoad[1].push(0);
      }
    }
    (this.renderedChart as RenderedCustomizableChart)
        .loadNewData(columnsToLoad);
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
    const xCoordinate = (this.renderedChart as RenderedCustomizableChart)
                            .getClickCoordinate(clickCoordinates[0]);
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
              .addAnnotation(this.renderedChart as RenderedCustomizableChart);
          // Add listeners for click events on the new annotation.
          this.addDeleteEvent(userSelectedDate.toMillis());
          this.addEditListener(userSelectedDate.toMillis());
        }
        this.loadNewData();
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
    const entireInterval = Interval.fromDateTimes(
        this.dateRange.start.toLocal().startOf('day'),
        this.dateRange.end.toLocal().endOf('day'));
    if (chartedPoints.length > 0) {
      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = timestamps[i];
        // Only add the annotation if the chart point is displayed given the
        // date range selected.
        if (entireInterval.contains(DateTime.fromMillis(timestamp))) {
          this.data.annotations.get(timestamp).addAnnotation(
              this.renderedChart as RenderedCustomizableChart);
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
      (self.renderedChart as RenderedCustomizableChart).hoveringOverPoint =
          true;
    };
    this.chartConfiguration.tooltip = {show: false};
    this.chartConfiguration.data.onmouseout = function(d) {
      // Add a timeout to ensure that the user can't add a point immediately
      // after moving away from an existing point.
      setTimeout(() => {
        (self.renderedChart as RenderedCustomizableChart).hoveringOverPoint =
            false;
      }, 500);
    };
    this.chartConfiguration.data.onclick = function(d, element) {
      (self.renderedChart as RenderedCustomizableChart).hoveringOverPoint =
          true;
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
    (this.renderedChart as RenderedCustomizableChart)
        .initialize(
            (coords: [number, number], parentCoords: [number, number]) =>
                this.addPoint(coords, parentCoords));
  }
}
