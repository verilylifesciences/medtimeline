// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject, OnDestroy, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatRadioGroup} from '@angular/material/radio';
import {Router} from '@angular/router';
import {DateTime, Interval} from 'luxon';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {APP_TIMESPAN, UI_CONSTANTS_TOKEN} from 'src/constants';

import {environment} from '../../environments/environment';
import {DisplayGrouping} from '../conceptmappings/resource-codes/display-grouping';
import {RxNormCode} from '../conceptmappings/resource-codes/rx-norm';
import {RxNormCodeGroup} from '../conceptmappings/resource-codes/rx-norm-group';
import {Encounter} from '../fhir-resources/encounter';
import {FhirService} from '../fhir-server/fhir.service';
import {AxisGroup} from '../graphs/graphtypes/axis-group';
import {ResultError} from '../result-error';

import {SetupDataService} from './setup-data.service';

enum LoadStatus {
  LOADING,
  DATA_AVAILABLE,
  DATA_UNAVAILABLE
}

/**
 * Contains the intial configuration options for the MedTimeLine.
 * Users can choose which concepts to display, or pick the default
 * configuration.
 */
@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})
export class SetupComponent implements OnDestroy {
  readonly allConcepts: Promise<AxisGroup[]>;
  readonly checkedConcepts = new Map<string, boolean>();
  readonly chosenConcepts = new Array<AxisGroup>();
  readonly useDebugger = environment.useDebugger;

  readonly statusConsts = LoadStatus;

  /**
   * Which encounter to load into the app first.
   */
  @ViewChild(MatRadioGroup) selectedDateRange: MatRadioGroup;

  /**
   * This FormControl monitors changes in the user input typed in the
   * autocomplete.
   */
  readonly conceptCtrl = new FormControl();
  /**
   * An Observable of filtered [DisplayGrouping, ResourceCodesForCard[] pairings
   * based on user input in the autocomplete. Each element of the array contains
   * a DisplayGrouping and filtered ResourceCodesForCards that belong  to that
   * DisplayGrouping.
   */
  displayGroupingOptions: Observable<Array<[DisplayGrouping, AxisGroup[]]>>;

  /**
   * An array of DisplayGroupings and AxisGroup that belong to that
   * grouping.
   */
  displayGroupings: Promise<Array<[DisplayGrouping, AxisGroup[]]>>;

  /**
   * Holds whether there's any data available for each resource code group.
   */
  readonly codeGroupAvailable = new Map<string, LoadStatus>();

  /**
   * List of times the patient was in the hospital.
   */
  encounters: Encounter[];

  // Fixed time periods to offer as options for selection.
  private today: DateTime = DateTime.local().startOf('day');
  readonly lastOneDay =
      Interval.fromDateTimes(this.today.minus({days: 1}), this.today);
  readonly lastThreeDays =
      Interval.fromDateTimes(this.today.minus({days: 3}), this.today);
  readonly lastSevenDays =
      Interval.fromDateTimes(this.today.minus({days: 7}), this.today);
  readonly lastMonth =
      Interval.fromDateTimes(this.today.minus({months: 1}), this.today);
  readonly lastThreeMonths =
      Interval.fromDateTimes(this.today.minus({months: 3}), this.today);

  /**
   * The time options that are always available. The boolean indicates which is
   * selected by default.
   */
  staticTimeOptions: Array<[Interval, string, boolean]>;

  sortResources = (function(a, b) {
    return a.label.localeCompare(b.label);
  });

  /**
   * Promise to load all Medication data that when resolved returns a Set of
   * all RxNormCodes that have data available within the App Timeframe.
   *
   * We load all the medication data on setup to cut down on the number of
   * calls for medication administration data availability and enhance
   * performance.
   */
  private readonly loadedMedications =
      this.fhirService.dataAvailableForMedications();

  ngOnDestroy() {
    // Pass the selected information through to the setup data service.
    this.setupDataService.selectedConcepts = this.chosenConcepts;
    this.setupDataService.encounters = this.encounters;
    this.setupDataService.selectedDateRange = this.selectedDateRange.value ?
        this.selectedDateRange.value :
        Interval.fromDateTimes(this.today.minus({days: 7}), this.today);
  }

  constructor(
      private router: Router, private setupDataService: SetupDataService,
      private fhirService: FhirService,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    this.allConcepts =
        setupDataService.displayGroupMapping.then((displayGroups) => {
          /* Load in the concepts to display, flattening them
           * all into a single-depth array. */
          return Array.from(displayGroups.values())
              .reduce((acc, val) => acc.concat(val), []);
        });
    this.displayGroupings =
        setupDataService.displayGroupMapping.then((displayGroups) => {
          return Array.from(displayGroups.entries());
        });
    this.staticTimeOptions = [
      [this.lastThreeMonths, uiConstants.LAST_THREE_MONTHS, false],
      [this.lastMonth, uiConstants.LAST_MONTH, false],
      [this.lastSevenDays, uiConstants.LAST_SEVEN_DAYS, true],
      [this.lastThreeDays, uiConstants.LAST_THREE_DAYS, false],
      [this.lastOneDay, uiConstants.LAST_ONE_DAY, false]
    ];
    this.setupInterface();
  }

  /**
   * Sets the status for the AxisGroup based on whether data is available.
   * If not available, the AxisGroup will be unchecked.
   *
   * @param axisGroup AxisGroup to set availability status for
   * @param available whether there is any data for the AxisGroup
   */
  setAxisGroupStatus(axisGroup: AxisGroup, available: boolean) {
    axisGroup.dataAvailable = available;
    if (!available) {
      this.checkedConcepts[axisGroup.label] = false;
    }
    this.codeGroupAvailable.set(
        axisGroup.label,
        available ? LoadStatus.DATA_AVAILABLE : LoadStatus.DATA_UNAVAILABLE);
  }

  /**
   * Sets up availability for AxisGroups that are associated with Medications.
   *
   * Since MedicationAdministration loading takes a long time (due to Cerner
   * limitations), we have preloaded the availability for all RxNormCodes.
   * Instead of making a call to the server for each Medication to check
   * availability, we use the pre-loaded list of available RxNormCodes.
   *
   * @param medAxisGroups AxisGroups with at least one axis that has an
   *     RxNormCodeGroup.
   */
  setupMedicationAxisGroups(medAxisGroups: AxisGroup[]) {
    this.loadedMedications.then(rxNormCodesWithData => {
      medAxisGroups.forEach((axisGroup: AxisGroup) => {
        const availablityPromises = axisGroup.axes.map(axis => {
          // some AxisGroups have RxNormCodeGroups and non-RxNormCodeGroups axes
          // such as Medication administrations and monitoring (LOINC). We check
          // for availability differently depending on the resource group type.
          if (axis.resourceGroup instanceof RxNormCodeGroup) {
            const axisHasData = axis.resourceGroup.resourceCodes.some(
                (code: RxNormCode) => rxNormCodesWithData.has(code));
            // since we are not using the axisDataAvailableInAppTimeScope
            // function, we need to set axisDataAvailable manually
            axis.axisDataAvailable = axisHasData;
            return Promise.resolve(axisHasData);
          } else {
            return axis.axisDataAvailableInAppTimeScope();
          }
        });
        Promise.all(availablityPromises).then(availablityList => {
          this.setAxisGroupStatus(
              axisGroup, availablityList.some(avail => !!avail));
        });
      });
    });
  }

  setupInterface() {
    // Retrieve the patient encounters. When they load in asynchronously,
    // the radio buttons for encounter selection will show up.
    this.getEncounters();
    const medAxisGroups = [];
    this.displayGroupings.then((displayGroupings) => {
      displayGroupings.forEach((row) => {
        // row[1] is an AxisGroup[] corresponding to the display grouping in
        // row[0].
        const axisGroupArray = row[1];
        axisGroupArray.forEach((axisGroup) => {
          // Check off concepts that are on by default and set initial status
          // to loading.
          this.checkedConcepts[axisGroup.label] =
              axisGroup.axes.some(axis => axis.resourceGroup.showByDefault);
          this.codeGroupAvailable.set(axisGroup.label, LoadStatus.LOADING);

          // if any of the axes in the axis group are for RxNormCodeGroups,
          // we handle the axis group differently for performance reasons.
          if (axisGroup.axes.some(
                  axis => axis.resourceGroup instanceof RxNormCodeGroup)) {
            medAxisGroups.push(axisGroup);
          } else {
            axisGroup.dataAvailableInAppTimeScope().then(available => {
              this.setAxisGroupStatus(axisGroup, available);
            });
          }
        });
      });
      this.setupMedicationAxisGroups(medAxisGroups);

      // Watch for changes to the user input on the autocomplete panel.
      this.displayGroupingOptions = this.conceptCtrl.valueChanges.pipe(
          startWith(
              ''),  // The autocomplete input starts with nothing typed in.
          map(concept => concept ? this.filter(concept, displayGroupings) :
                                   displayGroupings.slice()));
    });
  }

  private getEncounters() {
    this.setupDataService.encountersError = null;
    this.fhirService.getEncountersForPatient(APP_TIMESPAN)
        .then(
            encounters => {
              if (encounters.length > 0) {
                this.encounters = encounters.sort(
                    (a, b) =>
                        a.period.start.toMillis() - b.period.start.toMillis());
              }
            },
            rejection => {
              if (rejection instanceof ResultError) {
                this.setupDataService.encountersError = rejection;
              } else if (rejection instanceof Error) {
                this.setupDataService.encountersError =
                    new ResultError(new Set<string>(), rejection.message);
              } else {
                this.setupDataService.encountersError =
                    new ResultError(new Set<string>(), '', rejection);
              }
            });
  }

  /**
   * The user wishes to continue to the main screen of MedTimeLine, with all
   * charts selected.
   */
  onContinue() {
    this.allConcepts.then((allConcepts) => {
      for (const concept of allConcepts) {
        if (this.checkedConcepts[concept.label]) {
          this.chosenConcepts.push(concept);
        }
      }
      this.router.navigate(['/main'], {skipLocationChange: true});
    });
  }

  /**
   * The user wishes to select all concepts.
   */
  selectAll() {
    this.allConcepts.then((allConcepts) => {
      for (const concept of allConcepts) {
        if (this.codeGroupAvailable.has(concept.label) &&
            this.codeGroupAvailable.get(concept.label) !==
                LoadStatus.DATA_UNAVAILABLE) {
          this.checkedConcepts[concept.label] = true;
        }
      }
    });
  }

  /**
   * The user wishes to clear all select concepts.
   */
  clearAll() {
    this.allConcepts.then((allConcepts) => {
      for (const concept of allConcepts) {
        this.checkedConcepts[concept.label] = false;
      }
    });
  }

  /**
   * Filter the concepts shown on the autocomplete menu.
   */
  filter(concept, displayGroupings: Array<[DisplayGrouping, AxisGroup[]]>):
      any[] {
    return displayGroupings
        .filter(entry => {
          return entry[1].some(
              axis => axis.label.toLowerCase().indexOf(
                          concept.toLowerCase()) === 0);
        })
        .map(function(entry) {
          const displayGrouping: DisplayGrouping = entry[0];
          const resourceCodesFiltered = entry[1].filter(
              codes => codes.label.toLowerCase().indexOf(
                           concept.toLowerCase()) === 0);
          return [displayGrouping, resourceCodesFiltered];
        });
  }
}
