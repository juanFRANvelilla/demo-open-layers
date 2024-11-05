import { HttpClient } from '@angular/common/http';
import { computed, Injectable, signal } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UsaStatesService {
  selectedFeature = new BehaviorSubject<any>(null); 

  constructor(private http: HttpClient) { }

  updateSelectedFeature(feature: any) {
    this.selectedFeature.next(feature);
  }

  getStates(): Observable<any> {
    // return this.http.get<any>('assets/us-states.geojson');
    return this.http.get<any>('./../us-states.geojson');
  }

  getStateByCode(code: string): any {
    return this.getStates().toPromise().then((data: any) => {
      const features = data.features;
      return features.find((feature: any) => feature.properties.ste_code[0] === code);
    });
  }
}
