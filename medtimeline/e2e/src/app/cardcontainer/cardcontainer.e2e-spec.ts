// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser} from 'protractor';

import {IndexPage} from '../index.po';

import {CardContainerPage} from './cardcontainer.po';

describe('Card Container', () => {
  const page = new CardContainerPage();
  const index = new IndexPage();
  const cards = page.getCards();
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
    expect(title).toEqual('Medtimeline');
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

       // We display 19 cards by default, with one being a textbox. A textbox
       // does not have a label, and would not be in this list.
       expect(cardLabels.length).toEqual(20);

       expect(cardLabels).toEqual([
         'Custom Timeline',
         'Body temperature',
         'Heart Rate',
         'Respiratory Rate',
         'SpO2',
         'Blood Pressure',
         'C-Reactive Protein',
         'ESR',
         'BUN',
         'Creatinine',
         'Alanine Aminotransferase (ALT)',
         'Aspartate Aminotransferase (AST)',
         'Alkaline Phosphatase',
         'Bilirubin, Direct',
         'Bilirubin, Total',
         'Complete Blood Count White Blood Cell',
         'Vancomycin & Gentamicin Summary',
         'Vancomycin',
         'Stool',
         'NP Swab'
       ]);
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


  it('remove icons should only appear on hover', async () => {
    await cards.each(async function(el) {
      const card = await index.getElement(el, 'mat-card');

      const deleteIcon = await index.getElement(card, '.removeCardButton');
      const initialDeleteIconOpacity =
          await index.getStyle(deleteIcon, 'opacity');
      expect(initialDeleteIconOpacity).toEqual('0');

      await index.hoverOverElement(card);

      const finalDeleteIconOpacity =
          await index.getStyle(deleteIcon, 'opacity');
      expect(Number(finalDeleteIconOpacity)).toEqual(0.8);
    });
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
