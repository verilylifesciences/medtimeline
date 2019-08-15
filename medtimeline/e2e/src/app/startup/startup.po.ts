// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {by, element, ElementFinder} from 'protractor';

export class StartupPage {
  /** Get the radio button. */
  getRadioButtons() {
    return element.all(by.css('mat-radio-button'));
  }

  /** Get the label of radio buttons */
  getRadioButtonLabel(button: ElementFinder) {
    return button.getText();
  }

  /** Get the clear selection button */
  getClearSelectionButton() {
    return element(by.buttonText('Clear selection'));
  }

  /** Get the clear selection button */
  getSelectAllButton() {
    return element(by.buttonText('Select all'));
  }

  /**
   * Click the button (radio or checkbox) on the startup screen corresponding to the
   * label that we want.
   * @param className Name of the class that the button resides in
   * @param buttonLabel Label of the radio button that we want to click
   */
  clickButton(className: string, buttonLabel: string) {
    const buttons = element.all(by.className(className));
    buttons.each(button => {
      button.parentElementArrayFinder.getText()
        .then(label => {
          if (label[0] === buttonLabel) {
            button.click();
          }
        });
    });
  }
}
