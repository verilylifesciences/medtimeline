// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, ElementRef, EventEmitter, Input, Output, ViewChild} from '@angular/core';

@Component({
  selector: 'app-textboxcard',
  templateUrl: './textboxcard.component.html',
})

/**
 * A Material Card that displays a label, a textbox, and a draggable handle
 * in a row.
 */
export class TextboxcardComponent {
  @ViewChild('textArea') textAreaElement: ElementRef;
  @Input() id: string;

  /** Propogate remove events up to the card container.  */
  @Output() onRemove = new EventEmitter();

  // Holds the text typed in the input field of the textbox.
  @Input() noteString: string;

  inEditMode = false;

  updateValue() {
    this.textAreaElement.nativeElement.innerHTML = this.noteString;
  }

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    // We pass a 'value' field with the contents of the textbox so that, in case
    // of restoration of a deleted textbox, the previous value can be displayed.
    this.onRemove.emit({id: this.id, value: this.noteString});
  }

  edit() {
    this.inEditMode = true;
  }

  save() {
    this.inEditMode = false;
  }

  getHintText() {
    if (this.inEditMode) {
      return 'Click the save button to save annotation';
    } else {
      return 'Click the edit button to modify annotation';
    }
  }
}
