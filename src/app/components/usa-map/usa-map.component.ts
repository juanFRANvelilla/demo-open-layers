import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { View, Map } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import VectorLayer from 'ol/layer/Vector';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { fromLonLat } from 'ol/proj';

@Component({
  selector: 'app-usa-map',
  standalone: true,
  imports: [HttpClientModule],
  templateUrl: './usa-map.component.html',
  styleUrl: './usa-map.component.scss'
})
export class UsaMapComponent {

  private map!: Map;

  constructor(private http: HttpClient) {}  // Inyecta HttpClient

  ngOnInit(): void {
    this.initializeMap();

    // this.http.get<any>('src/assets/us-states.geojson').subscribe((geojsonData: any) => {
    //   this.loadGeoJsonData(geojsonData);
    // });

    this.http.get<any>('./../us-states.geojson').subscribe((geojsonData: any) => {
      this.loadGeoJsonData(geojsonData);
    });
  }

  private initializeMap(): void {
    // Crear el mapa con una capa base OSM
    this.map = new Map({
      target: 'map',
      layers: [
        new TileLayer({
          source: new OSM()
        })
      ],
      view: new View({
        center: [-78.66635781106866, 37.51086709291787],  // Puedes ajustar el centroffff
        zoom: 6,
        projection: 'EPSG:3857'
      })
    });
    this.map.on('singleclick', (event) => this.handleMapClick(event));
  }

  private handleMapClick(event: any) {
    const coordinate = event.coordinate;
    const pixel = this.map.getEventPixel(event.originalEvent);
    const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);

    if (feature) {
      const properties = feature.getProperties();
      const stateName = properties['ste_name'][0]; 
      const coordinates = fromLonLat(coordinate); 
      console.log('Coordenadas:', coordinates);
      console.log('Estado:', stateName);
    } else {
      console.log('No se encontró ningún estado en esta ubicación.');
    }
  }

  private loadGeoJsonData(geojsonObject: any): void {
    // Crear una fuente vectorial desde el GeoJSON cargado
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonObject, {
        featureProjection: 'EPSG:3857'  
      })
    });

    // Crear una capa vectorial
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: new Style({
        stroke: new Stroke({
          color: 'blue',
          width: 2
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)'  // Color de relleno semitransparente
        })
      })
    });

    // Añadir la capa vectorial al mapa
    this.map.addLayer(vectorLayer);

    // Centrar el mapa en la extensión del GeoJSON
    const extent = vectorSource.getExtent();
    this.map.getView().fit(extent);
  }

  

  

}
