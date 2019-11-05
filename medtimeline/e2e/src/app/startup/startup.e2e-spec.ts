// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser, by, element, ElementArrayFinder, ElementFinder, ExpectedConditions} from 'protractor';

import {CardContainerPage} from '../cardcontainer/cardcontainer.po';
import {ALL_CARD_LABELS_WITH_DATA, PATIENT_ENCOUNTER, TIME_PERIODS} from '../constants';
import {IndexPage} from '../index.po';

import {StartupPage} from './startup.po';


describe('Startup Screen', async () => {
  const index: IndexPage = new IndexPage();
  const startup: StartupPage = new StartupPage();
  const page = new CardContainerPage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;

  beforeEach(async () => {
    await browser.get('/setup');
  });

  it('all time periods should be radio buttons and displayed ' +
         'in the right order',
     async () => {
       await browser.wait(ExpectedConditions.presenceOf(element(
           by.cssContainingText('.mat-radio-button', 'patient encounter'))));
       const radioButtons = startup.getRadioButtons();
       expect(radioButtons.count())
           .toBe(TIME_PERIODS.length + PATIENT_ENCOUNTER.length);

       const buttonLabels = [];
       await radioButtons.each(async function(el) {
         if (await radioButtons.count() > 0) {
           buttonLabels.push(await startup.getRadioButtonLabel(el));
         }
       });
       const allPeriods = PATIENT_ENCOUNTER.concat(TIME_PERIODS);
       expect(buttonLabels).toEqual(allPeriods);
     });

  it('clear selection should clear all cards', async () => {
    const clearSelectionButton = startup.getClearSelectionButton();
    clearSelectionButton.click();
    index.navigateToMainPage();

    const cards = page.getCards();
    const cardLabels = [];
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });
    // There should be only two cards displayed when everything is cleared:
    // the textbox and custom timeline. The textbox does not have a label,
    // and thus would not be in this list.
    expect(cardLabels.length).toEqual(1);

    expect(cardLabels).toEqual(['Custom Timeline']);
  });

  it('select all should select all cards', async () => {
    const selectAllButton = startup.getSelectAllButton();
    selectAllButton.click();
    index.navigateToMainPage();

    const cards = page.getCards();
    const cardLabels = [];
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });
    // There should be 24 cards displayed when everything is cleared:
    // the textbox and custom timeline. The textbox does not have a label,
    // and thus would not be in this list.
    expect(cardLabels.length).toEqual(ALL_CARD_LABELS_WITH_DATA.length);

    expect(new Set(cardLabels)).toEqual(new Set(ALL_CARD_LABELS_WITH_DATA));
  });
});
