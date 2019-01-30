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
  noteString: string;

  updateValue() {
    this.textAreaElement.nativeElement.innerHTML = this.noteString;
  }

  // Remove the focus from the text area.
  unfocus() {
    this.textAreaElement.nativeElement.blur();
  }

  // Show the save button.
  showSave() {
    document.getElementById('save' + this.id).style.visibility = 'visible';
  }

  // Hide the save button.
  hideSave() {
    document.getElementById('save' + this.id).style.visibility = 'hidden';
  }

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    this.onRemove.emit(this.id);
  }
}
