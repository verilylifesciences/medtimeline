// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';

import {IndexPage} from '../index.po';

import {TextboxCardPage} from './textboxcard.po';



describe('TextboxCard', async () => {
  const index: IndexPage = new IndexPage();
  const textboxCard: TextboxCardPage = new TextboxCardPage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  const editIcon = textboxCard.getEditIcon();
  const formField = textboxCard.getFormField();
  const textbox = textboxCard.getTextboxCard();
  const isDisabled = await index.hasClass(formField, 'mat-form-field-disabled');

  beforeEach(async () => {
    await browser.get('/');
  });

  it('textbox card should be in saved mode by default, with input disabled',
     async () => {
       const editIconText = await editIcon.getText();
       expect(editIconText).toEqual('edit');

       expect(isDisabled).toBeTruthy();
     });

  it('input should not be disabled after clicking on edit button', async () => {
    await editIcon.click();
    const updatedIcon = await index.getElementIndex(textbox, 'mat-icon', 2);
    expect(await updatedIcon.getText()).toEqual('save');

    expect(isDisabled).toBeFalsy();
  });

  it('hint should change after clicking on edit button', async () => {
    const hintText = await index.getText(formField, 'mat-hint');
    expect(hintText).toEqual('Click the edit button to modify annotation');
    await editIcon.click();

    const updatedHint = await index.getText(formField, 'mat-hint');
    expect(updatedHint).toEqual('Click the save button to save annotation');
  });

  it('colorbar color should be correct', async () => {
    const colorbar = await index.getElement(textbox, '.colorbar');
    const color = await index.getStyle(colorbar, 'background-color');

    expect(color).toEqual('rgba(197, 185, 172, 1)');
  });
});
