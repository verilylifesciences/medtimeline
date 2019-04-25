// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';

import {IndexPage} from '../index.po';

import {DataSelectorPage} from './dataselector.po';


describe('Data Selector', () => {
  const index: IndexPage = new IndexPage();
  const dataSelector: DataSelectorPage = new DataSelectorPage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  const subMenu = dataSelector.getSubMenu(1);

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
    const textboxOption = await dataSelector.getItems(menu).get(0);
    await index.waitForClickable(
        textboxOption, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await textboxOption.click();
    await dataSelector.waitForMenuClose(menu);
    await index.expectToExist('.mat-menu-panel', false);
  });

  it('submenu should open after adding a card', async () => {
    await dataSelector.clickOnAddCard();

    const itemsText = await dataSelector.getItems(subMenu).getText();
    expect(itemsText).toEqual([
      'Search for a concept', 'Vital Signs', 'Lab Results',
      'Vancomycin and Gentamicin', 'Microbiology'
    ]);
  });

  it('top option of submenu should be searching for a concept', async () => {
    await dataSelector.clickOnAddCard();

    const itemText = await dataSelector.getItems(subMenu).get(0).getText();
    expect(itemText).toEqual('Search for a concept');
  });

  it('vital signs option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addVitals = await dataSelector.getItems(subMenu).get(1);

    await index.waitForClickable(addVitals, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addVitals.click();

    const vitalsMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(vitalsMenu).getText();

    expect(new Set(itemsText.map(item => item.split('No')[0].trim())))
        .toEqual(new Set([
          'Temperature', 'Heart Rate', 'Respiratory Rate', 'Blood Pressure',
          'Oxygen Saturation (SpO2)'
        ]));
  });

  it('lab results option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addLabs = await dataSelector.getItems(subMenu).get(2);

    await index.waitForClickable(addLabs, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addLabs.click();

    const labsMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(labsMenu).getText();

    expect(new Set(itemsText.map(item => item.split('No')[0].trim())))
        .toEqual(new Set([
          'ALT', 'Alkaline Phosphatase', 'AST (Aspartate Aminotransferase)',
          'Bilirubin, Direct', 'Bilirubin, Total', 'BUN', 'C-Reactive Protein',
          'Complete Blood Count', 'Complete Blood Count White Blood Cell',
          'Creatinine', 'CSF', 'ESR (Erythrocyte Sedimentation Rate)',
          'Other Fluid', 'Uric acid', 'Urinalysis'
        ]));
  });

  it('vanc and gent option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addMeds = await dataSelector.getItems(subMenu).get(3);

    await index.waitForClickable(addMeds, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addMeds.click();

    const medsMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(medsMenu).getText();

    expect(new Set(itemsText.map(item => item.split('No')[0].trim())))
        .toEqual(new Set(
            ['Vancomycin & Gentamicin Summary', 'Vancomycin', 'Gentamicin']));
    expect(itemsText.length).toEqual(3);
  });

  it('microbio option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addMB = await dataSelector.getItems(subMenu).get(4);

    await index.waitForClickable(addMB, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addMB.click();

    const mbMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(mbMenu).getText();

    expect(new Set(itemsText.map(item => item.split('No')[0].trim())))
        .toEqual(new Set(
            ['Blood', 'CSF Microbiology', 'Other', 'Respiratory', 'Stool']));
  });
});
