// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Inject, Input, Output} from '@angular/core';
import * as Color from 'color';
import {BOSTON_WARM_GRAY} from 'src/app/theme/bch_colors';
import {UI_CONSTANTS_TOKEN} from 'src/constants';

/**
 * This is the base template for all the cards in this app. It will show a
 * colored bar on the left hand side with icons for actions, and then
 * optionally a label and legend, then the contents of the card.
 */
@Component({
  selector: 'app-card',
  templateUrl: './card.component.html',
  styleUrls: ['./card.component.css']
})
export class CardComponent {
  @Input() color: Color = BOSTON_WARM_GRAY;
  @Input() id: string;
  @Input() label: string;
  @Input() isDraggable = true;
  @Input() isEditable = false;
  @Input() isRemovable = true;

  @Output() renderEvent = new EventEmitter();
  @Output() removeEvent = new EventEmitter();
  @Output() editEvent = new EventEmitter();
  @Output() saveEvent = new EventEmitter();

  inEditMode = false;

  constructor(@Inject(UI_CONSTANTS_TOKEN) readonly uiConstants: any) {}

  // The events below need to get propogated up to the card container.

  // Called when the user clicks the trashcan button on the card.
  remove() {
    this.removeEvent.emit(this.id);
  }

  // Called when the card resizes.
  resize($event) {
    this.renderEvent.emit($event);
  }

  // Called when the user clicks on the edit button.
  edit($event) {
    this.inEditMode = true;
    this.editEvent.emit($event);
  }

  // Called when the user hits the save button to exit out of edit mode.
  save($event) {
    this.inEditMode = false;
    this.saveEvent.emit($event);
  }
}
