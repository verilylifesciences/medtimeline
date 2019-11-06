// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';
// tslint:disable-next-line:max-line-length
import {ANTIBIOTICS, ANTIFUNGALS, ANTIVIRALS, LAB_RESULTS, MICROBIO, RADIOLOGY, SUBMENU_DIAGNOSTIC, SUBMENU_LABELS, SUBMENU_LABS, SUBMENU_MICROBIO, SUBMENU_VITALS, VITAL_SIGNS} from '../constants';
import {IndexPage} from '../index.po';

import {DataSelectorPage} from './dataselector.po';

describe('Data Selector', () => {
  const index = new IndexPage();
  const dataSelector = new DataSelectorPage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  const subMenu = dataSelector.getSubMenu('Concept Selector Menu');


  beforeEach(async () => {
    await browser.get('/setup');
    await index.navigateToMainPage();
    await index.expectToExist('.mat-menu-panel', false);
    const dataSelectorButton = dataSelector.getAddCardButton();
    await index.clickOnElement(dataSelectorButton);
    await dataSelector.waitForMenu();
  });

  it('clicking on the add menu button should open the menu', async () => {
    await index.expectToExist('.mat-menu-content');
  });

  it('menu first options should include adding a textbox, custom timeline, and adding a card',
     async () => {
       const menu = await dataSelector.getMenu();
       const itemsText = await dataSelector.getItemsText(menu).getText();
       expect(itemsText).toEqual(
           ['Add Textbox', 'Add Custom Timeline', 'Add Data Timeline']);
     });

  it('menu should close after adding a textbox', async () => {
    const menu = await dataSelector.getMenu();
    const textboxOption =
        await dataSelector.getMenuItemWithText(menu, 'Add Textbox');
    await index.waitForClickable(
        textboxOption, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await textboxOption.click();
    await dataSelector.waitForMenuClose(menu);
    await index.expectToExist('.mat-menu-panel', false);
  });

  it('submenu should open after adding a card', async () => {
    await dataSelector.clickOnAddCard();
    const itemsText = await dataSelector.getItems(subMenu).getText();
    expect(new Set(itemsText)).toEqual(new Set(SUBMENU_LABELS));
  });

  it('top option of submenu should be searching for a concept', async () => {
    await dataSelector.clickOnAddCard();
    const submenu = await dataSelector.getSubMenu('Concept Selector Menu');
    const itemText = await dataSelector.getItems(submenu).get(0).getText();
    expect(itemText).toEqual(SUBMENU_LABELS[0]);
  });

  it('vital signs option menu should have correct options', async () => {
    await dataSelector.checkConceptMenuItems(VITAL_SIGNS, SUBMENU_VITALS);
  });

  it('lab results option menu should have correct options', async () => {
    await dataSelector.checkConceptMenuItems(LAB_RESULTS, SUBMENU_LABS);
  });

  it('radiology option menu should have correct options', async () => {
    await dataSelector.checkConceptMenuItems(RADIOLOGY, SUBMENU_DIAGNOSTIC);
  });

  it('antibiotics option menu should have Antibiotics Summary', async () => {
    const items = await dataSelector.getConceptMenuItems(ANTIBIOTICS);
    expect(items.has(ANTIBIOTICS + ' Summary'));
  });

  it('antivirals option menu should have Antivirals Summary', async () => {
    const items = await dataSelector.getConceptMenuItems(ANTIVIRALS);
    expect(items.has(ANTIVIRALS + ' Summary'));
  });

  it('antifungals option menu should have Antifungals Summary', async () => {
    const items = await dataSelector.getConceptMenuItems(ANTIFUNGALS);
    expect(items.has(ANTIFUNGALS + ' Summary'));
  });

  it('microbio option menu should have correct options', async () => {
    await dataSelector.checkConceptMenuItems(MICROBIO, SUBMENU_MICROBIO);
  });
});
