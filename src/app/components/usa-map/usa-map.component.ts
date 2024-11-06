import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { View, Map, Feature } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { Geometry } from 'ol/geom';
import { map, Subscription } from 'rxjs';
import { UsaStatesService } from '../usa-states.service';
import { CovidData, StateInterface } from '../model/state-interface';

@Component({
  selector: 'app-usa-map',
  standalone: true,
  imports: [HttpClientModule],
  templateUrl: './usa-map.component.html',
  styleUrl: './usa-map.component.scss'
})
export class UsaMapComponent {
  private subscription?: Subscription;
  private vectorSource!: VectorSource;
  private map!: Map;
  tooltipElement!: HTMLElement;
  private stateList: StateInterface[] = [];

  constructor(private usaStatesService: UsaStatesService) {}  

  ngOnInit(): void {
    this.initializeMap();
    this.tooltipElement = document.getElementById('tooltip')!;

    this.usaStatesService.getStateList().subscribe((stateList: StateInterface[]) => {
      this.stateList = stateList;
      this.vectorSource.changed();
    });

    this.usaStatesService.getStates().subscribe((geojsonData: any) => {
      this.loadGeoJsonData(geojsonData);
      
      // this.stateList = [];

      geojsonData.features.forEach((feature: any) => {
        const stateCode = feature.properties.ste_stusps_code;

        this.usaStatesService.getCovidData(stateCode).subscribe((covidData: CovidData) => {
          const filteredFeature: StateInterface = {
            name: feature.properties.ste_name[0],
            code: feature.properties.ste_code[0],
            stateCode: stateCode,
            selected: false,
            totalCases: covidData.positive,
            newCases: covidData.positiveIncrease,
            totalHospitalized: covidData.hospitalizedCumulative,
            hospitalizedCurrently: covidData.hospitalizedCurrently,
            totalTest: covidData.totalTestResults
          };

          // Añadir el estado a la lista
          this.stateList.push(filteredFeature);

          // Actualizar el servicio con la lista completa
          this.usaStatesService.setStateList(this.stateList);
        });
      });
    });
  }

  private initializeMap(): void {
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: [27.090528, -95.265041], 
        zoom: 10,
        projection: 'EPSG:3857'
      })
    });

    this.map.on('pointermove', (event) => this.handlePointerMove(event));
    this.map.on('singleclick', (event) => this.handleMapClick(event));
  }

  private handlePointerMove(event: any) {
    const pixel = this.map.getEventPixel(event.originalEvent);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);

    if (feature) {
      
      const properties = feature.getProperties();
      const stateName = properties['ste_name'][0]; 
      
      // this.showTooltip(event.coordinate, stateName);
    } else {
      // this.hideTooltip();
    }
  }

  private showTooltip(coordinate: number[], stateName: string) {
    this.tooltipElement.style.display = 'block';
    this.tooltipElement.innerHTML = stateName;

    const position = this.map.getPixelFromCoordinate(coordinate);
    this.tooltipElement.style.left = position[0] + 'px';
    this.tooltipElement.style.top = position[1] + 'px';
  }

  private hideTooltip() {
    this.tooltipElement.style.display = 'none';
  }

  private handleMapClick(event: any) {
    const pixel = this.map.getEventPixel(event.originalEvent);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature) as Feature<Geometry> | undefined;

    if (feature) {
      const properties = feature.getProperties();

      const selectedState = this.stateList.find(state => state.code === properties['ste_code'][0]);
      if (selectedState) {
        this.usaStatesService.selectState(selectedState);
      } else {
        console.log('No state found with the given code.');
      }
    } else {
      console.log('No se encontró ningún estado en esta ubicación.');
    }
  }

  private loadGeoJsonData(geojsonObject: any): void {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonObject, {
        featureProjection: 'EPSG:3857'  
      })
    });
    this.vectorSource = vectorSource;

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => this.getStyle(feature)
      
    });

    this.map.addLayer(vectorLayer);

    const extent = vectorSource.getExtent();
    this.map.getView().fit(extent);
  }


  private getStyle(feature: any) {
    const filterState = this.stateList.find(state => state.code === feature.getProperties()['ste_code'][0]);
  
    if (filterState?.selected) {
      return new Style({
        stroke: new Stroke({
          color: 'red', 
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(255, 105, 180, 1)'
        })
      });
    }
  
    if (!filterState || filterState.totalCases === undefined) {
      return new Style({
        stroke: new Stroke({
          color: 'rgba(0, 0, 255, 0.3)',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)'
        })
      });
    }
  
    let fillColor = 'rgb(0, 255, 0)';
  
    if (filterState.totalCases >= 3000000) {
      fillColor = 'rgb(255, 0, 0)';
    } else if (filterState.totalCases >= 1000000) {
      fillColor = 'rgb(255, 255, 0)';
    } else if (filterState.totalCases >= 500000) {
      fillColor = 'rgb(255, 165, 0)';
    }
  
    return new Style({
      stroke: new Stroke({
        color: 'rgba(0, 0, 255, 0.3)',
        width: 2
      }),
      fill: new Fill({
        color: fillColor
      })
    });
  }

  onselectedFeatureSetChange(newFeature: any): void {
    console.log('Selected feature changed:', newFeature);
  }

}
