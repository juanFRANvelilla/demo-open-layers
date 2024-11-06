import { Component } from '@angular/core';
import { UsaStatesService } from '../usa-states.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StateInterface } from '../model/state-interface';
import { StateDetailComponent } from './state-detail/state-detail.component';

@Component({
  selector: 'app-states-list',
  standalone: true,
  imports: [FormsModule, CommonModule, StateDetailComponent],
  templateUrl: './states-list.component.html',
  styleUrl: './states-list.component.scss'
})
export class StatesListComponent {
  stateList: StateInterface[] = [];
  stateSelected?: StateInterface;

  constructor(private usaStatesService: UsaStatesService) {}

  ngOnInit(): void {
    this.usaStatesService.getStateList().subscribe((stateList: StateInterface[]) => {
      this.stateList = stateList;
      this.stateList.forEach(state => {

      });
    });
  }

  viewDetails(state: any) {
    this.stateSelected = state;
  }

  closeModal(){
    this.stateSelected = undefined;
  }

  onSelectedChange(stateSelected: StateInterface) {
    stateSelected.selected = !stateSelected.selected;
    this.usaStatesService.selectState(stateSelected);
  }

}
