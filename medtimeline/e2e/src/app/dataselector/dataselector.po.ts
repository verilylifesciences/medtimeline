// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder, ExpectedConditions} from 'protractor';
import {IndexPage} from '../index.po';

export class DataSelectorPage {
  index = new IndexPage();
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
    await this.index.waitForClickable(
        cardOption, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cardOption.click();
    await this.index.expectToExist('.mat-menu-panel', true);
  }
}
