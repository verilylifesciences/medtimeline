// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {InjectionToken} from '@angular/core';
import {DateTime, Duration, Interval} from 'luxon';

import {environment} from './environments/environment';

export function recordGoogleAnalyticsEvent(
    eventName: string, eventCategory: string, eventLabel: string) {
  if ((<any>window).gtag) {
    (<any>window).gtag('event', eventName, {
      'event_category': eventCategory,
      'event_label': eventLabel
    });
  }
}

/** The period of time this app will search for patient encounters in.  */
export const APP_TIMESPAN = environment.production ?
    Interval.fromDateTimes(
        DateTime.utc().minus(Duration.fromObject({months: 6})),
        DateTime.utc()) :
    Interval.fromDateTimes(
        DateTime.utc().minus(Duration.fromObject({months: 60})),
        DateTime.utc());

/**
 * Do not consider any encounters with a start date earlier than a year from
 * now.
 */
export const EARLIEST_ENCOUNTER_START_DATE = DateTime.utc().minus({years: 1});

/** Constants used for FHIR resource types. */
export enum FhirResourceType {
  Encounter = 'Encounter',
  Observation = 'Observation',
  MedicationAdministration = 'MedicationAdministration',
  MedicationOrder = 'MedicationOrder',
  DocumentReference = 'DocumentReference',
  Patient = 'Patient',
  Specimen = 'Specimen',
  Medication = 'Medication',
  DiagnosticReport = 'DiagnosticReport'
}

/**
 * Injection token for passing UI constants across the app.
 */
export let UI_CONSTANTS_TOKEN = new InjectionToken('UiConstantsToken');

/**
 * UI constants text.
 */
export const UI_CONSTANTS = {
  SYNTH_DATA: 'This is synthesized data used only for demo purposes.',
  LOINC_VERIFIED_STRING:
      'These BCH data mappings were verified 2019-04-30. v.1.0.4.0',
  // Tooltip for adding a card inline
  ADD_TIMELINE_HERE: 'Add timeline here',
  // Dialog for adding an event to the custom timeline
  ADD_TITLE_CUSTOM_EVENT: 'Add title',
  ADD_DESCRIPTION_CUSTOM_EVENT: 'Add description',
  ADD_CARD_HERE: 'Add card here',
  DATE_CUSTOM_EVENT: 'Date',
  TIME_CUSTOM_EVENT: 'Time',
  CANCEL: 'Cancel',
  SAVE: 'Save',
  CONTINUE: 'Continue',
  // Custom timeline constants
  ADD_CUSTOM_TIMELINE: 'Add Custom Timeline',
  CUSTOM_TIMELINE_LABEL: 'Custom Timeline',
  CUSTOM_TIMELINE_INSTRUCTIONS:
      'Click on this graph to add a flag for anything you want to keep track of.',
  // Annotation constants
  ADD_ANNOTATION: 'Add Textbox',
  ANNOTATION_INSTRUCTIONS: 'Add your text here.',
  SAVE_TEXT_HINT: 'Click the save button to save your text.',
  EDIT_TEXT_HINT: 'Click the edit button to edit this text.',
  // Constants
  NO_DATA_AVAILABLE_TMPL: 'No data between ',
  // Used in menu to add timelines
  ADD_CHART: 'Add Data Timeline',
  SEARCH_FOR_A_CONCEPT: 'Search for a concept',
  // Confirmation dialog for removing a card
  REMOVE_CARD: 'Do you want to remove this card?',
  REMOVE_CARD_NO: 'No',
  REMOVE_CARD_YES: 'Yes, remove this card',
  // Error handling
  BAD_DATA_ERROR: 'Invalid data received. Please check the PowerChart.',
  BAD_ENCOUNTER_ERROR:
      'Unable to retrieve hospital visit dates for this patient.' +
      ' You can select any time period in the past six months.',
  // Setup screen
  INITIAL_CONFIGURATION_HEADER: 'MedTimeLine',
  LAST_ONE_DAY: 'Since midnight yesterday',
  LAST_THREE_DAYS: 'Last three days',
  LAST_SEVEN_DAYS: 'Last seven days',
  LAST_MONTH: 'Last month',
  LAST_THREE_MONTHS: 'Last three months',
  NO_RESULTS: 'No results found',
  SELECT_ALL: 'Select all',
  CLEAR_SELECTION: 'Clear selection',
  NO_DATA_PAST_SIX_MOS: '(No data found for past six months)',
  CHECKING_DATA_AVAILABILITY: '(Checking data availability...)',
  WHICH_ENCOUNTER_FIRST: 'Which time period would you like to see first?',
  WHICH_CONCEPTS_FIRST: 'Which data timelines would you like to see first?',
  ENCOUNTER: '(patient encounter)',
  // Top banner constants
  CHANGE_DATE_RANGE: 'Change date range',
  MOCK_DATA_BANNER: 'This is synthesized data used for demo purposes only.',
  LAUNCH_TUTORIAL: 'Launch Tutorial',
  IFU: 'Open Instructions for Use',
  SAVE_TO_NOTE: 'Save a screenshot to a PowerChart clinical note',
  // Interacting with cards
  REMOVE_THIS_CARD: 'Remove this card',
  CARD_REMOVED: 'Card removed.',
  UNDO: 'Undo',
  DRAG_THIS_CARD: 'Drag and drop to move this card somewhere else',
  EDIT_THIS_CARD: 'Edit this card',
  SAVE_YOUR_WORK: 'Save your work on this card',
  // Saving to PowerChart
  SAVED_TO_POWERCHART: 'Screenshot saved to PowerChart.',
  ERROR_SAVED_TO_POWERCHART: 'Error saving to PowerChart.',
  DISMISS: 'Dismiss',
};
