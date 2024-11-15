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

  minCasePercentage = 100;
  minHospitalizatedPercentage = 100;
  

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
      if(percentaje < this.minCasePercentage){
        this.minCasePercentage = percentaje;
      }
    } else {
      if(percentaje < this.minHospitalizatedPercentage){
        this.minHospitalizatedPercentage = percentaje;
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

  closeModal() {
    this.close.emit();
  }

}
