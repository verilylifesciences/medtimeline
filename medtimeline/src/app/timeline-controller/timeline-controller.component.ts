// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Inject, Input, Output, Renderer2, ViewChild} from '@angular/core';
import {DateTime, Duration, Interval} from 'luxon';
import * as moment from 'moment';
import {DaterangepickerDirective} from 'ngx-daterangepicker-material';
import {APP_TIMESPAN, UI_CONSTANTS_TOKEN} from 'src/constants';

import {getDaysForIntervalSet} from '../date_utils';
import {Encounter} from '../fhir-data-classes/encounter';

/**
 * Date range picker for selecting the time span to show in all the charts.
 *
 * There is a lot of messy date conversion in this class. The problem is that
 * we use luxon DateTime for our date handling across this application, but the
 * date range picker only works with Moment.js datetimes. The only format both
 * classes have converters for is JSDate, so we pass dates through that
 * several places.
 */
@Component({
  selector: 'app-timeline-controller',
  templateUrl: './timeline-controller.component.html',
  styleUrls: ['./timeline-controller.component.css']
})
export class TimelineControllerComponent {
  @Output() changeDateRange = new EventEmitter<Interval>();
  @ViewChild(DaterangepickerDirective)
  pickerDirective: DaterangepickerDirective;

  /**
   * Holds the encounters for this patient.
   */
  @Input() encounters: Encounter[];

  /**
   * Holds the date range to default to on initial setup. If unset, we'll
   * default to the last seven days.
   */
  @Input() selectedDateRange: Interval;

  /**
   * Holds all the ISO strings for days covered by all the patient encounters
   * above. Used to gray out datepicker options that are not part of
   * a patient's encounter.
   */
  private daysCoveredByAnEncounter = new Set<string>();

  /** Bounds the dates that may be selected. */
  earliestAvailableDate = moment.utc(APP_TIMESPAN.start.toJSDate());
  readonly latestAvailableDate = moment.utc(APP_TIMESPAN.end.toJSDate());

  /** Selected timespan is past seven days by default. */
  readonly defaultDateRange = {
    startDate: moment.utc(DateTime.utc()
                              .minus(Duration.fromObject({days: 7}))
                              .toLocal()
                              .startOf('day')
                              .toJSDate()),
    endDate: moment.utc(DateTime.utc().toLocal().endOf('day'))
  };

  /**
   * The date range picker binds to this variable.
   */
  selected: {startDate: moment.Moment, endDate: moment.Moment};

  /** The list of encounters to display as available ranges to select. */
  readonly datePickerRanges = {};

  /**
   * Whether there was an encounter input into this component.
   */
  encounterError = false;

  constructor(
      private renderer: Renderer2,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {}

  ngOnInit() {
    // Set the initial date range selection and fire off a change event.
    const selectedRange = {
      startDate: moment(this.selectedDateRange.start.startOf('day').toJSDate()),
      endDate: moment(this.selectedDateRange.end.startOf('day').toJSDate())
    };
    this.selected = selectedRange;
    this.datesUpdated(selectedRange);

    // Set up the encounters in the date picker.
    if (this.encounters && this.encounters.length > 0) {
      this.encounterError = false;

      this.encounters = this.encounters.sort(
          (a, b) => a.period.start.toMillis() - b.period.start.toMillis());

      // Set the minimum date to select to be the beginning of the
      // earliest encounter that had days that fell inside the app
      // timespan, in UTC.
      this.earliestAvailableDate = moment(
          this.encounters[0].period.start.startOf('day').toUTC().toJSDate());

      // We have to store everything as an ISO string because if we
      // store as objects the set membership check doesn't work.
      this.daysCoveredByAnEncounter = new Set<string>(
          getDaysForIntervalSet(this.encounters.map(x => x.period))
              .map(x => x.toISO().slice(0, 10)));

      // We manually update the ranges stored in the daterangepicker
      // so that the list of encounters is displayed.
      // We store these in local time to prevent errors with
      // displaying a date different than the dates of the encounter.
      // While being communicated with charts, the interval will be
      // converted to UTC.
      for (const encounter of this.encounters) {
        const start = moment(encounter.period.start.startOf('day').toJSDate());
        const end = moment(encounter.period.end.endOf('day').toJSDate());
        const label =
            start.format('MM/DD/YYYY') + '-' + end.format('MM/DD/YYYY');
        this.datePickerRanges[label] = [start, end];
      }
      this.datePickerRanges[this.uiConstants.LAST_SEVEN_DAYS] =
          [this.defaultDateRange.startDate, this.defaultDateRange.endDate];
    } else {
      this.encounterError = true;
    }
  }

  /**
   * Used to add a style to dates in the date picker so that the user can
   * differentiate between dates inside and outside of encounters.
   */
  addCustomClass =
      (m: moment.Moment) => {
        // The slice gets jus tthe date portion of the ISO string.
        return this.daysCoveredByAnEncounter.has(m.toISOString().slice(0, 10)) ?
            'inEncounter' :
            'notInEncounter';
      }

  /**
   * Emits the date range picked in the date picker as an event.
   * @param range The date range selected in the picker.
   */
  datesUpdated(rangeIn: {startDate: moment.Moment, endDate: moment.Moment}) {
    if (!rangeIn.startDate || !rangeIn.endDate || !this.selected) {
      return;
    }
    if (rangeIn.startDate.isBefore(rangeIn.endDate)) {
      this.selected = rangeIn;
      // Convert to UTC time.
      const interval = Interval.fromDateTimes(
          DateTime.fromJSDate(rangeIn.startDate.toDate())
              .startOf('day')
              .toUTC(),
          DateTime.fromJSDate(rangeIn.endDate.toDate()).endOf('day').toUTC());
      this.changeDateRange.emit(interval);

      // Record the user changing the date range to Google Analytics.
      (<any>window).gtag('event', 'dateRangeChanged', {
        'event_category': 'timeline',
        'event_label': interval.start.toLocaleString() + ' - ' +
            interval.end.toLocaleString()
      });
    }
  }
}
