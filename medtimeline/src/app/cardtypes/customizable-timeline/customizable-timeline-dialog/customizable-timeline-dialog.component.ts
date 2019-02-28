// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import * as Color from 'color';
import {DateTime} from 'luxon';
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';
import {BOSTON_BAY, BOSTON_GREEN, BOSTON_INDIGO, BOSTON_LAVENDER, BOSTON_PINK, BOSTON_PURPLE, BOSTON_YELLOW} from 'src/app/theme/bch_colors';

@Component({
  selector: 'app-customizable-timeline-dialog',
  templateUrl: './customizable-timeline-dialog.component.html',
  styleUrls: ['./customizable-timeline-dialog.component.css']
})

/**
 * A Dialog with a textarea input, used to set the description of points on the
 * CustomizableTimeline.
 */
// TODO(b/121324544): Use existing libraries for the color and time picker.
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

  constructor(
      public dialogRef: MatDialogRef<CustomizableTimelineDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
    this.date = new Date(data.date);
    this.dateFormControl = new FormControl(this.date);
    const timeString = this.date.toLocaleTimeString(
        [], {hour12: false, hour: '2-digit', minute: '2-digit'});
    this.timeFormControl = new FormControl(timeString);
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
  }

  // Closes the dialog popup without saving the user input.
  onCancel(): void {
    this.dialogRef.close();
  }

  // Closes the dialog popup and saves user input.
  onSave(): void {
    this.dialogRef.close(new CustomizableGraphAnnotation(
        DateTime.fromJSDate(this.getSelectedDate()),
        this.userTitle,
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
      // We need the time to be in 12-hour format for the display, but 24-hour
      // format for the actual value passed into the input of type "time".
      this.listOfTimes.push({
        12: date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}),
        24: date.toLocaleTimeString(
            [], {hour12: false, hour: '2-digit', minute: '2-digit'})
      });
    }
  }

  // Constructs a new Date based on user input.
  private getSelectedDate(): Date {
    const dateString =
        new Date(this.dateFormControl.value).toLocaleDateString();
    const date = new Date(dateString + ' ' + this.timeFormControl.value);
    return date;
  }

  // Finds incomplete fields that are required and disables saving.
  findIncompleteFields() {
    return !this.userTitle || this.dateFormControl.hasError('required') ||
        this.timeFormControl.hasError('required');
  }
}
