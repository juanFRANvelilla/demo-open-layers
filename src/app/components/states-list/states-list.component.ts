import { Component } from '@angular/core';
import { UsaStatesService } from '../usa-states.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-states-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './states-list.component.html',
  styleUrl: './states-list.component.scss'
})
export class StatesListComponent {
  states: { code: string, name: string; selected: boolean }[] = [];

  constructor(private usaStatesService: UsaStatesService) {}

  ngOnInit(): void {
    this.usaStatesService.getStates().subscribe((geojsonData: any) => {
      this.states = geojsonData.features.map((feature: any) => ({
        code: feature.properties.ste_code[0],
        name: feature.properties.ste_name[0],
        selected: false 
      }));
    });

    this.usaStatesService.selectedFeature.subscribe(feature => {
      this.states.forEach(state => state.selected = false);
      
      const selectedState = this.states.find(state => state.code === feature.ste_code[0]);
      if (selectedState) {
        selectedState.selected = true;
        this.states = [selectedState, ...this.states.filter(state => state !== selectedState)];
      }
    });
  }

  viewDetails(stateName: string) {
    console.log('ver detalles de: ', stateName);
  }

  onSelectedChange(state: { code: string, name: string; selected: boolean  }) {
    if(state.selected) {
      this.usaStatesService.getStateByCode(state.code).then((stateData: any) => {
        this.usaStatesService.updateSelectedFeature(stateData.properties);
      });
    } else {
      this.usaStatesService.updateSelectedFeature(null);
    }
  }

}
