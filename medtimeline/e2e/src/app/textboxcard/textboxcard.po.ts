// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {by, element} from 'protractor';

export class TextboxCardPage {
  // Get the textbox card.
  getTextboxCard() {
    return element(by.css('app-textboxcard'));
  }

  // Get the form field of the textbox card.
  getFormField() {
    return this.getTextboxCard().element(by.css('mat-form-field'));
  }

  getTextArea() {
    return this.getFormField().element('textarea');
  }

  // Get the edit icon of the textbox card.
  getEditIcon() {
    return this.getTextboxCard().element(by.css('.editCardIcon'));
  }
}
