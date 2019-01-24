// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {browser, by, element} from 'protractor';
import {AppPage} from './app.po';

describe('workspace-project App', () => {
  const page: AppPage = new AppPage();
  it('should display welcome message', () => {
    // TODO(b/118395310): Figure out how to get tests to not time out with HTTP
    // requests in MockFhirService.
    browser.waitForAngularEnabled(false);
    page.navigateTo().then(t => {
      expect(browser.getTitle()).toEqual('Medtimeline');
    });
  });

  it('should display graph card for each clinical concept, in the same order as the checkboxes.',
     () => {
       browser.waitForAngularEnabled(false);
       page.navigateTo()
           .then(t => {
             return element(by.css('mat-sidenav'))
                 .element(by.css('app-sidenav-expander'))
                 .element(by.css('.expander'));
           })
           .then(expander => {
             const button = expander.element(by.css('.buttonExpander'));
             button.click();
             return expander;
           })
           .then(expander => {
             return element(by.css('app-data-selector'));
           })
           .then(parent => {
             const checkboxes = [];
             parent.all(by.css('.expander')).each(function(el, index) {
               const expansionPanel = el.element(by.css('mat-expansion-panel'));
               expansionPanel.click();
               expansionPanel.all(by.css('mat-list-item'))
                   .each(function(el2, index2) {
                     el2.getText().then(text => {
                       checkboxes.push(text);
                     });
                   });
             });
             return checkboxes;
           })
           .then(sideNavCategories => {
             // Check the graph components displayed to see if the labels
             // match.
             const cardContainer = element(by.css('.cardContainer'));
             // Have to search by class and not by 'app-multigraphcard' because
             // the step graph chart does not have a label.
             cardContainer.all(by.css('loincCodeGraphs'))
                 .each(function(el, index) {
                   const label = el.element(by.css('.label'));
                   label.getText().then(text => {
                     expect(sideNavCategories[index]).toEqual(text);
                   });
                 });
           });
     });

  it('should display the expander icon in the correct orientation when a sidebar is expanded.',
     () => {
       browser.waitForAngularEnabled(false);
       page.navigateTo().then(t => {
         const sideNavs = element.all(by.css('mat-sidenav'));
         const sideNavLeft = sideNavs.get(0)
                                 .element(by.css('app-sidenav-expander'))
                                 .element(by.css('.expander'));

         // The left side navigation panel should have the button point right
         // before expanding, and left afterwards.
         sideNavLeft.element(by.css('.buttonExpander'))
             .element(by.css('mat-icon'))
             .getText()
             .then(x => {
               expect(x).toEqual('chevron_right');
             });
         const buttonLeft = sideNavLeft.element(by.css('.buttonExpander'));
         buttonLeft.click();
         sideNavLeft.element(by.css('.buttonExpander'))
             .element(by.css('mat-icon'))
             .getText()
             .then(x => {
               expect(x).toEqual('chevron_left');
             });
       });
     });

  it('should drag graph cards correctly', () => {
    // This test drags the first card below the second card and switches the
    // order of the first two cards. It needs to be dragged *past* the second
    // card, to roughly the position of the third card, to be effective.
    browser.waitForAngularEnabled(false);
    let firstCardOriginalText;
    let secondCardOriginalText;
    page.navigateTo()
        .then(t => {
          const graphs = element.all(by.css('.loincCodeGraphs'));
          const firstCard = graphs.get(0);
          const thirdCard = graphs.get(2);
          firstCard.element(by.css('.label'))
              .getText()
              .then(text => firstCardOriginalText = text);
          graphs.get(1)
              .element(by.css('.label'))
              .getText()
              .then(text => secondCardOriginalText = text);
          browser.actions()
              .mouseDown(firstCard)
              .mouseMove({x: -1, y: -1})
              .mouseMove(thirdCard)
              .mouseUp()
              .perform();
        })
        .then(t => {
          const graphs = element.all(by.css('.loincCodeGraphs'));
          const firstUpdated = graphs.get(0);
          const secondUpdated = graphs.get(1);
          firstUpdated.element(by.css('.label'))
              .getText()
              .then(x => expect(x).toEqual(secondCardOriginalText));
          secondUpdated.element(by.css('.label'))
              .getText()
              .then(x => expect(x).toEqual(firstCardOriginalText));
        });
  });
});
