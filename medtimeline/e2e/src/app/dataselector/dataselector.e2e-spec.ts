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
    await browser.get('/');
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
           ['Add Blank Annotation', 'Add Custom Timeline', 'Add Chart']);
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

    expect(itemsText.map(item => item.split('No')[0].trim())).toEqual([
      'Temperature', 'Heart Rate', 'Respiratory Rate', 'Blood pressure',
      'Oxygen Saturation'
    ]);
    expect(itemsText.length).toEqual(5);
  });

  it('lab results option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addLabs = await dataSelector.getItems(subMenu).get(2);

    await index.waitForClickable(addLabs, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addLabs.click();

    const labsMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(labsMenu).getText();

    expect(itemsText.map(item => item.split('No')[0].trim())).toEqual([
      'C-Reactive Protein', 'ESR', 'BUN', 'Creatinine', 'ALT', 'AST',
      'Alkaline Phosphatase', 'Bilirubin, Direct', 'Bilirubin, Total', 'GGTP',
      'LDH', 'CBC', 'CBC White Blood Cell', 'Urinalysis'
    ]);
    expect(itemsText.length).toEqual(14);
  });

  it('vanc and gent option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addMeds = await dataSelector.getItems(subMenu).get(3);

    await index.waitForClickable(addMeds, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addMeds.click();

    const medsMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(medsMenu).getText();

    expect(itemsText.map(item => item.split('No')[0].trim())).toEqual([
      'Vanc & Gent Summary', 'Vancomycin', 'Gentamicin'
    ]);
    expect(itemsText.length).toEqual(3);
  });

  it('microbio option menu should have correct options', async () => {
    await dataSelector.clickOnAddCard();

    const addMB = await dataSelector.getItems(subMenu).get(4);

    await index.waitForClickable(addMB, jasmine.DEFAULT_TIMEOUT_INTERVAL);

    await addMB.click();

    const mbMenu = await dataSelector.getSubMenu(2);
    const itemsText: any = await dataSelector.getItems(mbMenu).getText();

    expect(itemsText.map(item => item.split('No')[0].trim())).toEqual([
      'Stool', 'NP Swab'
    ]);
    expect(itemsText.length).toEqual(2);
  });

  it('color and text of each clinical concept should reflect no data.',
     async () => {
       // By default, there is no data loaded for any clinical concept, so check
       // that the style of each data selector menu element shows the lack of
       // data.
       await dataSelector.clickOnAddCard();

       const addVitals = await dataSelector.getItems(subMenu).get(1);

       await index.waitForClickable(
           addVitals, jasmine.DEFAULT_TIMEOUT_INTERVAL);

       await addVitals.click();

       const vitalsMenu = await dataSelector.getSubMenu(2);
       const firstVital = await dataSelector.getItems(vitalsMenu).get(0);

       const text: any = await firstVital.getText();
       expect(text).toContain('No data between');

       const confCard = dataSelector.getConfigurationCard(firstVital);
       const color = await index.getStyle(confCard, 'border-left-color');

       // The color of "No Data".
       expect(color).toEqual('rgba(197, 185, 172, 1)');
     });
});
