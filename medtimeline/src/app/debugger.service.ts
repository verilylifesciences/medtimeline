import {Injectable} from '@angular/core';

@Injectable({providedIn: 'root'})
export class DebuggerService {
  errors: string[] = [];

  logError(error: string) {
    this.errors.push(error);
  }
}
