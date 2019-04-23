// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {by, element, ElementFinder} from 'protractor';
import {IndexPage} from '../index.po';

export class CustomizableTimelinePage {
  index = new IndexPage();
  // Return the svg portion of the Customizable Graph.
  getGraph() {
    return element(by.css('app-customizable-graph'));
  }

  getEditIcon() {
    return element(by.css('app-customizable-timeline'))
        .element(by.css('app-card'))
        .element(by.css('.editCardIcon'));
  }

  // Wait for the CustomizableTimelineDialog element to fully load.
  async waitForDialog() {
    await this.index.waitForElement('mat-dialog-container');
  }

  // Return the save button in the CustomizableTimelineDialog.
  getSaveButton() {
    return element(by.css('mat-dialog-container')).element(by.id('saveButton'));
  }

  async clickOnSaveButton() {
    const saveButton = this.getSaveButton();
    await this.index.waitForClickable(
        saveButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await saveButton.click();
  }

  // Return the cancel button in the CustomizableTimelineDialog.
  getCancelButton() {
    return element(by.css('mat-dialog-container'))
        .element(by.id('cancelButton'));
  }

  // Return the title input in the CustomizableTimelineDialog.
  getTitleField() {
    return element(by.css('mat-dialog-container'))
        .element(by.id('dialogTitle'));
  }

  // Return the description input in the CustomizableTimelineDialog.
  getDescriptionField() {
    return element(by.css('mat-dialog-container'))
        .element(by.id('dialogDescription'));
  }

  // Return the color selected in the CustomizableTimelineDialog.
  async getSelectedColor() {
    return element(by.css('mat-dialog-container'))
        .element(by.css('.colorPicker'))
        .element(by.css('mat-button-toggle-group'))
        .element(by.css('.mat-button-toggle-checked'))
        .element(by.css('mat-card'))
        .getCssValue('background-color');
  }

  // Return the flag rendered on the CustomizableGraph.
  async getFlag() {
    return element(by.css('[class*="tooltip-custom"]'));
  }

  // Return the title of the flag rendered on the CustomizableGraph.
  async getTitleOfFlag(el: ElementFinder) {
    return el.element(by.css('[class*="tooltip-title-custom"]')).getText();
  }
}
