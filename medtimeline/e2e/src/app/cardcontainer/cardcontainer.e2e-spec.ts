// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser} from 'protractor';

import {ALL_DEFAULT_CARD_LABELS} from '../constants';
import {IndexPage} from '../index.po';

import {CardContainerPage} from './cardcontainer.po';

describe('Card Container', () => {
  const page = new CardContainerPage();
  const index = new IndexPage();
  let cards = page.getCards();
  const intialBackgroundColor = 'rgba(248, 248, 248, 1)';
  const finalBackgroundColor = 'rgba(240, 240, 240, 1)';

  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  beforeEach(async () => {
    await browser.waitForAngularEnabled(false);
    await browser.get('/setup');
    index.navigateToMainPage();
    browser.driver.executeScript(disableCSSAnimation);
    // Disable CSS animations and transitions, to accurately test style changes
    // for CardContainer.
    function disableCSSAnimation() {
      const css = '* {' +
          '-webkit-transition-duration: 0s !important;' +
          'transition-duration: 0s !important;' +
          '-webkit-animation-duration: 0s !important;' +
          'animation-duration: 0s !important;' +
          'transition: none !important;' +
          '}',
            head = document.head || document.getElementsByTagName('head')[0],
            style = document.createElement('style');

      style.type = 'text/css';
      style.appendChild(document.createTextNode(css));
      head.appendChild(style);
    }
  });


  it('should display welcome message', async () => {
    const title = await page.getTitle();
    expect(title).toEqual('MedTimeLine');
  });

  it('should drag graph cards correctly', async () => {
    // This test drags the first card below the second card and switches
    // the order of the first two cards. It needs to be dragged *past* the
    // second card, to roughly the position of the third card, to be effective.

    // The first two cards are the Custom Timeline and the textbox.
    const firstGraph = cards.get(2);
    const thirdGraph = cards.get(4);

    const firstCardOriginalText = await page.getCardLabel(firstGraph);

    const secondCardOriginalText = await page.getCardLabel(cards.get(3));
    await page.moveCard(firstGraph, thirdGraph);

    const updatedCards = page.getCards();
    const firstUpdated = updatedCards.get(2);
    const secondUpdated = updatedCards.get(3);
    expect(firstCardOriginalText)
        .toEqual(await page.getCardLabel(secondUpdated));
    expect(secondCardOriginalText)
        .toEqual(await page.getCardLabel(firstUpdated));
  });

  it('correct number of default cards should be rendered on the page' +
         ', in the correct order',
     async () => {
       const cardLabels = [];
       await cards.each(async function(el) {
         if (await page.hasCardLabel(el)) {
           cardLabels.push(await page.getCardLabel(el));
         }
       });

       // We display 22 cards by default, with one being a textbox. A textbox
       // does not have a label, and would not be in this list.
       expect(cardLabels.length).toEqual(ALL_DEFAULT_CARD_LABELS.length);

       expect(new Set(cardLabels)).toEqual(new Set(ALL_DEFAULT_CARD_LABELS));
     });

  it('all cards should have a data selector after the card', async () => {
    await cards.each(async function(el) {
      expect(await page.hasDataSelector(el)).toBeTruthy();
    });
  });

  it('data selector style should change on hover', async () => {
    const dataSelectors = page.getDataSelectors();

    await dataSelectors.each(async function(el) {
      const addCard = await index.getElement(el, '.addCardInline');
      const initialCardOpacity = await index.getStyle(addCard, 'opacity');

      await index.hoverOverElement(addCard);
      const finalCardOpacity = await index.getStyle(addCard, 'opacity');

      expect(initialCardOpacity).toEqual('0.15');
      expect(Number(finalCardOpacity)).toEqual(1);
    });
  });

  it('data selector color should be correct', async () => {
    const dataSelectors = page.getDataSelectors();

    await dataSelectors.each(async function(el) {
      const addCard = await index.getElement(el, '.addCardInline');
      const color = await index.getStyle(addCard, 'color');
      expect(color).toEqual(intialBackgroundColor);
    });
  });

  it('should correctly delete card', async () => {
    cards = page.getCards();
    const cardLabels = [];
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });

    const tempCard = await index.getElement(cards.get(2), 'mat-card');
    const deleteIcon = await index.getElement(tempCard, '.removeCardButton');
    await deleteIcon.click();

    await page.waitForDialog();
    const deleteButton = page.getDeleteButton();
    await index.waitForClickable(
        deleteButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await deleteButton.click();

    const updatedCardLabels = [];
    const updatedCards = page.getCards();
    await updatedCards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        updatedCardLabels.push(await page.getCardLabel(el));
      }
    });

    expect(updatedCardLabels.length).toEqual(cardLabels.length - 1);
  });

  it('should correctly undo a deletion of card', async () => {
    const cardLabels = [];
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });

    const tempCard = await index.getElement(cards.get(2), 'mat-card');
    const deleteIcon = await index.getElement(tempCard, '.removeCardButton');
    await deleteIcon.click();

    await page.waitForDialog();
    const deleteButton = page.getDeleteButton();
    await index.waitForClickable(
        deleteButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await deleteButton.click();

    await page.waitForSnackbar();
    const undo = await page.getUndoButton();
    await index.waitForClickable(undo, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await undo.click();
    const updatedCardLabels = [];
    const updatedCards = page.getCards();
    await updatedCards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        updatedCardLabels.push(await page.getCardLabel(el));
      }
    });

    expect(updatedCardLabels.length).toEqual(cardLabels.length);

    expect(updatedCardLabels.toString()).toEqual(cardLabels.toString());
  });

  it('should not delete card if canceled', async () => {
    const cardLabels = [];
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });

    const tempCard = await index.getElement(cards.get(2), 'mat-card');
    const deleteIcon = await index.getElement(tempCard, '.removeCardButton');
    await deleteIcon.click();

    await page.waitForDialog();
    const cancelButton = page.getCancelButton();
    await index.waitForClickable(
        cancelButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cancelButton.click();


    const updatedCardLabels = [];
    const updatedCards = page.getCards();
    await updatedCards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        updatedCardLabels.push(await page.getCardLabel(el));
      }
    });

    expect(updatedCardLabels.length).toEqual(cardLabels.length);

    expect(updatedCardLabels.toString()).toEqual(cardLabels.toString());
  });

  it('background of card should change on hover', async () => {
    await cards.each(async function(el) {
      const card = await index.getElement(el, 'mat-card');
      const initialColor = await index.getStyle(card, 'background-color');
      expect(initialColor).toEqual(intialBackgroundColor);

      await index.hoverOverElement(card);

      const finalColor = await index.getStyle(card, 'background-color');
      expect(finalColor).toEqual(finalBackgroundColor);
    });
  });
});
