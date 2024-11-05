import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component, signal } from '@angular/core';
import { View, Map, Feature } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { fromLonLat } from 'ol/proj';
import { Geometry } from 'ol/geom';
import { Observable, Subscription } from 'rxjs';
import { UsaStatesService } from '../usa-states.service';

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
  private selectedFeature: any;

  constructor(private usaStatesService: UsaStatesService) {}  

  ngOnInit(): void {
    this.initializeMap();
    this.tooltipElement = document.getElementById('tooltip')!;

    this.usaStatesService.getStates().subscribe((geojsonData: any) => {
      this.loadGeoJsonData(geojsonData);
    });

    this.subscription = this.usaStatesService.selectedFeature.subscribe(feature => {
      console.log('cambio en el estado seleccionado desde map:', feature);
      this.selectedFeature = feature;
      this.vectorSource.changed();
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
      this.usaStatesService.updateSelectedFeature(properties);

    // const properties = feature.getProperties();
    // const stateName = properties['ste_name'][0];

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
    // if (feature.getProperties()['ste_name'][0] === this.selectedFeature?.getProperties()['ste_name'][0]) {
      if (feature.getProperties()['ste_name'][0] === this.selectedFeature?.ste_name[0]) {
      console.log('estilo seleccionado');
      return new Style({
        stroke: new Stroke({
          color: 'red', 
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(255, 0, 0, 0.5)' 
        })
      });
    }
    
    return new Style({
      stroke: new Stroke({
        color: 'blue',
        width: 2
      }),
      fill: new Fill({
        color: 'rgba(0, 0, 255, 0.1)'
      })
    });
  }


  onSelectedFeatureChange(newFeature: any): void {
    console.log('Selected feature changed:', newFeature);
  }

}
