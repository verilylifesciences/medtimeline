// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder, ExpectedConditions, Key} from 'protractor';

export class IndexPage {
  // Wait for an element with the specified selector to load.
  async waitForElement(selector: string) {
    return await browser.isElementPresent(by.css(selector));
  }

  async expectToExist(selector: string, expected = true) {
    await this.waitForElement(selector).then((isPresent: boolean) => {
      expect(isPresent).toBe(expected);
    });
  }

  // Return whether the element is present, without waiting for it to exist.
  async hasInnerElement(el: ElementFinder, selector: string) {
    return el.element(by.css(selector)).isPresent();
  }

  async hasElement(selector: string) {
    return element(by.css(selector)).isPresent();
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

  // Return all of the inner elements of el, specified by the selector.
  async getElementAll(el: ElementFinder, selector: string) {
    return el.all(by.css(selector));
  }

  // Get the index-th inner element of el, specified by the selector.
  getElementIndex(el: ElementFinder, selector: string, index: number) {
    return this.getElementAll(el, selector).then(items => {
      return items[index];
    });
  }

  // Get the style value of the element specified.
  getStyle(el: ElementFinder, style: string) {
    return el.getCssValue(style);
  }

  hasClass(el: ElementFinder, c: string) {
    return el.getAttribute('class').then(classes => {
      return classes.split(' ').indexOf(c) !== -1;
    });
  }

  // Enter text to the element specified.
  async enterText(el: ElementFinder, text: string) {
    await el.sendKeys(text);
  }

  async pressEscape() {
    await browser.actions()
        .sendKeys.call(browser.actions(), Key.ESCAPE)
        .perform();
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

  async navigateToMainPage() {
    const defaultConfigButton = element(by.css('#defaultConfig'));
    await defaultConfigButton.click();

    const continueButton = element(by.css('#continue'));
    await continueButton.click();
  }
}
