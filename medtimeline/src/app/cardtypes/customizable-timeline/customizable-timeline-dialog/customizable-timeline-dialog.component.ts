// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {NgbDateAdapter, NgbDateNativeAdapter} from '@ng-bootstrap/ng-bootstrap';
import * as Color from 'color';
import {DateTime, Interval} from 'luxon';
// tslint:disable-next-line:max-line-length
import {CustomizableGraphAnnotation} from 'src/app/graphtypes/customizable-graph/customizable-graph-annotation';
// tslint:disable-next-line:max-line-length
import * as Colors from 'src/app/theme/verily_colors';

/**
 * A Dialog with a textarea input, used to set the description of points on the
 * CustomizableTimeline.
 */
@Component({
  selector: 'app-customizable-timeline-dialog',
  templateUrl: './customizable-timeline-dialog.component.html',
  styleUrls: ['./customizable-timeline-dialog.component.css'],
  providers: [{provide: NgbDateAdapter, useClass: NgbDateNativeAdapter}]
})
export class CustomizableTimelineDialogComponent {
  // The text input for this dialog box.
  userTitle: string;

  // The list of suggested times to display with the autocomplete.
  listOfTimes = [];

  // The list of colors the user will be able to choose from.
  listOfColors = [
    Colors.DEEP_CORAL,
    Colors.DEEP_ORANGE,
    Colors.DEEP_TURQUOISE,
    Colors.DEEP_CYAN,
    Colors.DEEP_PURPLE_600,
  ];

  // The selected color in this dialog box.
  selectedColor: string;

  // The description input for this dialog box.
  userDescription: string;

  // The FormControl handling the time selection for this dialog box.
  timeFormControl: FormControl;

  // The date selected for this dialog box.
  date: Date;

  // The time selected for this dialog box.
  time: any;

  // The date range currently being viewed.
  dateRange: Interval;

  constructor(
      public dialogRef: MatDialogRef<CustomizableTimelineDialogComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any) {
    this.date = new Date(data.date);
    const minutes = this.date.getMinutes();
    const hours = this.date.getHours();
    this.time = {hour: hours, minute: minutes};
    this.timeFormControl =
        new FormControl(this.time, (control: FormControl) => {
          const value = control.value;
          if (!value) {
            return null;
          }
        });
    // Set the default selected color as yellow if unset, or find the BCH Color
    // matching the selected color passed in.
    this.selectedColor = data.color ?
        this.listOfColors.find(c => c.hex() === data.color.hex()) :
        Colors.DEEP_CORAL;
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

  // Constructs a new Date based on user input.
  private getSelectedDate(): Date {
    const dateTime = new Date(this.date);
    if (!this.time || !this.timeFormControl.value) {
      return undefined;
    }
    // For date parsing to work in IE, we must remove all extraneous non-ASCII
    // characters added, and manually change the time.
    dateTime.setHours(this.time.hour, this.time.minute);
    return dateTime;
  }

  // Finds incomplete fields that are required and disables saving.
  findIncompleteFields() {
    return !this.userTitle ||
        (this.userTitle && this.userTitle.trim().length === 0) ||
        this.date === null || this.isInvalidDate() ||
        this.timeFormControl.hasError('required') ||
        this.timeFormControl.invalid;
  }

  // Returns whether the date input has an invalid date.
  private isInvalidDate(): boolean {
    return isNaN(DateTime.fromJSDate(this.date).toMillis());
  }

  // Returns whether the date selected by the user falls outside the current
  // date range.
  dateNotInRange(): boolean {
    const dateTime = DateTime.fromJSDate(this.getSelectedDate());
    if (!this.dateRange) {
      return false;
    }
    return !(this.dateRange.contains(dateTime));
  }
}
