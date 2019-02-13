// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';

export class DataSelectorPage {
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

  // Get the first add card button.
  getAddCardButton() {
    return element(by.css('app-data-selector-menu'))
        .element(by.css('.toolbarButton'));
  }

  // Wait for the menu to load.
  async waitForMenu() {
    const menu = element(by.css('.mat-menu-panel'));
    return browser.wait(ExpectedConditions.elementToBeClickable(menu), 1000);
  }

  // Return the first menu.
  getMenu() {
    return element(by.css('.mat-menu-panel'));
  }

  // Return the index-th menu.
  getSubMenu(index: number) {
    return element.all(by.css('.mat-menu-panel')).get(index);
  }

  // Get the text of menu items that might contain other characters or icons.
  getItemsText(menu: ElementFinder) {
    return menu.all(by.css('.mat-menu-item')).all(by.css('span'));
  }

  // Get the menu items of the provided menu.
  getItems(menu: ElementFinder) {
    return menu.all(by.css('.mat-menu-item'));
  }

  // Wait for the menu to close.
  async waitForMenuClose(menu: ElementFinder) {
    await browser.wait(
        ExpectedConditions.stalenessOf(menu), jasmine.DEFAULT_TIMEOUT_INTERVAL);
  }

  // Get the configurationCard sub-element of the element provided.
  getConfigurationCard(el: ElementFinder) {
    return el.element(by.css('app-data-selector-element'))
        .element(by.css('.configurationCard'));
  }

  async clickOnAddCard() {
    const menu = await this.getMenu();
    const cardOption = await this.getItems(menu).get(2);
    await this.waitForClickable(cardOption, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cardOption.click();
    await this.expectToExist('.mat-menu-panel', true);
  }
}
