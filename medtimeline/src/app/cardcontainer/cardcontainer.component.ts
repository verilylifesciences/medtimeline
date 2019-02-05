// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, QueryList, ViewChildren} from '@angular/core';
import {MatDialog, MatDialogRef, MatSnackBar} from '@angular/material';
import {DateTime, Interval} from 'luxon';
import {DragulaService} from 'ng2-dragula';
import {Subscription} from 'rxjs';
import {v4 as uuid} from 'uuid';

import {CardComponent} from '../cardtypes/card/card.component';
import {ResourceCodeManager, ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';
import {DeleteDialogComponent} from '../delete-dialog/delete-dialog.component';
import {FhirService} from '../fhir.service';
import {ChartType} from '../graphtypes/graph/graph.component';

@Component({
  selector: 'app-cardcontainer',
  templateUrl: './cardcontainer.component.html',
  styleUrls: ['./cardcontainer.component.css']
})
export class CardcontainerComponent {
  // Constants for dragging regions of this component.
  // TODO(b/119251288): Extract out the constants to somewhere shared between
  // the ts files and html files.
  readonly CARDHOLDER = 'cardholder';
  // How long to display the snack bar for.
  private readonly DISPLAY_TIME = 6000;

  @ViewChildren(CardComponent) containedCards!: QueryList<CardComponent>;
  eventlines: Array<{[key: string]: number | string}> = [];

  // The concepts that are actually being displayed on the page.
  // We keep track of unique ids for each displayed card, to allow removal on
  // clicking the trashcan icon.

  readonly displayedConcepts:
      Array<{[key: string]: ResourceCodesForCard | string}> = [];

  // The original concepts to duplicate, if necessary.
  readonly originalConcepts: ResourceCodesForCard[];

  // Hold an instance of this enum so that the HTML template can access it.
  readonly chartType = ChartType;

  // The time interval displayed.
  dateRange: Interval;

  // Holds a subscription to the observable sequence of events emitted by the
  // Dragula Service.
  private readonly subs = new Subscription();

  // Holds the most recently removed cards from the container, mapping the index
  // of the displayed card to the displayedConcept value.
  private recentlyRemoved =
      new Map<number, {[key: string]: ResourceCodesForCard | string}>();

  // The reference for the Dialog opened.
  private dialogRef: MatDialogRef<DeleteDialogComponent>;

  // TODO(b/119251288): Extract out the constants to somewhere shared between
  // the ts files and html files.
  constructor(
      dragulaService: DragulaService, private fhirService: FhirService,
      resourceCodeManager: ResourceCodeManager, private snackBar: MatSnackBar,
      private deleteDialog: MatDialog) {
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    /* Load in the concepts to display, flattening them all into a
     * single-depth array. */
    this.originalConcepts = Array.from(displayGroups.values())
                                .reduce((acc, val) => acc.concat(val), []);
    // Add a textbox at the top of the card list.
    this.addTextbox();
    for (const concept of this.originalConcepts) {
      // We decide the original displayed concepts based on whether any
      // ResourceCodeGroup in the ResourceCodeGroup array associated with one
      // Card is marked as "showByDefault".
      const showByDefault =
          concept.resourceCodeGroups.some(x => x.showByDefault);
      if (showByDefault) {
        this.displayedConcepts.push({'id': uuid(), 'concept': concept});
      }
    }
    this.setUpDrag(dragulaService);
  }

  // Ensures that the order of displayed concepts is updated as the user drags
  // cards around.
  private setUpDrag(dragulaService: DragulaService) {
    this.subs.add(dragulaService.drop('graphcards').subscribe((value) => {
      // These cases are dragging from within the card holder.
      if (value.source.id === this.CARDHOLDER &&
          value.target.id === this.CARDHOLDER) {
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
      }
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

  // Listen for an event indicating that the date range has been changed on the
  // UI, and update the date range.
  changeDateRange($event) {
    this.dateRange = $event;
  }

  // Saves a snapshot of the graph drawer HTML to the EHR using a FhirService.
  snapshot() {
    this.fhirService.saveStaticNote(
        document.getElementsByClassName('cardContainer')[0].innerHTML,
        DateTime.fromJSDate(new Date()).toISO());
  }

  // Listen for an event indicating that a "delete" button has been clicked on a
  // card currently displayed, and update the displayed concepts
  // accordingly after asking for confirmation of deletion.
  private removeDisplayedCard($event) {
    const index = this.displayedConcepts.map(x => x.id).indexOf($event.id);
    const concept = this.displayedConcepts[index];
    concept.value = $event.value;
    this.dialogRef = this.deleteDialog.open(DeleteDialogComponent);
    this.dialogRef.afterClosed().subscribe(result => {
      // The user wishes to delete the card.
      if (result) {
        this.displayedConcepts.splice(index, 1);
        this.recentlyRemoved.clear();
        this.recentlyRemoved.set(index, concept);
        this.openSnackBar();
      }
    });
  }

  // Open a snack bar allowing for the user to potentially reverse the removal
  // of cards from the page. Only one snack bar can be opened at a time.
  private openSnackBar() {
    const message =
        this.recentlyRemoved.size > 1 ? 'Cards removed.' : 'Card removed.';
    const snackBarRef = this.snackBar.open(message, 'Undo', {
      duration:
          this.DISPLAY_TIME,  // Wait 6 seconds before dismissing the snack bar.
    });
    // Undo the most recent deletion according to what is stored in
    // recentlyRemoved.
    snackBarRef.onAction().subscribe(() => {
      for (const index of Array.from(this.recentlyRemoved.keys())
               .sort((a, b) => a - b)) {
        this.displayedConcepts.splice(
            index, 0, this.recentlyRemoved.get(index));
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
   * Listens for an event indicating that the user has edited the points on the
   * custom timeline, and updates the x-axis eventlines displayed on all other
   * charts.
   * @param $event The array of eventlines for each chart to display.
   *
   */

  updateEventLines($event) {
    this.eventlines = $event;
  }
}
