// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';

import {IndexPage} from '../index.po';

import {CustomizableTimelinePage} from './customizable-timeline.po';

describe('Customizable Timeline', () => {
  const index: IndexPage = new IndexPage();
  const customTimeline: CustomizableTimelinePage =
      new CustomizableTimelinePage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  const flag = customTimeline.getFlag();
  const expandId = '[id*="expand-"]';
  const deleteId = '[id*="delete-"]';

  beforeEach(async () => {
    await browser.get('/setup');
    await index.navigateToMainPage();
    const timeline = customTimeline.getGraph();
    const editIcon = customTimeline.getEditIcon();
    await editIcon.click();
    await index.clickOnElement(timeline, 150, 100);
    await customTimeline.waitForDialog();
  });

  it('should get dialog to appear after clicking on timeline', async () => {
    await index.expectToExist('mat-dialog-container');
  });

  it('should not close dialog without title', async () => {
    await customTimeline.getSaveButton().click();
    await index.expectToExist('mat-dialog-container');
  });

  it('should close dialog with title', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();
    await index.expectToExist('mat-dialog-container', false);
  });

  it('flag should not appear with cancel', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    const cancelButton = customTimeline.getCancelButton();
    await index.waitForClickable(
        cancelButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cancelButton.click();
    await index.expectToExist('[class*="tooltip-whole"]', false);
  });

  it('title should appear in flag correctly', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    await index.getText((await flag), '[class*="tooltip-title-custom"]')
        .then(title => expect(title).toEqual('title'));
  });

  it('background color of flag should be set properly', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    let selectedColor;
    await customTimeline.getSelectedColor().then(x => selectedColor = x);
    await customTimeline.clickOnSaveButton();
    await index.getStyle((await flag), 'background-color')
        .then(color => expect(color).toEqual(selectedColor));
  });

  it('drop down arrow should appear after hovering over flag', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const arrow = await index.getElement((await flag), expandId);
    const initialVisibilityArrow = await index.getStyle(arrow, 'visibility');

    await index.waitForClickable(await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.hoverOverElement(await flag);
    const finalVisibilityArrow = await index.getStyle(arrow, 'visibility');

    expect(initialVisibilityArrow).toEqual('hidden');
    expect(finalVisibilityArrow).toEqual('visible');
  });

  it('delete icon should appear after hovering over flag', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const deleteIcon = await index.getElement(await flag, deleteId);
    const initialVisibilityDelete =
        await index.getStyle(deleteIcon, 'visibility');

    await index.waitForClickable(await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.hoverOverElement(await flag);
    const finalVisibilityDelete =
        await index.getStyle(deleteIcon, 'visibility');

    expect(initialVisibilityDelete).toEqual('hidden');
    expect(finalVisibilityDelete).toEqual('visible');
  });

  it('clicking on the delete icon should remove the flag', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const deleteIcon = await index.getElement(await flag, deleteId);
    await index.waitForClickable(await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.hoverOverElement(await flag);
    await index.waitForClickable(deleteIcon, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(deleteIcon);

    await index.expectToExist(deleteId, false);
  });

  it('clicking on the expand icon should show the description', async () => {
    await index.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.enterText(customTimeline.getTitleField(), 'title');
    await index.enterText(customTimeline.getDescriptionField(), 'description');
    await customTimeline.clickOnSaveButton();
    const arrow = await index.getElement(await flag, expandId);

    const description = await index.getElement(
        await flag, '[class*="tooltip-details-custom-"]');
    const initialDisplay = await index.getStyle(description, 'display');

    await index.waitForClickable(await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(arrow);

    await index.getText(await flag, '[class*="tooltip-details-text-"]')
        .then(d => expect(d).toEqual('description'));

    const finalDisplay = await index.getStyle(description, 'display');
    expect(initialDisplay).toEqual('none');
    expect(finalDisplay).toEqual('inline-block');
  });

  it('edit icon should appear after hovering over flag', async () => {
    await index.enterText(customTimeline.getTitleField(), 'title');

    await customTimeline.clickOnSaveButton();

    await index.hoverOverElement(await flag);
    const arrow = await index.getElement(await flag, expandId);
    await index.waitForClickable(arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(arrow);

    const edit = await index.getElement(await flag, '[id*="edit-"]');
    await index.waitForClickable(await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.hoverOverElement(await flag);
    const visibility = await index.getStyle(edit, 'visibility');

    expect(visibility).toEqual('visible');
  });

  it('clicking on edit icon should make populated dialog appear', async () => {
    await index.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.enterText(customTimeline.getTitleField(), 'title');
    await index.enterText(customTimeline.getDescriptionField(), 'description');

    await customTimeline.clickOnSaveButton();

    await index.hoverOverElement(await flag);
    const arrow = await index.getElement(await flag, expandId);
    await index.waitForClickable(arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(arrow);

    const edit = await index.getElement(await flag, '[id*="edit-"]');
    await index.waitForClickable(edit, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(edit);

    await customTimeline.waitForDialog();

    await customTimeline.getTitleField().getAttribute('value').then(
        title => expect(title).toEqual('title'));
    await customTimeline.getDescriptionField().getAttribute('value').then(
        description => expect(description).toEqual('description'));
  });

  it('editing inside dialog should change contents of flag', async () => {
    await index.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.enterText(customTimeline.getTitleField(), 'title');
    await index.enterText(customTimeline.getDescriptionField(), 'description');

    await customTimeline.clickOnSaveButton();

    await index.hoverOverElement(await flag);
    const arrow = await index.getElement(await flag, expandId);
    await index.waitForClickable(arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(arrow);

    const edit = await index.getElement(await flag, '[id*="edit-"]');
    await index.waitForClickable(edit, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(edit);

    await customTimeline.waitForDialog();

    await index.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.enterText(customTimeline.getTitleField(), '!!!');
    await index.enterText(customTimeline.getDescriptionField(), '!!!');

    await customTimeline.clickOnSaveButton();

    // Avoid stale element reference error.
    const updatedFlag = await customTimeline.getFlag();
    await index.getText(updatedFlag, '[class*="tooltip-title-custom"]')
        .then(title => expect(title).toEqual('title!!!'));

    await index.hoverOverElement(updatedFlag);
    const updatedArrow = await index.getElement(await updatedFlag, expandId);
    await index.waitForClickable(
        updatedArrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await index.clickOnElement(updatedArrow);
    await index.getText(updatedFlag, '[class*="tooltip-details-text"]')
        .then(title => expect(title).toEqual('description!!!'));
  });
});
