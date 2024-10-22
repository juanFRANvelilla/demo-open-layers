import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsaStatesService {
  selectedFeature = signal<any>(null); 

  constructor(private http: HttpClient) { }



  getStates(): Observable<any> {
    // return this.http.get<any>('assets/us-states.geojson');
    return this.http.get<any>('./../us-states.geojson');
  }
}
