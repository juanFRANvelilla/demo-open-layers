import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UsaMapComponent } from './components/usa-map/usa-map.component';
import { StatesListComponent } from './components/states-list/states-list.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, UsaMapComponent, StatesListComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'demo-open-layers';
}
