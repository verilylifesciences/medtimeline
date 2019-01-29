// Copyright 2018 Verily Life Sciences Inc.
//
// Use of this source code is governed by a BSD-style
// license that can be found in the LICENSE file.

import {async, ComponentFixture, TestBed} from '@angular/core/testing';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {MatCardModule, MatCheckboxModule, MatFormFieldModule, MatIconModule, MatInputModule} from '@angular/material';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

import {CardComponent} from './card.component';

describe('CardComponent', () => {
  let component: CardComponent;
  let fixture: ComponentFixture<CardComponent>;

  beforeEach(async(() => {
    TestBed
        .configureTestingModule({
          imports: [
            MatCheckboxModule,
            MatIconModule,
            MatFormFieldModule,
            MatInputModule,
            FormsModule,
            ReactiveFormsModule,
            BrowserAnimationsModule,
            MatCardModule,
            MatInputModule,
            MatIconModule,
            FormsModule,
            ReactiveFormsModule,
            MatCheckboxModule,
          ],
          declarations: [CardComponent]
        })
        .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(CardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
