// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, Inject, Pipe, PipeTransform} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material';
import {DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-confirm-save',
  templateUrl: './confirm-save.component.html',
  styleUrls: ['./confirm-save.component.css']
})

@Pipe({name: 'safe'})
export class ConfirmSaveComponent implements PipeTransform {
  innerHtml: string;
  constructor(
      public dialogRef: MatDialogRef<ConfirmSaveComponent>,
      @Inject(MAT_DIALOG_DATA) public data: string,
      private sanitizer: DomSanitizer) {
    this.innerHtml = this.transform(data);
  }

  transform(htmlString: string): any {
    // TODO(b/129060095): Can we do this without bypassing security?
    return this.sanitizer.bypassSecurityTrustHtml(htmlString);
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
