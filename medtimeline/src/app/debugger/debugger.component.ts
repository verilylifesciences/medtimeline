import {Component} from '@angular/core';
import {DebuggerService} from '../debugger.service';

@Component({
  selector: 'app-debugger',
  templateUrl: './debugger.component.html',
})
export class DebuggerComponent {
  constructor(private debugService: DebuggerService) {}
}
