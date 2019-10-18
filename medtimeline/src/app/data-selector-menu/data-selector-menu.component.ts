// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Inject, OnInit, Output, ViewChild} from '@angular/core';
import {FormControl} from '@angular/forms';
import {MatAutocompleteTrigger, MatMenuTrigger} from '@angular/material';
import {Observable} from 'rxjs';
import {map, startWith} from 'rxjs/operators';
import {recordGoogleAnalyticsEvent, UI_CONSTANTS_TOKEN} from 'src/constants';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeCreator} from '../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../conceptmappings/resource-code-manager';
import {FhirService} from '../fhir.service';
import {AxisGroup} from '../graphtypes/axis-group';

/**
 * Shows a button with expanding menus for selecting data elements to display.
 */
@Component({
  selector: 'app-data-selector-menu',
  templateUrl: './data-selector-menu.component.html',
  styleUrls: ['./data-selector-menu.component.css']
})
export class DataSelectorMenuComponent {
  /** The trigger for the main menu displayed. */
  @ViewChild(MatMenuTrigger) menuTrigger: MatMenuTrigger;
  /** The trigger for the autocomplete panel displayed. */
  @ViewChild(MatAutocompleteTrigger)
  autocompleteTrigger: MatAutocompleteTrigger;

  /**
   * An array of DisplayGroupings and AxisGroup that belong to that
   * grouping.
   */
  displayGroupings: Array<[DisplayGrouping, AxisGroup[]]>;

  /** An event that is emitted when the user requests to add a new card. */
  @Output() addCard = new EventEmitter<string>();
  /** An event that is emitted when the user requests to add a textbox. */
  @Output() addTextbox = new EventEmitter<null>();
  /**
   * An event that is emitted when the user requests to add a custom timeline.
   */
  @Output() addCustomTimeline = new EventEmitter<null>();

  /** All AxisGroup that correspond to cards displayed on the page. */
  allConcepts: AxisGroup[];

  /**
   * The FormControl used to monitor changes in the user input of the
   * autocomplete field.
   */
  readonly conceptCtrl = new FormControl();
  filteredConcepts: Observable<AxisGroup[]>;

  constructor(
      resourceCodeManager: ResourceCodeManager, fhirService: FhirService,
      resourceCodeCreator: ResourceCodeCreator,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    resourceCodeManager.getDisplayGroupMapping(fhirService, resourceCodeCreator)
        .then((displayGroups) => {
          const temp = Array.from(displayGroups.values());
          this.allConcepts = [].concat.apply([], temp);
          this.displayGroupings = Array.from(displayGroups.entries());

          // Watch for changes to the user input on the autocomplete panel.
          this.filteredConcepts = this.conceptCtrl.valueChanges.pipe(
              startWith(
                  ''),  // The autocomplete input starts with nothing typed in.
              map(concept => concept ? this.filter(concept, this.allConcepts) :
                                       this.allConcepts.slice()));
        });
  }

  // Listens for an event indicating that the user has selected to add the
  // concept card from the top toolbar. The label for the card is sent as an
  // event to CardContainer.
  private addConceptCard(label: string) {
    this.addCard.emit(label);

    recordGoogleAnalyticsEvent('addConcept', 'addCard', label);
  }

  // Emits an event indicating to CardContainer to add a blank textbox at the
  // top of the page.
  private textbox() {
    this.addTextbox.emit();

    recordGoogleAnalyticsEvent(
        'addTextbox', 'addCard', new Date().toDateString());
  }

  private customTimeline() {
    this.addCustomTimeline.emit();

    recordGoogleAnalyticsEvent(
        'addCustomTimeline', 'addCard', new Date().toDateString());
  }

  // Filter the concepts shown on the autocomplete menu.
  filter(concept, allConcepts): AxisGroup[] {
    return allConcepts.filter(
        option =>
            option.label.toLowerCase().indexOf(concept.toLowerCase()) === 0);
  }

  // We close the menu after an option is selected by autocomplete.
  private closeMenus() {
    this.menuTrigger.closeMenu();
    this.autocompleteTrigger.closePanel();
  }

  // Listen for the event indicating that an option has been selected in the
  // autocomplete menu.
  private selectOption($event) {
    this.addConceptCard($event.option.value);
    this.closeMenus();
  }
}
