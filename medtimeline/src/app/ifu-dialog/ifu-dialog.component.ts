// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';

@Component({
  selector: 'app-ifu-dialog',
  templateUrl: './ifu-dialog.component.html',
  styleUrls: ['./ifu-dialog.component.css']
})
export class IfuDialogComponent {
  source = '../../assets/documents/instructions_for_use.pdf';
  constructor(public dialogRef: MatDialogRef<IfuDialogComponent>) {}

  onExit() {
    this.dialogRef.close();
  }
}
