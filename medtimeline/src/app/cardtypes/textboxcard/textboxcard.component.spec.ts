// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatTooltipModule} from '@angular/material';
import {MatCardModule} from '@angular/material/card';
import {MatIconModule} from '@angular/material/icon';
import {MatInputModule} from '@angular/material/input';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {UI_CONSTANTS, UI_CONSTANTS_TOKEN} from 'src/constants';

import {CardComponent} from '../card/card.component';

import {TextboxcardComponent} from './textboxcard.component';

describe('TextboxcardComponent', () => {
  let component: TextboxcardComponent;
  let fixture: ComponentFixture<TextboxcardComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            BrowserAnimationsModule, MatCardModule, MatInputModule,
            MatIconModule, FormsModule, ReactiveFormsModule, MatTooltipModule
          ],
          declarations: [TextboxcardComponent, CardComponent],
          providers: [{provide: UI_CONSTANTS_TOKEN, useValue: UI_CONSTANTS}]
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
       spyOn(component.removeEvent, 'emit');
       const button = fixture.debugElement.nativeElement.querySelector(
           'mat-icon.removeCardButton');
       button.click();
       fixture.whenStable().then(() => {
         expect(component.removeEvent.emit)
             .toHaveBeenCalledWith({id: component.id, value: undefined});
       });
     }));
});
