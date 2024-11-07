import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { StateInterface } from '../../model/state-interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-state-compared',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './state-compared.component.html',
  styleUrl: './state-compared.component.scss'
})
export class StateComparedComponent implements OnInit {
  @Input() states?: any[];
  @Output() close = new EventEmitter<void>();

  casesOpen = true;
  hospitalizationOpen = true;
  testsOpen = true;

  maxHospitalizatedPercentage = 0;
  maxCasePercentage = 0;

  ngOnInit(): void {
    this.states = this.states?.map(state => {
      return {
        ...state,
        casePercentage: this.calculateCasePercentage(state),
        hospitalizedPercentage: this.calculateHospitalizatedPercentage(state),
      };
    });
  }

  private calculateMaxPercentage(percentaje: number, type: string){
    if(type === 'case'){
      if(percentaje > this.maxCasePercentage){
        this.maxCasePercentage = percentaje;
      }
    } else {
      if(percentaje > this.maxHospitalizatedPercentage){
        this.maxHospitalizatedPercentage = percentaje;
      }
    }
  }

  private calculateHospitalizatedPercentage(state: StateInterface): number {
    const percentaje = (state.totalHospitalized / state.population) * 100;
    this.calculateMaxPercentage(percentaje, 'hospitalizated');
    return percentaje;
  }

  private calculateCasePercentage(state: StateInterface): number {
    const percentaje = (state.totalCases / state.population) * 100;
    this.calculateMaxPercentage(percentaje, 'case');
    return percentaje;
  }

  addPercentageToState(state: StateInterface): void {
    (state as any).casePercentage = this.calculateCasePercentage(state);
    (state as any).hospitalizatedPercentage = this.calculateHospitalizatedPercentage(state);
  }

  closeModal() {
    this.close.emit();
  }

}
