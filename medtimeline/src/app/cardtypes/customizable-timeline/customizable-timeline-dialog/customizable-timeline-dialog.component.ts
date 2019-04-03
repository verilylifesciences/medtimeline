// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject} from '@angular/core';
import {FormControl, Validators} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import * as Color from 'color';
import {DateTime, Interval} from 'luxon';
// tslint:disable-next-line:max-line-length
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';
// tslint:disable-next-line:max-line-length
import {BOSTON_BAY, BOSTON_GREEN, BOSTON_INDIGO, BOSTON_LAVENDER, BOSTON_PINK, BOSTON_PURPLE, BOSTON_YELLOW} from 'src/app/theme/bch_colors';

/**
 * A Dialog with a textarea input, used to set the description of points on the
 * CustomizableTimeline.
 */
@Component({
  selector: 'app-customizable-timeline-dialog',
  templateUrl: './customizable-timeline-dialog.component.html',
})
export class CustomizableTimelineDialogComponent {
  // The text input for this dialog box.
  userTitle: string;

  // The FormControl handling the Date selection for this dialog box.
  dateFormControl: FormControl;

  // The list of suggested times to display with the autocomplete.
  listOfTimes = [];

  // The list of colors the user will be able to choose from.
  // These colors need to stay consistent with the colored styles in graph.css.
  listOfColors = [
    BOSTON_YELLOW, BOSTON_GREEN, BOSTON_INDIGO, BOSTON_BAY, BOSTON_PINK,
    BOSTON_LAVENDER, BOSTON_PURPLE
  ];

  // The selected color in this dialog box.
  selectedColor: string;

  // The description input for this dialog box.
  userDescription: string;

  // The FormControl handling the time selection for this dialog box.
  timeFormControl: FormControl;

  // The date selected for this dialog box.
  date: Date;

  // The date range currently being viewed.
  dateRange: Interval;

  constructor(
      public dialogRef: MatDialogRef<CustomizableTimelineDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
    this.date = new Date(data.date);
    this.dateFormControl = new FormControl(this.date);
    const timeString = this.date.toLocaleTimeString(
        [], {hour12: false, hour: '2-digit', minute: '2-digit'});
    // Since we do not have an input of type "time" due to IE restrictions, we
    // manually check whether the input is a valid time string using regex.
    this.timeFormControl = new FormControl(
        timeString, Validators.pattern('([01]?[0-9]|2[0-3]):[0-5][0-9]'));
    this.generateListOfTimes();
    // Set the default selected color as yellow if unset, or find the BCH Color
    // matching the selected color passed in.
    this.selectedColor = data.color ?
        this.listOfColors.find(c => c.hex() === data.color.hex()) :
        BOSTON_YELLOW;
    // Set the title if it is passed in.
    if (data.title) {
      this.userTitle = data.title;
    }
    // Set the description if it is passed in.
    if (data.description) {
      this.userDescription = data.description;
    }

    if (data.dateRange) {
      this.dateRange = Interval.fromDateTimes(
          this.data.dateRange.start.toLocal().startOf('day'),
          this.data.dateRange.end.toLocal().endOf('day'));
    }
  }

  // Closes the dialog popup without saving the user input.
  onCancel(): void {
    this.dialogRef.close();
  }

  // Closes the dialog popup and saves user input.
  onSave(): void {
    this.dialogRef.close(new CustomizableGraphAnnotation(
        DateTime.fromJSDate(this.getSelectedDate()),
        this.userTitle.trim(),
        this.userDescription,
        Color.rgb(this.selectedColor),
        ));
  }

  // Generates a list of times with 30-minute intervals, for the autocomplete
  // time-picker.
  private generateListOfTimes() {
    const interval = 30;
    const date = new Date();
    date.setMinutes(0);
    date.setHours(0);
    for (let time = 0; time <= 24 * 60; time += interval) {
      date.setHours(time / 60);
      date.setMinutes(time % 60);
      this.listOfTimes.push({
        24: date.toLocaleTimeString(
            [], {hour12: false, hour: '2-digit', minute: '2-digit'})
      });
    }
  }

  // Constructs a new Date based on user input.
  private getSelectedDate(): Date {
    const dateTime = new Date(this.dateFormControl.value);
    // For date parsing to work in IE, we must remove all extraneous non-ASCII
    // characters added, and manually change the time.
    const time =
        this.timeFormControl.value.replace(/[^\x00-x7F]/g, '').split(':');
    dateTime.setHours(Number(time[0]), Number(time[1]));
    return dateTime;
  }

  // Finds incomplete fields that are required and disables saving.
  findIncompleteFields() {
    return !this.userTitle ||
        (this.userTitle && this.userTitle.trim().length === 0) ||
        this.dateFormControl.hasError('required') ||
        this.timeFormControl.hasError('required') ||
        this.timeFormControl.invalid || this.dateFormControl.invalid;
  }

  // Returns whether the date selected by the user falls outside the current
  // date range.
  private dateNotInRange(): boolean {
    const dateTime = DateTime.fromJSDate(this.getSelectedDate());
    if (!this.dateRange) {
      return false;
    }
    return !(this.dateRange.contains(dateTime));
  }
}
