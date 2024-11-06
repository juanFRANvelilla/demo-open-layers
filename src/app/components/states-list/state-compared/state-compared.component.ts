import { Component, EventEmitter, Input, input, Output } from '@angular/core';
import { StateInterface } from '../../model/state-interface';

@Component({
  selector: 'app-state-compared',
  standalone: true,
  imports: [],
  templateUrl: './state-compared.component.html',
  styleUrl: './state-compared.component.scss'
})
export class StateComparedComponent {
  @Input() states?: StateInterface[];
  @Output() close = new EventEmitter<void>();

  casesOpen = false;
  hospitalizationOpen = false;
  testsOpen = false;

  closeModal() {
    this.close.emit();
  }

}
