import { Component } from '@angular/core';
import { UsaStatesService } from '../usa-states.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StateInterface } from '../model/state-interface';

@Component({
  selector: 'app-states-list',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './states-list.component.html',
  styleUrl: './states-list.component.scss'
})
export class StatesListComponent {
  stateList: StateInterface[] = [];

  constructor(private usaStatesService: UsaStatesService) {}

  ngOnInit(): void {
    this.usaStatesService.getStateList().subscribe((stateList: StateInterface[]) => {
      this.stateList = stateList;
      this.stateList.forEach(state => {

      });
    });
  }

  viewDetails(stateName: StateInterface) {
    console.log('ver detalles de: ', stateName);
  }

  onSelectedChange(stateSelected: StateInterface) {
    stateSelected.selected = !stateSelected.selected;
    this.usaStatesService.selectState(stateSelected);
  }

}
