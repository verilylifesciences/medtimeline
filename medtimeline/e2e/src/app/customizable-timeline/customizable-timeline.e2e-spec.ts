// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import 'jasmine';

import {browser} from 'protractor';

import {CustomizableTimelinePage} from './customizable-timeline.po';

describe('Customizable Timeline', () => {
  const customTimeline: CustomizableTimelinePage =
      new CustomizableTimelinePage();
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 50 * 1000;
  const flag = customTimeline.getFlag();
  const expandId = '[id*="expand-"]';
  const deleteId = '[id*="delete-"]';

  beforeEach(async () => {
    await browser.get('/');
    const timeline = customTimeline.getGraph();
    const editIcon = customTimeline.getEditIcon();
    await editIcon.click();
    await customTimeline.clickOnElement(timeline, 150, 100);
    await customTimeline.waitForDialog();
  });

  it('should get dialog to appear after clicking on timeline', async () => {
    await customTimeline.expectToExist('mat-dialog-container');
  });

  it('should not close dialog without title', async () => {
    await customTimeline.getSaveButton().click();
    await customTimeline.expectToExist('mat-dialog-container');
  });

  it('should close dialog with title', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();
    await customTimeline.expectToExist('mat-dialog-container', false);
  });

  it('flag should not appear with cancel', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    const cancelButton = customTimeline.getCancelButton();
    await customTimeline.waitForClickable(
        cancelButton, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await cancelButton.click();
    await customTimeline.expectToExist('[class*="tooltip-whole"]', false);
  });

  it('title should appear in flag correctly', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    await customTimeline
        .getText((await flag), '[class*="tooltip-title-custom"]')
        .then(title => expect(title).toEqual('title'));
  });

  it('background color of flag should be set properly', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    let selectedColor;
    await customTimeline.getSelectedColor().then(x => selectedColor = x);
    await customTimeline.clickOnSaveButton();
    await customTimeline.getStyle((await flag), 'background-color')
        .then(color => expect(color).toEqual(selectedColor));
  });

  it('drop down arrow should appear after hovering over flag', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const arrow = await customTimeline.getElement((await flag), expandId);
    const initialVisibilityArrow =
        await customTimeline.getStyle(arrow, 'visibility');

    await customTimeline.waitForClickable(
        await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.hoverOverElement(await flag);
    const finalVisibilityArrow =
        await customTimeline.getStyle(arrow, 'visibility');

    expect(initialVisibilityArrow).toEqual('hidden');
    expect(finalVisibilityArrow).toEqual('visible');
  });

  it('delete icon should appear after hovering over flag', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const deleteIcon = await customTimeline.getElement(await flag, deleteId);
    const initialVisibilityDelete =
        await customTimeline.getStyle(deleteIcon, 'visibility');

    await customTimeline.waitForClickable(
        await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.hoverOverElement(await flag);
    const finalVisibilityDelete =
        await customTimeline.getStyle(deleteIcon, 'visibility');

    expect(initialVisibilityDelete).toEqual('hidden');
    expect(finalVisibilityDelete).toEqual('visible');
  });

  it('clicking on the delete icon should remove the flag', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.clickOnSaveButton();

    const deleteIcon = await customTimeline.getElement(await flag, deleteId);
    await customTimeline.waitForClickable(
        await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.hoverOverElement(await flag);
    await customTimeline.waitForClickable(
        deleteIcon, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(deleteIcon);

    await customTimeline.expectToExist(deleteId, false);
  });

  it('clicking on the expand icon should show the description', async () => {
    await customTimeline.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.enterText(
        customTimeline.getDescriptionField(), 'description');
    await customTimeline.clickOnSaveButton();
    const arrow = await customTimeline.getElement(await flag, expandId);

    const description = await customTimeline.getElement(
        await flag, '[class*="tooltip-details-custom-"]');
    const initialDisplay =
        await customTimeline.getStyle(description, 'display');

    await customTimeline.waitForClickable(
        await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(arrow);

    await customTimeline.getText(await flag, '[class*="tooltip-details-text-"]')
        .then(d => expect(d).toEqual('description'));

    const finalDisplay = await customTimeline.getStyle(description, 'display');
    expect(initialDisplay).toEqual('none');
    expect(finalDisplay).toEqual('inline-block');
  });

  it('edit icon should appear after hovering over flag', async () => {
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');

    await customTimeline.clickOnSaveButton();

    await customTimeline.hoverOverElement(await flag);
    const arrow = await customTimeline.getElement(await flag, expandId);
    await customTimeline.waitForClickable(
        arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(arrow);

    const edit = await customTimeline.getElement(await flag, '[id*="edit-"]');
    await customTimeline.waitForClickable(
        await flag, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.hoverOverElement(await flag);
    const visibility = await customTimeline.getStyle(edit, 'visibility');

    expect(visibility).toEqual('visible');
  });

  it('clicking on edit icon should make populated dialog appear', async () => {
    await customTimeline.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.enterText(
        customTimeline.getDescriptionField(), 'description');

    await customTimeline.clickOnSaveButton();

    await customTimeline.hoverOverElement(await flag);
    const arrow = await customTimeline.getElement(await flag, expandId);
    await customTimeline.waitForClickable(
        arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(arrow);

    const edit = await customTimeline.getElement(await flag, '[id*="edit-"]');
    await customTimeline.waitForClickable(
        edit, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(edit);

    await customTimeline.waitForDialog();

    await customTimeline.getTitleField().getAttribute('value').then(
        title => expect(title).toEqual('title'));
    await customTimeline.getDescriptionField().getAttribute('value').then(
        description => expect(description).toEqual('description'));
  });

  it('editing inside dialog should change contents of flag', async () => {
    await customTimeline.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.enterText(customTimeline.getTitleField(), 'title');
    await customTimeline.enterText(
        customTimeline.getDescriptionField(), 'description');

    await customTimeline.clickOnSaveButton();

    await customTimeline.hoverOverElement(await flag);
    const arrow = await customTimeline.getElement(await flag, expandId);
    await customTimeline.waitForClickable(
        arrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(arrow);

    const edit = await customTimeline.getElement(await flag, '[id*="edit-"]');
    await customTimeline.waitForClickable(
        edit, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(edit);

    await customTimeline.waitForDialog();

    await customTimeline.waitForClickable(
        customTimeline.getTitleField(), jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.enterText(customTimeline.getTitleField(), '!!!');
    await customTimeline.enterText(customTimeline.getDescriptionField(), '!!!');

    await customTimeline.clickOnSaveButton();

    // Avoid stale element reference error.
    const updatedFlag = await customTimeline.getFlag();
    await customTimeline.getText(updatedFlag, '[class*="tooltip-title-custom"]')
        .then(title => expect(title).toEqual('title!!!'));

    await customTimeline.hoverOverElement(updatedFlag);
    const updatedArrow =
        await customTimeline.getElement(await updatedFlag, expandId);
    await customTimeline.waitForClickable(
        updatedArrow, jasmine.DEFAULT_TIMEOUT_INTERVAL);
    await customTimeline.clickOnElement(updatedArrow);
    await customTimeline.getText(updatedFlag, '[class*="tooltip-details-text"]')
        .then(title => expect(title).toEqual('description!!!'));
  });
});
