// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, ElementRef, ViewChild} from '@angular/core';
import {DraggablecardComponent} from '../draggablecard/draggablecard.component';

@Component({
  selector: 'app-textboxcard',
  styleUrls: ['../cardstyles.css'],
  templateUrl: './textboxcard.component.html',
  providers:
      [{provide: DraggablecardComponent, useExisting: TextboxcardComponent}]
})

/**
 * A Material Card that displays a label, a textbox, and a draggable handle
 * in a row.
 */
export class TextboxcardComponent extends DraggablecardComponent {
  @ViewChild('textArea') textAreaElement: ElementRef;

  // Holds the text typed in the input field of the textbox.
  noteString: string;

  updateValue() {
    this.textAreaElement.nativeElement.innerHTML = this.noteString;
  }

  // Remove the focus from the text area.
  private unfocus() {
    this.textAreaElement.nativeElement.blur();
  }

  // Show the save button.
  private showSave() {
    document.getElementById('save' + this.id).style.visibility = 'visible';
  }

  // Hide the save button.
  private hideSave() {
    document.getElementById('save' + this.id).style.visibility = 'hidden';
  }
}
