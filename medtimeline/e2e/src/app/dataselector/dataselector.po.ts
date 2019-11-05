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

  /** Wait for the menu to load */
  async waitForMenu() {
    const menu = element(by.css('.mat-menu-panel'));
    return browser.wait(ExpectedConditions.elementToBeClickable(menu), 1000);
  }

  /** Return the first menu. */
  getMenu() {
    return element(by.css('.mat-menu-panel'));
  }

  /**  Return the menu with the given aria-label. */
  getSubMenu(ariaLabel: string) {
    return element(by.css('[aria-label="' + ariaLabel + '"'));
  }

  /**
   * Get the text of menu items that might contain other characters or icons.
   */
  getItemsText(menu: ElementFinder) {
    return menu.all(by.css('.mat-menu-item')).all(by.css('span'));
  }

  /** Get the menu item of the provided menu that has the given text. */
  getMenuItemWithText(menu: ElementFinder, text: string) {
    return menu.element(by.cssContainingText('.mat-menu-item', text));
  }

  /** Get the menu items of the provided menu. */
  getItems(menu: ElementFinder) {
    return menu.all(by.css('.mat-menu-item'));
  }

  /** Wait for the menu to close. */
  async waitForMenuClose(menu: ElementFinder) {
    await browser.wait(
        ExpectedConditions.stalenessOf(menu), jasmine.DEFAULT_TIMEOUT_INTERVAL);
  }

  /** Get the configurationCard sub-element of the element provided. */
  getConfigurationCard(el: ElementFinder) {
    return el.element(by.css('app-data-selector-element'))
        .element(by.css('.configurationCard'));
  }

  async clickOnAddCard() {
    const menu = await this.getMenu();
    const cardOption =
        await this.getMenuItemWithText(menu, 'Add Data Timeline');
    await this.index.waitForClickable(
        cardOption, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cardOption.click();
    await this.index.expectToExist('.mat-menu-panel', true);
  }

  /** Gets all the Items in the Menu for the given concept grouping. */
  async getConceptMenuItems(conceptGrouping: string) {
    await this.clickOnAddCard();
    const subMenu = this.getSubMenu('Concept Selector Menu');
    const conceptItem =
        await this.getMenuItemWithText(subMenu, conceptGrouping);
    await this.index.waitForClickable(
        conceptItem, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await conceptItem.click();

    const conceptMenu = await this.getSubMenu(conceptGrouping + ' Menu');
    const itemsText: any = await this.getItems(conceptMenu).getText();
    return new Set(itemsText.map(item => item.split('No')[0].trim()));
  }

  /**
   * Checks that the Items in the Menu for the given concept grouping are
   * what we expect.
   */
  async checkConceptMenuItems(
      conceptGrouping: string, expectedMenuItems: string[]) {
    const items = await this.getConceptMenuItems(conceptGrouping);
    expect(items).toEqual(new Set(expectedMenuItems));
  }
}
