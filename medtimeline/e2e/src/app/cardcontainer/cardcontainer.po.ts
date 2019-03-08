// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element, ElementFinder} from 'protractor';

export class CardContainerE2eTestingPage {
  navigateTo() {
    browser.waitForAngularEnabled(false);
    return browser.get('/');
  }

  getTitle() {
    return browser.getTitle();
  }

  getCards() {
    return element.all(by.css('.displayedConcept'));
  }

  getCardLabel(card: ElementFinder) {
    return card.element(by.css('.label')).getText();
  }

  moveCard(oldPosition: ElementFinder, newPosition: ElementFinder) {
    browser.actions()
        .mouseDown(oldPosition)
        .mouseMove({x: -1, y: -1})
        .mouseMove(newPosition)
        .mouseUp()
        .perform();
  }
}
