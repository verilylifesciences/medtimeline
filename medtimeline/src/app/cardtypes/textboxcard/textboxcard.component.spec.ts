// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, fakeAsync, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCheckboxModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {By} from '@angular/platform-browser';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {SELECTED} from 'src/app/theme/bch_colors';

import {TextboxcardComponent} from './textboxcard.component';

describe('TextboxcardComponent', () => {
  let component: TextboxcardComponent;
  let fixture: ComponentFixture<TextboxcardComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            BrowserAnimationsModule,
            MatCardModule,
            MatInputModule,
            MatIconModule,
            FormsModule,
            ReactiveFormsModule,
            MatCheckboxModule,
          ],
          declarations: [TextboxcardComponent]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TextboxcardComponent);
    component = fixture.componentInstance;
    component.id = 'id';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit event to remove textbox', async(() => {
       fixture.detectChanges();
       spyOn(component.deleteEvent, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       fixture.whenStable().then(() => {
         expect(component.deleteEvent.emit).toHaveBeenCalledWith(component.id);
       });
     }));

  it('should correctly toggle background color and emit checkedEvent when checkbox is clicked',
     async(() => {
       fixture.detectChanges();
       const background = fixture.debugElement.query(By.css('#id'));
       spyOn(component.checkedEvent, 'emit');
       component.checkboxChange({checked: true});
       fixture.whenStable().then(() => {
         expect(component.checkedEvent.emit).toHaveBeenCalled();
         expect(background.nativeElement.style.backgroundColor)
             .toEqual('' + SELECTED);
       });
     }));
});
