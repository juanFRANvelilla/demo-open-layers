import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StateInterface } from '../../model/state-interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-state-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './state-detail.component.html',
  styleUrl: './state-detail.component.scss'
})
export class StateDetailComponent {
  @Input() state!: StateInterface;
  @Output() close = new EventEmitter<void>();

  casesOpen = true;
  hospitalizationOpen = true;
  testsOpen = true;

  closeModal() {
    this.close.emit();
  }

}
