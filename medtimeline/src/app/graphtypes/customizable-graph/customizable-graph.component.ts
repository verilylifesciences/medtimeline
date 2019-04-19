// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, forwardRef, Input, OnChanges, OnDestroy, Output, SimpleChanges} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {DomSanitizer} from '@angular/platform-browser';
import {DateTime, Interval} from 'luxon';
// tslint:disable-next-line:max-line-length
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
    GraphComponent<CustomizableData> implements OnChanges, OnDestroy {
  /**
   * An event indicating that the points on the CustomizableGraph have changed.
   */
  @Output() pointsChanged = new EventEmitter<CustomizableData>();
  /**
   * Holds whether this graph is in edit mode.
   */
  @Input() inEditMode: boolean;

  /**
   * The reference for the Dialog opened.
   */
  private dialogRef: any;


  constructor(readonly sanitizer: DomSanitizer, public dialog: MatDialog) {
    super(sanitizer);
    this.chartTypeString = 'scatter';
  }

  ngOnDestroy() {
    if (this.dialogRef && this.dialogRef.unsubscribe) {
      // Destroy the dialog ref to prevent memory leaks.
      this.dialogRef.unsubscribe();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    super.ngOnChanges(changes);
    // TODO(shilpakumar): Handle edit mode.
    if (changes.dateRange) {
      // CustomizableGraph needs to update annotations in the case that the date
      // range is changed.
      this.dateRangeChanged();
    }
  }
  adjustGeneratedChartConfiguration() {
    const self = this;
    this.chartOptions.scales.yAxes[0].display = false;
    this.chartOptions.scales.yAxes[0].ticks.beginAtZero = true;
    this.chartOptions.tooltips = {enabled: false};
    this.chartOptions.onClick = function(event) {
      if (!self.inEditMode) {
        return;
      }
      const xValueMoment =
          this.scales[GraphComponent.X_AXIS_ID].getValueForPixel(event.offsetX);
      const dateClicked = DateTime.fromJSDate(xValueMoment.toDate());
      const currentInterval = Interval.fromDateTimes(
          self.dateRange.start.toLocal().startOf('day'),
          self.dateRange.end.toLocal().endOf('day'));
      if (currentInterval.contains(dateClicked)) {
        self.openDialog(dateClicked);
      }
    };
    this.chartOptions.onHover = function(event) {
      if (!self.inEditMode) {
        return;
      }
      const chart: any = this;
      const yScale = chart.scales[GraphComponent.Y_AXIS_ID];
      const xScale = chart.scales[GraphComponent.X_AXIS_ID];
      const currentDate =
          DateTime.fromJSDate(xScale.getValueForPixel(event.offsetX).toDate());
      const currentDateString = currentDate.toLocaleString() + ' ' +
          currentDate.toLocal().toLocaleString(DateTime.TIME_24_SIMPLE);

      const currentInterval = Interval.fromDateTimes(
          self.dateRange.start.toLocal().startOf('day'),
          self.dateRange.end.toLocal().endOf('day'));

      // Remove all other ctx lines drawn, to only show one hover line.
      chart.clear();
      chart.draw();

      // Only display the hover line if the date it represents is within the
      // current date range. This is because the chart is slightly larger than
      // the area contained within the axes, and a line could potentially be
      // shown before the x-axis starts, or after it ends.
      if (currentInterval.contains(currentDate)) {
        chart.ctx.beginPath();
        chart.ctx.moveTo(event.offsetX, 0);
        chart.ctx.strokeStyle = '#A0A0A0';
        chart.ctx.lineTo(event.offsetX, yScale.bottom);
        chart.ctx.stroke();
        chart.ctx.fillText(currentDateString, event.offsetX, yScale.bottom / 2);
      }
    };
    this.chartOptions.animation = {
      onComplete: function(chart) {
        self.removeAnnotations();
        self.addAnnotations();
      }
    };
  }

  dateRangeChanged() {
    this.reloadChart();
    this.adjustGeneratedChartConfiguration();
  }

  private addAnnotations() {
    for (const dataPt of this.chartData[0].data) {
      const canvas = document.getElementById(this.chartDivId);
      const millis = DateTime.fromISO(dataPt['x']).toMillis();
      const annotation = this.data.annotations.get(millis);
      const color = annotation.color ? annotation.color : '#000000';
      // We need to cast this.chart.chart as any so we can access the 'scales'
      // property.
      const xOffset = (this.chart.chart as any)
                          .scales[GraphComponent.X_AXIS_ID]
                          .getPixelForValue(annotation.timestamp.toJSDate());
      const yOffset = (this.chart.chart as any)
                          .scales[GraphComponent.Y_AXIS_ID]
                          .margins['bottom'];
      const yAxisHeight =
          (this.chart.chart as any).scales[GraphComponent.Y_AXIS_ID].height;
      const heightToUse =
          this.findBestYCoordinate(xOffset, yAxisHeight, yOffset);
      const difference = heightToUse - yOffset;

      // Only display the flag if the date it represents is within the
      // current date range. This is so that the flag is not added to a
      // location on the DOM that is not within the chart.
      if (this.entireInterval.contains(DateTime.fromMillis(millis).toLocal())) {
        const tooltip = this.findOrCreateTooltipElement(
            canvas, 'annotation-' + this.chartDivId + millis);
        tooltip.setAttribute(
            'class', 'tooltip-whole-' + this.chartDivId + millis);
        tooltip.style.borderLeftColor = color;
        tooltip.style.bottom = yOffset + 'px';
        tooltip.style.left = xOffset + 'px';
        tooltip.style.height = heightToUse + 'px';
        while (tooltip.firstChild) {
          tooltip.removeChild(tooltip.firstChild);
        }
        tooltip.onclick = (e: MouseEvent) => {
          const parent = tooltip.parentNode;
          // TODO(b/123935165): Find a better way to handle the errors.
          try {
            parent.appendChild(tooltip);
          } catch (e) {
            console.log(e);
          }
        };

        tooltip.appendChild(
            annotation.addAnnotation(this.chartDivId, difference));
        this.addDeleteEvent(annotation);
        this.addEditListener(annotation);
      }
    }
  }

  private removeAnnotations() {
    const selector = 'tooltip-whole-' + this.chartDivId;
    for (const annotation of Array.from(
             document.querySelectorAll('[class*=' + selector + ']'))) {
      annotation.remove();
    }
  }

  private findBestYCoordinate(
      xOffset: number, yAxisHeight: number, yOffset: number): number {
    const annotationWidth = 100;
    const verticalOverlap = 10;
    const horizontalOverlap = 20;
    const selector = 'tooltip-whole-' + this.chartDivId;
    const allFlags =
        Array.from(document.querySelectorAll('[class*=' + selector + ']'));
    const positions = allFlags.map(flag => {
      const htmlFlag = flag as HTMLElement;
      return {
        left: Number(htmlFlag.style.left.replace('px', '')),
        height: Number(htmlFlag.style.height.replace('px', '')),
      };
    });
    const overlappingYs = [];
    // Check if there are any annotations with horizontal overlap.
    for (const position of positions) {
      const leftPosition = position.left + annotationWidth;
      if (xOffset <= leftPosition &&
          (xOffset + annotationWidth >= position.left)) {
        overlappingYs.push(position.height);
      }
    }

    // Figure out the new y-coordinate for the annotation.
    let heightToUse = yOffset;
    // Sort all heights in increasing order.
    overlappingYs.sort(function(a, b) {
      return a - b;
    });
    // By default, try putting the new box above all other annotations with
    // horizontal overlap.
    if (overlappingYs.length > 0) {
      const currentMaxHeight = overlappingYs[overlappingYs.length - 1];
      // Only add height if the annotation does not go past the y axis height.
      if (currentMaxHeight + verticalOverlap <= yAxisHeight) {
        heightToUse = currentMaxHeight + verticalOverlap;
      } else {
        heightToUse = currentMaxHeight;
      }
    }
    // Check if there is any position with space available between existing
    // annotations.
    for (let i = 0; i < overlappingYs.length; i++) {
      // Check if there is enough space.
      if (overlappingYs[i + 1] - (overlappingYs[i] + annotationWidth) >=
          horizontalOverlap) {
        heightToUse = overlappingYs[i];
      }
    }
    return heightToUse;
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
  addPoint(timestamp: DateTime) {
    if (this.inEditMode) {
      this.dialogRef = this.openDialog(timestamp);
    }
  }

  private openDialog(
      timestamp: DateTime, editedAnnotation?: CustomizableGraphAnnotation) {
    // Make the dialog show up near where the user clicked.
    const data = editedAnnotation ? {
      title: editedAnnotation.title,
      date: new Date(editedAnnotation.timestamp.toMillis()),
      description: editedAnnotation.description,
      color: editedAnnotation.color,
      dateRange: this.dateRange,
    } :
                                    {
                                      date: timestamp,
                                      dateRange: this.dateRange,
                                    };

    this.dialogRef =
        this.dialog.open(CustomizableTimelineDialogComponent, {data: data});
    this.dialogRef.afterClosed().subscribe(r => {
      if (r) {
        if (editedAnnotation) {
          this.data.removePointFromSeries(
              DateTime.fromMillis(editedAnnotation.timestamp.toMillis()));
          editedAnnotation.removeAnnotation(this.chartDivId);
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
        this.pointsChanged.emit(this.data);
        this.generateChart();

        // Record the user adding an event on a CustomizableTimeline to Google
        // Analytics.
        (<any>window).gtag('event', 'addEventCustomTimeline', {
          'event_category': 'customTimeline',
          'event_label': new Date().toDateString()
        });
      }
    });
  }

  /**
   * Add a listener for a click event on the delete button of the annotation at
   * the given time.
   * @param annotation The annotation for this point to remove.
   */
  private addDeleteEvent(annotation: CustomizableGraphAnnotation) {
    annotation.deleteIcon.onclick = ((e: MouseEvent) => {
      this.data.removePointFromSeries(annotation.timestamp);
      annotation.removeAnnotation(this.chartDivId);
      this.pointsChanged.emit(this.data);
      this.generateChart();
    });
  }

  /**
   * Add a listener for a click event on the edit button of the annotation at
   * the given time.
   * Visible only for testing.
   * @param annotation The annotation for the point to edit.
   */
  addEditListener(annotation: CustomizableGraphAnnotation) {
    annotation.editIcon.onclick = ((e: MouseEvent) => {
      this.dialogRef = this.openDialog(annotation.timestamp, annotation);
      // Record the user editing an event on a CustomizableTimeline to Google
      // Analytics.
      (<any>window).gtag('event', 'editEventCustomTimeline', {
        'event_category': 'customTimeline',
        'event_label': new Date().toDateString()
      });
    });
  }
}
