// Copyright 2019 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';

import {IndexPage} from '../../../index.po';

import {DiagnosticGraphPage} from './diagnosticGraph.po';
import {StartupPage} from '../../../startup/startup.po';
import {CardContainerPage} from '../../cardcontainer.po';
import {PATIENT_ENCOUNTER} from '../../../constants';

describe('Diagnostic Graph', async () => {
  const index: IndexPage = new IndexPage();
  const diagnosticGraph: DiagnosticGraphPage = new DiagnosticGraphPage();
  const startup: StartupPage = new StartupPage();
  const page = new CardContainerPage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;

  beforeEach(async () => {
    // Only select radiology graph and the correct patient encounter
    await browser.get('/setup');
    // Clicks the first Patient Encounter radio button when choosing time period
    startup.clickButton('mat-radio-label-content', PATIENT_ENCOUNTER[0]);
    startup.getClearSelectionButton().click();
    // Clicks the checkbox for radiology when choosing data timelines
    startup.clickButton('mat-checkbox-label', 'Radiology');
    index.navigateToMainPage();
  });

  it('only radiology card should be displayed in addition to '
        + 'customizable timeline and textbox', async () => {
    const cardLabels = [];
    const cards = page.getCards();
    await cards.each(async function(el) {
      if (await page.hasCardLabel(el)) {
        cardLabels.push(await page.getCardLabel(el));
      }
    });

    // There are three cards in total: Custom Timeline, textbox,
    // and radiology. Textbox does not have a label
    expect(cardLabels.length).toEqual(2);

    expect(cardLabels).toEqual(['Custom Timeline', 'Radiology']);
  });
});
