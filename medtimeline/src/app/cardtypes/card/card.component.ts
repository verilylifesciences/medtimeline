// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Input, Output} from '@angular/core';
import * as Color from 'color';
import {BOSTON_WARM_GRAY, SELECTED} from 'src/app/theme/bch_colors';

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

  @Output() onRender = new EventEmitter();
  @Output() onRemove = new EventEmitter();
  @Output() onCheck = new EventEmitter();

  // Holds checkbox status.
  isChecked = false;

  // Holds the color this card's background should be.
  selectionIndicationColor: Color = 'white';

  // This event switches the background color of this card, indicating whether
  // or not the card is selected.
  toggleBackground() {
    if (this.isChecked) {
      // Change background color to make the card appear as "selected".
      this.selectionIndicationColor = SELECTED;
    } else {
      this.selectionIndicationColor = 'white';
    }
  }

  // The three events below need to get propogated up to the card container.

  // Fires an event indicating the user clicked the checkbox.
  check($event) {
    this.toggleBackground();
    this.onCheck.emit({checked: $event.checked, id: this.id});
  }

  // Called when the user clicks the trashcan button on the card.
  remove() {
    this.onRemove.emit(this.id);
  }

  // Called when the card resizes.
  resize($event) {
    this.onRender.emit($event);
  }
}
