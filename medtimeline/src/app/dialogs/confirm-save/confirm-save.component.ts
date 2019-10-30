// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {AfterViewInit, Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';

@Component({
  selector: 'app-confirm-save',
  templateUrl: './confirm-save.component.html',
  styleUrls: ['./confirm-save.component.css']
})
export class ConfirmSaveComponent implements AfterViewInit {
  innerHtml: string;
  constructor(
      public dialogRef: MatDialogRef<ConfirmSaveComponent>,
      @Inject(MAT_DIALOG_DATA) readonly data: HTMLCanvasElement) {}

  ngAfterViewInit() {
    this.data.setAttribute('id', 'previewImg');
    this.data.setAttribute('style', 'width:500px');
    document.getElementById('previewCanvas').appendChild(this.data);
  }

  // The user does not wish to save the snapshot.
  onExit() {
    this.dialogRef.close();
  }

  // The user wishes to save the snapshot.
  onConfirm() {
    this.dialogRef.close({
      save: true,
    });
  }
}
