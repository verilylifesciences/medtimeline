// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';

export class CustomizableTimelinePage {
  // Return the svg portion of the Customizable Graph.
  getGraph() {
    return element(by.css('app-customizable-graph'))
        .element(by.css('.c3'))
        .element(by.css('svg'));
  }

  getEditIcon() {
    return element(by.css('app-customizable-timeline'))
        .element(by.css('app-card'))
        .element(by.css('.editCardIcon'));
  }

  // Wait for an element with the specified selector to load.
  async waitForElement(selector: string) {
    return await browser.isElementPresent(by.css(selector));
  }

  async expectToExist(selector: string, expected = true) {
    await this.waitForElement(selector).then((isPresent: boolean) => {
      expect(isPresent).toBe(expected);
    });
  }

  async waitForClickable(el: ElementFinder, timeout: number) {
    await browser.wait(ExpectedConditions.elementToBeClickable(el), timeout);
  }

  // Hover over the element specified.
  async hoverOverElement(el: ElementFinder) {
    await browser.actions().mouseMove(el).perform();
  }

  // Return the inner element of el, specified by the selector.
  async getElement(el: ElementFinder, selector: string) {
    return el.element(by.css(selector));
  }

  // Get the style value of the element specified.
  getStyle(el: ElementFinder, style: string) {
    return el.getCssValue(style);
  }

  // Enter text to the element specified.
  async enterText(el: ElementFinder, text: string) {
    await el.sendKeys(text);
  }

  // Get the text value of the inner element, specified by selector, of el.
  async getText(el: ElementFinder, selector: string) {
    return el.element(by.css(selector)).getText();
  }

  // Click on the element specified, optionally shifting the mouse coordinates
  // by x and/or y. Default click is in the middle of the element.
  async clickOnElement(el: ElementFinder, x?: number, y?: number) {
    await browser.actions().mouseMove(el, {x: x, y: y}).click().perform();
  }

  // Wait for the CustomizableTimelineDialog element to fully load.
  async waitForDialog() {
    await this.waitForElement('mat-dialog-container');
  }

  // Return the save button in the CustomizableTimelineDialog.
  getSaveButton() {
    return element(by.css('mat-dialog-container')).element(by.id('saveButton'));
  }

  async clickOnSaveButton() {
    const saveButton = this.getSaveButton();
    await this.waitForClickable(saveButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
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
    return element(by.css('app-customizable-graph'))
        .element(by.css('.c3'))
        .element(by.css('[class*="tooltip-custom"]'));
  }

  // Return the title of the flag rendered on the CustomizableGraph.
  async getTitleOfFlag(el: ElementFinder) {
    return el.element(by.css('[class*="tooltip-title-custom"]')).getText();
  }
}
