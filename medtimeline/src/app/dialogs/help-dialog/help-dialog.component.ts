import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';


/**
 * This class holds the logic and template for a tutorial stepper dialog.
 */
@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.component.html',
  styleUrls: ['./help-dialog.component.css']
})
export class HelpDialogComponent {
  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>) {}

  onExit() {
    this.dialogRef.close();
  }
}
