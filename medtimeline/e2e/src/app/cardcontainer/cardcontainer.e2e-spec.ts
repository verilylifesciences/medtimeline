// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {CardContainerE2eTestingPage} from './cardcontainer.po';

describe('workspace-project App', () => {
  const page: CardContainerE2eTestingPage = new CardContainerE2eTestingPage();
  it('should display welcome message', () => {
    // TODO(b/118395310): Figure out how to get tests to not time out with HTTP
    // requests in MockFhirService.
    page.navigateTo().then(t => {
      expect(page.getTitle()).toEqual('Medtimeline');
    });
  });

  it('should drag graph cards correctly', () => {
    // This test drags the first card below the second card and switches the
    // order of the first two cards. It needs to be dragged *past* the second
    // card, to roughly the position of the third card, to be effective.
    let firstCardOriginalText;
    let secondCardOriginalText;
    page.navigateTo()
        .then(t => {
          const graphs = page.getCards();
          const firstCard = graphs.get(1);
          const thirdCard = graphs.get(3);
          page.getCardLabel(firstCard).then(
              text => firstCardOriginalText = text);
          page.getCardLabel(graphs.get(2))
              .then(text => secondCardOriginalText = text);
          page.moveCard(firstCard, thirdCard);
        })
        .then(t => {
          const graphs = page.getCards();
          const firstUpdated = graphs.get(1);
          const secondUpdated = graphs.get(2);
          page.getCardLabel(firstUpdated)
              .then(x => expect(x).toEqual(secondCardOriginalText));
          page.getCardLabel(secondUpdated)
              .then(x => expect(x).toEqual(firstCardOriginalText));
        });
  });
});
