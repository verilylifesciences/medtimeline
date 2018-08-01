import {Component} from '@angular/core';
import {MatDialogRef} from '@angular/material';

@Component({
  selector: 'app-help-dialog',
  templateUrl: './help-dialog.component.html',
  styleUrls: ['./help-dialog.component.css']
})

/**
 * This class holds the logic and template for a tutorial stepper dialog.
 * TODO(b/122670756): Change wording and pictures in the tutorial.
 */
export class HelpDialogComponent {
  constructor(public dialogRef: MatDialogRef<HelpDialogComponent>) {}

  onExit() {
    this.dialogRef.close();
  }
}
