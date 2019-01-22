// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Output} from '@angular/core';
import {MatDialog} from '@angular/material';

import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeManager, ResourceCodesForCard} from '../clinicalconcepts/resource-code-manager';
import {HelpDialogComponent} from '../help-dialog/help-dialog.component';

@Component({
  selector: 'app-timeline-toolbar',
  templateUrl: './timeline-toolbar.component.html',
})
export class TimelineToolbarComponent {
  readonly displayGroupings: Array<[DisplayGrouping, ResourceCodesForCard[]]>;

  @Output() addCard = new EventEmitter<string>();
  @Output() saveSnapshot = new EventEmitter<null>();
  @Output() addTextbox = new EventEmitter<null>();

  constructor(
      resourceCodeManager: ResourceCodeManager, private dialog: MatDialog) {
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    this.displayGroupings = Array.from(displayGroups.entries());
  }

  // Listens for an event indicating that the user has selected to add the
  // concept card from the top toolbar. The label for the card is sent as an
  // event to CardContainer.
  addConceptCard(label: string) {
    this.addCard.emit(label);
  }

  // Emits an event indicating to CardContainer to save a snapshot of the page.
  snapshot() {
    this.saveSnapshot.emit();
  }

  // Emits an event indicating to CardContainer to add a blank textbox at the
  // top of the page.
  textbox() {
    this.addTextbox.emit();
  }

  openHelpDialog() {
    const dialogRef = this.dialog.open(HelpDialogComponent);
  }
}
