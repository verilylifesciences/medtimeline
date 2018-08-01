// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {Component, EventEmitter, Input, Output} from '@angular/core';
import {SELECTED} from 'src/app/theme/bch_colors';

@Component({
  selector: 'app-draggablecard',
  template: '',
  styleUrls: ['../cardstyles.css'],
})

/**
 * A Material Card that is draggable and removable.
 */
export class DraggablecardComponent {
  // The unique id for this displayed draggable card.
  @Input() id: string;
  @Output() deleteEvent = new EventEmitter();
  @Output() checkedEvent = new EventEmitter();

  isChecked = false;

  // Fires an event indicating the user clicked the checkbox.
  checkboxChange($event) {
    this.toggleBackground($event.checked);
    this.checkedEvent.emit({checked: $event.checked, id: this.id});
  }

  // This event switches the background color of this card, indicating whether
  // or not the card is selected.
  toggleBackground(selected: boolean) {
    if (selected) {
      // Change background color to make the card appear as "selected".
      document.getElementById(this.id).style.backgroundColor = SELECTED;
    } else {
      document.getElementById(this.id).style.backgroundColor = 'white';
    }
  }
  // Called when the user clicks the trashcan button on the card.
  removeCard() {
    this.deleteEvent.emit(this.id);
  }
}
