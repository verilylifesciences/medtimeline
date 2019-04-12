// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component} from '@angular/core';
import {MatDialog, MatDialogRef, MatSnackBar} from '@angular/material';
import {DateTime, Interval} from 'luxon';
import {DragulaService} from 'ng2-dragula';
import {Subscription} from 'rxjs';
import {v4 as uuid} from 'uuid';

import {environment} from '../../environments/environment';
import {ResourceCodeManager} from '../clinicalconcepts/resource-code-manager';
import {ConfirmSaveComponent} from '../confirm-save/confirm-save.component';
import {DeleteDialogComponent} from '../delete-dialog/delete-dialog.component';
import {FhirService} from '../fhir.service';
import {CustomizableData} from '../graphdatatypes/customizabledata';
import {AxisGroup} from '../graphtypes/axis-group';
import {ChartType} from '../graphtypes/graph/graph.component';
import {SetupDataService} from '../setup-data.service';

@Component({
  selector: 'app-cardcontainer',
  templateUrl: './cardcontainer.component.html',
  styleUrls: ['./cardcontainer.component.css'],
  entryComponents: [DeleteDialogComponent],
})
export class CardcontainerComponent {
  // How long to display the snack bar for.
  private readonly DISPLAY_TIME = 6000;

  // Whether or not to display the debugger.
  useDebugger = environment.useDebugger;

  /**
   * The format of each object in the array is an object representing a line
   * drawn on the chart, that has a value, text, and class field. The value
   * field represents the x-position of the line to be drawn, while the class
   * represents the class name, and the text represents the text displayed near
   * the line.
   */
  eventlines: Array<{[key: string]: number | string}> = [];

  // The concepts that are actually being displayed on the page.
  // We keep track of unique ids for each displayed card, to allow removal on
  // clicking the trashcan icon.

  readonly displayedConcepts:
      Array<{[key: string]: AxisGroup | string | CustomizableData}> = [];

  // The original concepts to duplicate, if necessary.
  readonly originalConcepts: AxisGroup[];

  // Hold an instance of this enum so that the HTML template can access it.
  readonly chartType = ChartType;

  /**
   * By default make the date range displayed the past seven days.
   */
  dateRange: Interval =
      Interval.fromDateTimes(DateTime.utc().minus({days: 7}), DateTime.utc());

  // Holds a subscription to the observable sequence of events emitted by the
  // Dragula Service.
  private readonly subs = new Subscription();

  // Holds the most recently removed card from the container, mapping the index
  // of the displayed card to the displayedConcept value.
  private recentlyRemoved:
      [number, {[key: string]: AxisGroup | string | CustomizableData}];

  // The reference for the Delete Card Dialog opened.
  private deleteDialogRef: MatDialogRef<DeleteDialogComponent>;

  // The reference for the Save Snapshot Dialog opened.
  private saveDialogRef: MatDialogRef<ConfirmSaveComponent>;

  // A map of custom timeline id to the event lines corresponding to that
  // timeline.
  private eventsForCustomTimelines =
      new Map<string, Array<{[key: string]: number | string}>>();

  // TODO(b/119251288): Extract out the constants to somewhere shared between
  // the ts files and html files.
  constructor(
      dragulaService: DragulaService, private fhirService: FhirService,
      resourceCodeManager: ResourceCodeManager, private snackBar: MatSnackBar,
      private deleteDialog: MatDialog,
      readonly setupDataService: SetupDataService,
      private saveDialog: MatDialog) {
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    /* Load in the concepts to display, flattening them all into a
     * single-depth array. */
    this.originalConcepts = Array.from(displayGroups.values())
                                .reduce((acc, val) => acc.concat(val), []);
    this.setUpCards();
    this.setUpDrag(dragulaService);
  }

  private setUpCards() {
    // Add a textbox at the top of the card list.
    this.addTextbox();
    // Add a custom timeline to the top of the card list.
    this.addCustomTimeline();
    // Add all cards selected at the set-up screen.
    for (const concept of this.setupDataService.selectedConcepts) {
      this.displayedConcepts.push({'id': uuid(), 'concept': concept});
    }
  }

  // Ensures that the order of displayed concepts is updated as the user drags
  // cards around.
  private setUpDrag(dragulaService: DragulaService) {
    this.subs.add(dragulaService.drop('graphcards').subscribe((value) => {
      // Rearrange the order of this.displayedConcepts if graph/textbox
      // cards are reordered. We do not use dragulaModel since we cannot use
      // it for separate lists on the configuration panel.
      let originalIndex = this.displayedConcepts.map(x => x.id).indexOf(
          value.el.getAttribute('data-index'));
      const siblingIndex = this.getSiblingIdx(value);
      const elementDisplayed = this.displayedConcepts[originalIndex];
      // Add the element to its new position.
      this.displayedConcepts.splice(siblingIndex, 0, elementDisplayed);
      // Adjust the original position if needed.
      if (siblingIndex < originalIndex) {
        originalIndex++;
      }
      this.displayedConcepts.splice(originalIndex, 1);
    }));
  }

  /**
   * Gets the index of the card below a dragged-and-dropped card's new place.
   */
  private getSiblingIdx(value): number {
    let siblingIndex;
    if (value.sibling === null) {
      // Dragged to bottom of list
      siblingIndex = this.displayedConcepts.length;
    } else {
      const siblingId = value.sibling.getAttribute('data-index');
      siblingIndex = this.displayedConcepts.map(x => x.id).indexOf(siblingId);
    }
    return siblingIndex;
  }

  /**
   * Adds a new annotation box to the card panel.
   * @param id: The id of the card above the position of the new annotation box.
   */
  addTextbox(id?: string) {
    const index =
        id ? (this.displayedConcepts.map(x => x.id).indexOf(id) + 1) : 0;
    this.displayedConcepts.splice(index, 0, {id: uuid(), concept: 'textbox'});
  }

  /**
   * Adds a new custom timeline to the card panel.
   * @param id: The id of the card above the position of the new annotation box.
   */
  addCustomTimeline(id?: string) {
    const index =
        id ? (this.displayedConcepts.map(x => x.id).indexOf(id) + 1) : 0;
    this.displayedConcepts.splice(
        index, 0, {id: uuid(), concept: 'customTimeline'});
  }

  // Listen for an event indicating that the date range has been changed on the
  // UI, and update the date range.
  changeDateRange($event) {
    this.dateRange = $event;
  }

  // Saves a snapshot of the graph drawer HTML to the EHR using a FhirService.
  snapshot() {
    const html = document.getElementsByClassName('cardContainer')[0].innerHTML;
    this.saveDialogRef =
        this.saveDialog.open(ConfirmSaveComponent, {data: html, height: '80%'});
    this.saveDialogRef.afterClosed().subscribe(result => {
      // Only save the snapshot to the EHR if the user confirmed the save.
      if (result) {
        const date = DateTime.fromJSDate(new Date()).toISO();
        this.fhirService.saveStaticNote(html, date);
        this.snackBar.open('Snapshot saved to PowerChart', 'Dismiss', {
          duration: this.DISPLAY_TIME,  // Wait 6 seconds before dismissing the
                                        // snack bar.
        });
      }
    });
  }

  // Listen for an event indicating that a "delete" button has been clicked on a
  // card currently displayed, and update the displayed concepts
  // accordingly after asking for confirmation of deletion.
  removeDisplayedCard($event) {
    const index = this.displayedConcepts.map(x => x.id).indexOf($event.id);
    const concept = this.displayedConcepts[index];
    concept.value = $event.value;
    this.deleteDialogRef = this.deleteDialog.open(DeleteDialogComponent);
    this.deleteDialogRef.afterClosed().subscribe(result => {
      // The user wishes to delete the card.
      if (result) {
        this.displayedConcepts.splice(index, 1);
        this.recentlyRemoved = [index, concept];
        this.openSnackBar();
        if (this.eventsForCustomTimelines.get($event.id)) {
          // We only remove the event lines for this CustomTimeline if the user
          // confirms the deletion of the card.
          this.updateEventLines({id: $event.id});
        }
      }
    });
  }

  // Open a snack bar allowing for the user to potentially reverse the removal
  // of cards from the page. Only one snack bar can be opened at a time.
  private openSnackBar() {
    const message = 'Card removed.';
    const snackBarRef = this.snackBar.open(message, 'Undo', {
      duration:
          this.DISPLAY_TIME,  // Wait 6 seconds before dismissing the snack bar.
    });
    // Undo the most recent deletion according to what is stored in
    // recentlyRemoved.
    snackBarRef.onAction().subscribe(() => {
      const index = this.recentlyRemoved[0];
      this.displayedConcepts.splice(index, 0, this.recentlyRemoved[1]);
      if (this.displayedConcepts[index].concept === 'customTimeline') {
        this.updateEventLines({
          id: this.displayedConcepts[0].id,
          data: this.displayedConcepts[0].value
        });
      }
    });
  }

  /**
   * Listens for an event indicating that the user has selected to add the
   * concept card from the top toolbar. The card is added at the top of the
   * page, or, if the id of the closest card is specified, below the closest
   * card.
   * @param label The label of the new concept to add.
   * @param id The id of the card below which to add the new concept.
   */

  addConceptCard(label: string, id?: string) {
    const graphCardValue =
        this.originalConcepts.find(obj => (obj.label === label));
    // Insert the card at the top of the page
    // Insert after the closest card rather than before the card.
    const index =
        id ? (this.displayedConcepts.map(x => x.id).indexOf(id) + 1) : 0;
    this.displayedConcepts.splice(
        index, 0, {id: uuid(), concept: graphCardValue});
  }

  /**
   * Listens for an event indicating that the user has edited the points on a
   * custom timeline, and updates the x-axis eventlines displayed on all other
   * charts.
   * @param $event The updated CustomizableData from which we calculate event
   *     lines for each chart to display, along with the id of the updated.
   *
   */

  updateEventLines($event) {
    let times = [];
    if ($event.data) {
      times = Array.from($event.data.annotations.keys()).map(x => Number(x));
    }
    const eventlines = times.map(x => {
      return {
        value: x,
        text: $event.data.annotations.get(x).title,
        color: $event.data.annotations.get(x).color.hex()
      };
    });
    this.eventsForCustomTimelines.set($event.id, eventlines);

    // Consolidate all event lines from all custom timelines.
    let allEvents = [];
    for (const events of Array.from(this.eventsForCustomTimelines.values())) {
      allEvents = allEvents.concat(events);
    }
    this.eventlines = allEvents;
  }
}
