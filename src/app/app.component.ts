import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UsaMapComponent } from './components/usa-map/usa-map.component';
import { StatesListComponent } from './components/states-list/states-list.component';
import { HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [UsaMapComponent, StatesListComponent, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'demo-open-layers';
}
