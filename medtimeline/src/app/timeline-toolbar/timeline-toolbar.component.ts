// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Inject, Output} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {recordGoogleAnalyticsEvent, UI_CONSTANTS_TOKEN} from 'src/constants';

import {environment} from '../../environments/environment';
import {DisplayGrouping} from '../clinicalconcepts/display-grouping';
import {ResourceCodeManager} from '../clinicalconcepts/resource-code-manager';
import {AxisGroup} from '../graphtypes/axis-group';
import {HelpDialogComponent} from '../help-dialog/help-dialog.component';
import {IfuDialogComponent} from '../ifu-dialog/ifu-dialog.component';

@Component({
  selector: 'app-timeline-toolbar',
  templateUrl: './timeline-toolbar.component.html',
  styleUrls: ['../cardcontainer/cardcontainer.component.css']
})
export class TimelineToolbarComponent {
  readonly displayGroupings: Array<[DisplayGrouping, AxisGroup[]]>;
  readonly showMockDataMessage = environment.useMockServer;

  @Output() saveSnapshot = new EventEmitter<null>();
  @Output() addTextbox = new EventEmitter<null>();

  constructor(
      resourceCodeManager: ResourceCodeManager, private helpDialog: MatDialog,
      private ifuDialog: MatDialog,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {
    const displayGroups = resourceCodeManager.getDisplayGroupMapping();
    this.displayGroupings = Array.from(displayGroups.entries());
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
    const dialogRef = this.helpDialog.open(HelpDialogComponent);
    recordGoogleAnalyticsEvent(
        'viewTutorial', 'tutorial', new Date().toDateString());
  }

  openIFU() {
    const dialogRef = this.ifuDialog.open(IfuDialogComponent);
    recordGoogleAnalyticsEvent(
        'viewTutorial', 'tutorial', new Date().toDateString());
  }
}
