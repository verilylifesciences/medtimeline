// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, OnDestroy, OnInit} from '@angular/core';
import {FormControl} from '@angular/forms';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {environment} from '../../environments/environment';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeManager, ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';
import {SetupDataService} from '../setup-data.service';

@Component({
  selector: 'app-setup',
  templateUrl: './setup.component.html',
  styleUrls: ['./setup.component.css']
})

// This class contains the intial configuration options for the MedTimeLine.
// Users can choose which concepts to display, or pick the default
// configuration.
export class SetupComponent implements OnInit, OnDestroy {
  readonly allConcepts: Array<ResourceCodesForCard> = [];
  readonly checkedConcepts = new Map<string, boolean>();
  readonly chosenConcepts: Array<ResourceCodesForCard> = [];
  readonly useDebugger = environment.useDebugger;

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
  displayGroupingOptions:
      Observable<Array<[DisplayGrouping, ResourceCodesForCard[]]>>;

  /**
   * An array of DisplayGroupings and ResourceCodesForCard that belong to that
   * grouping.
   */
  readonly displayGroupings: Array<[DisplayGrouping, ResourceCodesForCard[]]>;

  sortResources = (function(a, b) {
    return a.label.localeCompare(b.label);
  });

  ngOnInit() {
    // Watch for changes to the user input on the autocomplete panel.
    this.displayGroupingOptions = this.conceptCtrl.valueChanges.pipe(
        startWith(''),  // The autocomplete input starts with nothing typed in.
        map(concept => concept ? this.filter(concept) :
                                 this.displayGroupings.slice()));
  }

  ngOnDestroy() {
    this.setupDataService.selectedConcepts = this.chosenConcepts;
  }


  constructor(
      resourceCodeManager: ResourceCodeManager, private route: ActivatedRoute,
      private router: Router, private setupDataService: SetupDataService) {
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    /* Load in the concepts to display, flattening them all into a
     * single-depth array. */
    this.allConcepts = Array.from(displayGroups.values())
                           .reduce((acc, val) => acc.concat(val), []);

    this.displayGroupings = Array.from(displayGroups.entries());
    for (const concept of this.allConcepts) {
      this.checkedConcepts[concept.label] = false;
      const showByDefault =
          concept.resourceCodeGroups.some(x => x.showByDefault);
      if (showByDefault) {
        this.checkedConcepts[concept.label] = true;
      }
    }
    console.warn(environment.useDebugger);
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
      this.checkedConcepts[concept.label] = true;
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
