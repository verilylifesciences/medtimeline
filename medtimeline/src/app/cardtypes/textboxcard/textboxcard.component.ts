// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, ElementRef, EventEmitter, Inject, Input, Output, ViewChild} from '@angular/core';
import {UI_CONSTANTS_TOKEN} from 'src/constants';
/**
 * A Material Card that displays a label, a textbox, and a draggable handle
 * in a row.
 */
@Component({
  selector: 'app-textboxcard',
  templateUrl: './textboxcard.component.html',
})
export class TextboxcardComponent {
  @ViewChild('textArea') textAreaElement: ElementRef;
  @Input() id: string;

  /** Propogate remove events up to the card container.  */
  @Output() removeEvent = new EventEmitter();

  // Holds the text typed in the input field of the textbox.
  @Input() noteString: string;

  inEditMode = false;


  constructor(@Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {}

  updateValue() {
    this.textAreaElement.nativeElement.innerHTML = this.noteString;
  }

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    // We pass a 'value' field with the contents of the textbox so that, in case
    // of restoration of a deleted textbox, the previous value can be displayed.
    this.removeEvent.emit({id: this.id, value: this.noteString});
  }

  edit() {
    this.inEditMode = true;
  }

  save() {
    this.inEditMode = false;
  }

  getHintText() {
    if (this.inEditMode) {
      return this.uiConstants.SAVE_TEXT_HINT;
    } else {
      return this.uiConstants.EDIT_TEXT_HINT;
    }
  }
}
