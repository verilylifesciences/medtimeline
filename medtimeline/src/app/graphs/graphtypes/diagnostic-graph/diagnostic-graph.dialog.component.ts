// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject} from '@angular/core';
import {MatDialogRef, MAT_DIALOG_DATA} from '@angular/material';

@Component({
  selector: 'app-diagnostic-graph-dialog',
  templateUrl: './diagnostic-graph.dialog.component.html'
})

/**
 * Dialog pop-up to display html attachment from the tooltip.
*/
export class DiagnosticGraphDialogComponent {
  readonly htmlAttachment: string;

  /**
   * @param data Information to be displayed on the diagnosticGraph Dialog
   * @param dialogRef Reference to the dialog; used to open and close
   */
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: any,
      public dialogRef: MatDialogRef<DiagnosticGraphDialogComponent>) {
    // data.htmlAttachment has already been sanitized
    if (data) {
      this.htmlAttachment = data.htmlAttachment;
    }
  }

  /**
   * When the close icon is pressed, the dialog closes
  */
  onExit() {
    this.dialogRef.close();
  }
}
