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
  // private usaStateData = signal<any>(null);
  states: { code: string, name: string; selected: boolean }[] = [];

  constructor(private usaStatesService: UsaStatesService) {}

  ngOnInit(): void {
    this.usaStatesService.getStates().subscribe((geojsonData: any) => {
      console.log('geojsonData features: ', geojsonData.features[0].properties.ste_name[0]);
      this.states = geojsonData.features.map((feature: any) => ({
        code: feature.properties.ste_code[0],
        name: feature.properties.ste_name[0],
        selected: false 
      }));
    });
  }

  viewDetails(stateName: string) {
    console.log('ver detalles de: ', stateName);
  }

  onSelectedChange(state: { code: string, name: string; selected: boolean  }) {
    this.usaStatesService.getStateByCode(state.code).subscribe((stateData: any) => {
      console.log('estado seleccionado desde lista:', stateData);
      this.usaStatesService.updateSelectedFeature(stateData.properties);
    });
    
  }

}
