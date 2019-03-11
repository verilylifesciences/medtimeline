import { TestBed } from '@angular/core/testing';

import { DebuggerService } from './debugger.service';

describe('DebuggerService', () => {
  beforeEach(() => TestBed.configureTestingModule({}));

  it('should be created', () => {
    const service: DebuggerService = TestBed.get(DebuggerService);
    expect(service).toBeTruthy();
  });
});
