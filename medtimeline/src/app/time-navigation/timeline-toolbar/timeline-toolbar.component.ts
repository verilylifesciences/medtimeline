// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Inject, Output} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import {recordGoogleAnalyticsEvent, UI_CONSTANTS_TOKEN} from 'src/constants';
import {environment} from '../../../environments/environment';
import {DisplayGrouping} from '../../clinicalconcepts/display-grouping';
import {ResourceCodeCreator} from '../../conceptmappings/resource-code-creator';
import {ResourceCodeManager} from '../../conceptmappings/resource-code-manager';
import {HelpDialogComponent} from '../../dialogs/help-dialog/help-dialog.component';
import {IfuDialogComponent} from '../../dialogs/ifu-dialog/ifu-dialog.component';
import {FhirService} from '../../fhir-server/fhir.service';
import {AxisGroup} from '../../graphs/graphtypes/axis-group';

@Component({
  selector: 'app-timeline-toolbar',
  templateUrl: './timeline-toolbar.component.html',
  styleUrls: ['../../cardcontainer/cardcontainer.component.css']
})
export class TimelineToolbarComponent {
  displayGroupings: Array<[DisplayGrouping, AxisGroup[]]>;
  readonly showMockDataMessage = environment.useMockServer;

  @Output() saveSnapshot = new EventEmitter<null>();
  @Output() addTextbox = new EventEmitter<null>();

  constructor(
      fhirService: FhirService, resourceCodeManager: ResourceCodeManager,
      private helpDialog: MatDialog, private ifuDialog: MatDialog,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any,
      resourceCodeCreator: ResourceCodeCreator) {
    resourceCodeManager.getDisplayGroupMapping(fhirService, resourceCodeCreator)
        .then((displayGroups) => {
          this.displayGroupings = Array.from(displayGroups.entries());
        });
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
