// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

/**
 * Shows a dialog asking the user to confirm whether or not they wish to delete
 * the card.
 */
@Component({
  selector: 'app-delete-dialog',
  templateUrl: './delete-dialog.component.html',
  styleUrls: ['../../cardcontainer/cardcontainer.component.css']
})
export class DeleteDialogComponent {
  constructor(
      public dialogRef: MatDialogRef<DeleteDialogComponent>,
      @Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {}

  // The user does not wish to delete the card.
  onExit() {
    this.dialogRef.close();
  }

  // The user wishes to delete the card.
  onConfirm() {
    this.dialogRef.close({
      delete: true,
    });
  }
}
