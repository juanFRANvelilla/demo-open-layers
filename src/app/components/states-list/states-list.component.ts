import { Component } from '@angular/core';
import { UsaStatesService } from '../usa-states.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { StateInterface } from '../model/state-interface';
import { StateDetailComponent } from './state-detail/state-detail.component';
import { StateComparedComponent } from './state-compared/state-compared.component';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from './error-dialog/error-dialog.component';

@Component({
  selector: 'app-states-list',
  standalone: true,
  imports: [FormsModule, CommonModule, StateDetailComponent, StateComparedComponent, ErrorDialogComponent],
  templateUrl: './states-list.component.html',
  styleUrl: './states-list.component.scss'
})
export class StatesListComponent {
  stateList: StateInterface[] = [];
  stateSelected?: StateInterface;
  comparedStates: boolean = false;
  statesToCompare: StateInterface[] = [];

  constructor(private usaStatesService: UsaStatesService, public dialog: MatDialog) {}

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

  openComparedComponent() {
    const statesToCompare = this.stateList.filter(state => state.selected);
    if (statesToCompare.length == 2) {
      this.comparedStates = true;
      this.statesToCompare = statesToCompare;
    } else {
      this.dialog.open(ErrorDialogComponent, {
        width: '250px'
      });
    }

  }

}
