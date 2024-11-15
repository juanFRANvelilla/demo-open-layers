import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable } from 'rxjs';
import { CovidData, StateInterface } from '../components/model/state-interface';


@Injectable({
  providedIn: 'root'
})
export class UsaStatesService {
  private stateList = new BehaviorSubject<StateInterface[]>([]);


  constructor(private http: HttpClient) { }

  getStateList(): Observable<StateInterface[]> {
    return this.stateList.asObservable();
  }

  setStateList(newStateList: StateInterface[]): void {
    this.stateList.next(newStateList);
  }

  selectState(stateChanged: StateInterface, active: boolean): void{
    const updatedStateList = this.stateList.value.map(state => {
      if (state.code === stateChanged.code) {
        return { ...state, selected: active };
      }
      return state;
    });

    const selectedState: StateInterface[] = updatedStateList.filter(state => state.selected === true);
    const unselectedStates: StateInterface[] = updatedStateList.filter(state => state.selected === false);

    const newStateList = [...selectedState, ...unselectedStates];
    this.setStateList(newStateList);
  }

  getStates(): Observable<any> {
    // return this.http.get<any>('assets/us-states.geojson');
    const data = this.http.get<any>('./../us-states.geojson');
    return data;
    
  }

  getPopulationByState(name: string): Observable<number | null> {
    return this.http.get<any[]>('./../us-states-population.json').pipe(
      map((data) => {
        const stateData = data.find(state => state.name.toLowerCase() === name.toLowerCase());
        return stateData ? +stateData.population.replace(/,/g, '') : null;
      })
    );
  }

  getCovidData(state: string): Observable<CovidData> {
    return this.http.get<any>(`https://api.covidtracking.com/v1/states/${state.toLocaleLowerCase()}/current.json`);
  }
}
