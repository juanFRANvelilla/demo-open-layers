export interface StateInterface {
  name: string;
  code: string;
  stateCode: string;
  selected: boolean;
  totalCases: number;
  newCases: number;
  totalHospitalized: number;
  hospitalizedCurrently: number;
  totalTest: number;
  population: number;
}

export interface CovidData {
  positive: number;
  positiveIncrease: number;
  hospitalizedCumulative: number;
  hospitalizedCurrently: number;
  totalTestResults: number;
}
