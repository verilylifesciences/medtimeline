// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatRadioGroup} from '@angular/material/radio';
import {ActivatedRoute, Router} from '@angular/router';
import {DateTime, Interval} from 'luxon';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {APP_TIMESPAN, UI_CONSTANTS_TOKEN} from 'src/constants';

import {environment} from '../../environments/environment';
import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
import {Encounter} from '../fhir-data-classes/encounter';
import {FhirService} from '../fhir.service';
import {AxisGroup} from '../graphtypes/axis-group';
import {ResultError} from '../result-error';
import {SetupDataService} from '../setup-data.service';

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
export class SetupComponent implements OnInit, OnDestroy {
  readonly allConcepts = new Array<AxisGroup>();
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
  readonly displayGroupings: Array<[DisplayGrouping, AxisGroup[]]>;

  /**
   * Holds whether there's any data available for each resource code group.
   */
  readonly codeGroupAvailable = new Map<string, LoadStatus>();

  /**
   * List of times the patient was in the hospital.
   */
  encounters: Encounter[];

  // Fixed time periods to offer as options for selection.
  today: DateTime = DateTime.local().startOf('day');
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

  sortResources = (function(a, b) {
    return a.label.localeCompare(b.label);
  });

  ngOnDestroy() {
    // Pass the selected information through to the setup data service.
    this.setupDataService.selectedConcepts = this.chosenConcepts;
    this.setupDataService.encounters = this.encounters;
    this.setupDataService.selectedDateRange = this.selectedDateRange.value ?
        this.selectedDateRange.value :
        Interval.fromDateTimes(this.today.minus({days: 7}), this.today);
  }

  constructor(
      resourceCodeManager: ResourceCodeManager, private route: ActivatedRoute,
      private router: Router, private setupDataService: SetupDataService,
      private fhirService: FhirService,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    // Set up jut a couple things so we don't have to hold on to them as
    // unnecessary class variables.
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    /* Load in the concepts to display, flattening them all into a
     * single-depth array. */
    this.allConcepts = Array.from(displayGroups.values())
                           .reduce((acc, val) => acc.concat(val), []);

    this.displayGroupings = Array.from(displayGroups.entries());
  }

  ngOnInit() {
    // Watch for changes to the user input on the autocomplete panel.
    this.displayGroupingOptions = this.conceptCtrl.valueChanges.pipe(
        startWith(''),  // The autocomplete input starts with nothing typed in.
        map(concept => concept ? this.filter(concept) :
                                 this.displayGroupings.slice()));

    for (const concept of this.allConcepts) {
      this.checkedConcepts[concept.label] = false;
      const showByDefault =
          concept.axes.some(axis => axis.resourceGroup.showByDefault);
      if (showByDefault) {
        this.checkedConcepts[concept.label] = true;
      }
    }

    // Retrieve the patient encounters. When they load in asynchronously,
    // the radio buttons for encounter selection will show up.
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

    // Check to see which clinical concepts have any data, and enable/disable
    // on that basis.
    this.displayGroupings.forEach(grouping => {
      const resourceCodes = grouping[1];
      resourceCodes.forEach(rsc => {
        this.codeGroupAvailable.set(rsc.label, LoadStatus.LOADING);
        rsc.dataAvailableInAppTimeScope().then(available => {
          if (!available) {
            this.checkedConcepts[rsc.label] = false;
            this.codeGroupAvailable.set(rsc.label, LoadStatus.DATA_UNAVAILABLE);
          } else {
            this.codeGroupAvailable.set(rsc.label, LoadStatus.DATA_AVAILABLE);
          }
        });
      });
    });
  }

  /**
   * The user wishes to continue to the main screen of MedTimeLine, with all
   * charts selected.
   */
  onContinue() {
    for (const concept of this.allConcepts) {
      if (this.checkedConcepts[concept.label]) {
        this.chosenConcepts.push(concept);
      }
    }
    this.router.navigate(['/main'], {skipLocationChange: true});
  }

  /**
   * The user wishes to select all concepts.
   */
  selectAll() {
    for (const concept of this.allConcepts) {
      if (this.codeGroupAvailable.has(concept.label) &&
          this.codeGroupAvailable.get(concept.label) !==
              LoadStatus.DATA_UNAVAILABLE) {
        this.checkedConcepts[concept.label] = true;
      }
    }
  }

  /**
   * The user wishes to clear all select concepts.
   */
  clearAll() {
    for (const concept of this.allConcepts) {
      this.checkedConcepts[concept.label] = false;
    }
  }

  /**
   * Filter the concepts shown on the autocomplete menu.
   */
  filter(concept): any[] {
    return this.displayGroupings
        .filter(
            entry => entry[1].some(
                codes => codes.label.toLowerCase().indexOf(
                             concept.toLowerCase()) === 0))
        .map(function(entry) {
          const displayGrouping: DisplayGrouping = entry[0];
          const resourceCodesFiltered = entry[1].filter(
              codes => codes.label.toLowerCase().indexOf(
                           concept.toLowerCase()) === 0);
          return [displayGrouping, resourceCodesFiltered];
        });
  }
}
