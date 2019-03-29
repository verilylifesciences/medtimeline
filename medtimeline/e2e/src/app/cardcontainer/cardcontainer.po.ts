// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder} from 'protractor';
import {IndexPage} from '../index.po';

export class CardContainerPage {
  index = new IndexPage();

  async getTitle() {
    return await browser.getTitle();
  }

  // Get all cards on the page.
  getCards() {
    return element.all(by.css('.displayedConcept'));
  }

  async getCardLabel(card: ElementFinder) {
    return card.element(by.css('.label')).getText();
  }

  async moveCard(oldPosition: ElementFinder, newPosition: ElementFinder) {
    await browser.actions()
        .mouseDown(oldPosition)
        .mouseMove({x: -1, y: -1})
        .mouseMove(newPosition)
        .mouseUp()
        .perform();
  }

  async hasCardLabel(card: ElementFinder) {
    return this.index.hasInnerElement(card, '.label');
  }

  async hasDataSelector(card: ElementFinder) {
    return this.index.hasInnerElement(card, 'app-data-selector-menu');
  }

  getDataSelectors() {
    return element.all(by.css('app-data-selector-menu'));
  }
  // Wait for the DeleteDialog element to fully load.
  async waitForDialog() {
    await this.index.waitForElement('mat-dialog-container');
  }

  getBackdrop() {
    return element(by.css('.cdk-overlay-backdrop'));
  }
  // Return the cancel button in the CustomizableTimelineDialog.
  getCancelButton() {
    return element(by.css('mat-dialog-container'))
        .element(by.id('noCancelButton'));
  }

  // Return the cancel button in the CustomizableTimelineDialog.
  getDeleteButton() {
    return element(by.css('mat-dialog-container'))
        .element(by.id('yesRemoveButton'));
  }

  async waitForSnackbar() {
    await this.index.waitForElement('.mat-simple-snackbar');
  }

  getUndoButton() {
    return element(by.css('.mat-simple-snackbar'))
        .element(by.css('.mat-button'));
  }
}
