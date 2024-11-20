import { HttpClientModule } from '@angular/common/http';
import { Component } from '@angular/core';
import { View, Map, Feature } from 'ol';
import TileLayer from 'ol/layer/Tile';
import { OSM } from 'ol/source';
import VectorSource from 'ol/source/Vector';
import GeoJSON from 'ol/format/GeoJSON';
import { Vector as VectorLayer } from 'ol/layer';
import Style from 'ol/style/Style';
import Stroke from 'ol/style/Stroke';
import Fill from 'ol/style/Fill';
import { Geometry, LineString, Polygon } from 'ol/geom';
import Draw from 'ol/interaction/Draw';
import { UsaStatesService } from '../usa-states.service';
import { CovidData, StateInterface } from '../model/state-interface';
import { FormsModule } from '@angular/forms';
import { defaults as defaultControls } from 'ol/control';
import { CommonModule } from '@angular/common';
import { fromLonLat, toLonLat } from 'ol/proj';
import { StateComparedComponent } from '../states-list/state-compared/state-compared.component';
import { MatDialog } from '@angular/material/dialog';
import { ErrorDialogComponent } from '../states-list/error-dialog/error-dialog.component';
import { Modify, Translate } from 'ol/interaction';
import { Select } from 'ol/interaction';
import { click } from 'ol/events/condition';
import * as turf from '@turf/turf';
// @ts-ignore
import Transform from 'ol-ext/interaction/Transform';
import booleanIntersects from '@turf/boolean-intersects';

@Component({
  selector: 'app-usa-map',
  standalone: true,
  imports: [
    HttpClientModule,
    FormsModule,
    CommonModule,
    StateComparedComponent,
    ErrorDialogComponent,
  ],
  templateUrl: './usa-map.component.html',
  styleUrl: './usa-map.component.scss',
})
export class UsaMapComponent {
  private vectorSource!: VectorSource;
  private polygonVectorSource!: VectorSource;

  // private statesVectorLayer!: VectorLayer;
  private polygonVectorLayer!: VectorLayer;
  private map!: Map;
  tooltipElement!: HTMLElement;
  private stateList: StateInterface[] = [];
  filteredStateList: StateInterface[] = [];
  searchTerm: string = '';

  disabledActions = false;
  statesFeatures: Feature[] = [];
  selectedPolygon: Feature | null = null;

  private select: Select | null = null;

  drawPolygon: Draw | null = null;
  drawPolygonCut: Draw | null = null;
  drawLine: Draw | null = null;
  modifyInteraction: Modify | null = null;
  translateInteraction: Translate | null = null;

  comparedStates: boolean = false;
  statesToCompare: StateInterface[] = [];

  private initialCenter: [number, number] | null = null;
  private initialZoom: number | null = null;

  constructor(
    private usaStatesService: UsaStatesService,
    public dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeMap();
    this.tooltipElement = document.getElementById('tooltip')!;

    this.usaStatesService
      .getStateList()
      .subscribe((stateList: StateInterface[]) => {
        this.stateList = stateList;
        this.vectorSource.changed();
      });

    this.usaStatesService.getStates().subscribe((geojsonData: any) => {
      this.loadGeoJsonData(geojsonData);

      geojsonData.features.forEach((feature: any) => {
        const stateCode = feature.properties.ste_stusps_code;
        const stateName = feature.properties.ste_name[0];

        this.usaStatesService
          .getCovidData(stateCode)
          .subscribe((covidData: CovidData) => {
            // Llama a `getPopulationByState` para obtener la población
            this.usaStatesService
              .getPopulationByState(stateName)
              .subscribe((population: number | null) => {
                // Verifica si la población fue encontrada
                const filteredFeature: StateInterface = {
                  name: stateName,
                  code: feature.properties.ste_code[0],
                  stateCode: stateCode,
                  selected: false,
                  totalCases: covidData.positive,
                  newCases: covidData.positiveIncrease,
                  totalHospitalized: covidData.hospitalizedCumulative,
                  hospitalizedCurrently: covidData.hospitalizedCurrently,
                  totalTest: covidData.totalTestResults,
                  population: population || 0,
                };
                this.stateList.push(filteredFeature);
                this.usaStatesService.setStateList(this.stateList);
              });
          });
      });
    });
  }

  private loadGeoJsonData(geojsonObject: any): void {
    this.vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonObject, {
        featureProjection: 'EPSG:3857',
      }),
    });

    this.statesFeatures = this.vectorSource.getFeatures();

    const statesVectorLayer = new VectorLayer({
      source: this.vectorSource,
      style: (feature) => this.getStyle(feature),
    });

    // vector source con las features que dibujemos nosotros
    this.polygonVectorSource = new VectorSource<Feature>({
      features: [],
    });

    this.polygonVectorLayer = new VectorLayer({
      source: this.polygonVectorSource,
    });

    // dos layers, uno para los estados y otro para los poligonos
    this.map.addLayer(statesVectorLayer);
    this.map.addLayer(this.polygonVectorLayer);
  }

  filterStates(): void {
    if (this.searchTerm) {
      this.filteredStateList = this.stateList.filter((state) =>
        state.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredStateList = [];
    }
  }

  selectState(state: StateInterface, active: boolean): void {
    this.usaStatesService.selectState(state, active);
  }

  private initializeMap(): void {
    const osmLayer = new TileLayer({
      source: new OSM({
        attributions: [],
      }),
    });

    this.map = new Map({
      target: 'map',
      layers: [osmLayer],
      view: new View({
        center: fromLonLat([-98.5795, 39.8283]),
        zoom: 3,
      }),
      controls: defaultControls({
        zoom: false,
        attribution: false,
        rotate: false,
      }),
    });

    this.map.on('pointermove', (event) => this.handlePointerMove(event));
    this.map.on('singleclick', (event) => this.handleMapClick(event));
  }

  private handlePointerMove(event: any) {
    if (!this.disabledActions) {
      const pixel = this.map.getEventPixel(event.originalEvent);
      const feature = this.map.forEachFeatureAtPixel(
        pixel,
        (feature) => feature
      );

      if (feature && feature.getProperties()['ste_code']) {
        const properties = feature.getProperties();
        const stateName = properties['ste_name'][0];

        this.showTooltip(event.coordinate, stateName);
      } else {
        this.hideTooltip();
      }
    }
  }

  private handleMapClick(event: any) {
    if (!this.disabledActions) {
      const pixel = this.map.getEventPixel(event.originalEvent);
      const feature = this.map.forEachFeatureAtPixel(
        pixel,
        (feature) => feature
      ) as Feature<Geometry> | undefined;

      if (feature) {
        const properties = feature.getProperties();

        // probar si hay codigo para comprobar que no es una feature de estado
        if (!properties['ste_code']) {
          this.selectedPolygon = feature;
        }

        const selectedState = this.stateList.find(
          (state) => state.code === properties['ste_code'][0]
        );
        if (selectedState) {
          this.usaStatesService.selectState(
            selectedState,
            !selectedState.selected
          );
        } else {
          console.log('No state found with the given code.');
        }
      } else {
        console.log('No state found with the given code.');
      }
    }
  }

  private showTooltip(coordinate: number[], stateName: string) {
    this.tooltipElement.style.display = 'block';
    this.tooltipElement.innerHTML = stateName;

    const position = this.map.getPixelFromCoordinate(coordinate);
    this.tooltipElement.style.left = position[0] + 18 + 'px';
    this.tooltipElement.style.top = position[1] + 25 + 'px';
  }

  private hideTooltip() {
    this.tooltipElement.style.display = 'none';
  }

  private getFeaturesInsidePolygon(polygon: Polygon): Feature[] {
    const geoJsonFormat = new GeoJSON();
    const geoJsonPolygon = geoJsonFormat.writeGeometryObject(polygon);

    return this.statesFeatures.filter((feature: Feature) => {
      const geoJsonFeature = geoJsonFormat.writeFeatureObject(feature);

      const intersects = booleanIntersects(geoJsonFeature, geoJsonPolygon);

      return intersects;
    });
  }

  private selectStatesByPolygon(polygon: Polygon, active: boolean): void {
    const featuresInsidePolygon = this.getFeaturesInsidePolygon(polygon);

    featuresInsidePolygon!.forEach((feature: any) => {
      const filterState = this.stateList.find(
        (state) => state.code === feature.getProperties()['ste_code'][0]
      );
      this.usaStatesService.selectState(filterState!, active);
    });
  }

  // activateDrawLine(): void {
  //   if (this.draw) {
  //     this.map.removeInteraction(this.draw);
  //   }

  //   this.draw = new Draw({
  //     source: this.vectorSource,
  //     type: 'LineString',
  //   });

  //   this.map.addInteraction(this.draw);

  //   this.draw.on('drawend', (event) => {
  //     const lineFeature = event.feature;
  //     const lineGeometry = lineFeature.getGeometry() as LineString;

  //     console.log('Line drawn:', lineGeometry.getCoordinates());

  //     // Check for intersection with existing polygons
  //     this.polygonVectorSource.getFeatures().forEach((polygonFeature) => {
  //       const polygonGeometry = polygonFeature.getGeometry() as Polygon;
  //       if (polygonGeometry.intersectsExtent(lineGeometry.getExtent())) {
  //         var polygonGeoJson = polygonGeometry.getCoordinates()[0].map(function (coord) {
  //           return { type: 'Feature', geometry: { type: 'Point', coordinates: coord } };
  //         });
  //         var lineGeoJson = {
  //           type: 'Feature',
  //           geometry: {
  //             type: 'LineString',
  //             coordinates: lineGeometry.getCoordinates()
  //           }
  //         };

  //         // Calcular la intersección entre el polígono y la línea
  //         var polygonGeoJsonObject = turf.polygon([polygonGeoJson.map(function(p) { return p.geometry.coordinates; })]);
  //         var lineGeoJsonObject = turf.lineString(lineGeometry.getCoordinates());

  //         // Obtener la intersección
  //         var intersection = turf.lineIntersect(polygonGeoJsonObject, lineGeoJsonObject);

  //         // Mostrar la intersección (si la hay)
  //         if (intersection.features.length > 0) {
  //           console.log("Intersección:", intersection);
  //         }
  //       }
  //     });

  //     this.map.removeInteraction(this.draw!);
  //   });
  // }

  //   activateDrawLine(): void {
  //     if (this.draw) {
  //         this.map.removeInteraction(this.draw);
  //     }

  //     this.draw = new Draw({
  //         source: this.vectorSource,
  //         type: 'LineString',
  //     });

  //     this.map.addInteraction(this.draw);

  //     this.draw.on('drawend', (event) => {
  //         const lineFeature = event.feature;
  //         const lineGeometry = lineFeature.getGeometry() as LineString;

  //         console.log('Line drawn:', lineGeometry.getCoordinates());

  //         // Convertir la línea a GeoJSON
  //         const lineGeoJson = turf.lineString(lineGeometry.getCoordinates());

  //         this.polygonVectorSource.getFeatures().forEach((polygonFeature) => {
  //             const polygonGeometry = polygonFeature.getGeometry() as Polygon;
  //             const polygonCoordinates = polygonGeometry.getCoordinates();

  //             // Convertir el polígono a GeoJSON
  //             const polygonGeoJson = turf.polygon(polygonCoordinates);

  //             // Dividir el polígono con la línea
  //             const split = turf.lineIntersect(polygonGeoJson, lineGeoJson);

  //             let nPoints = split.features.length;
  //             console.log('featrues split:', split.features);
  //             console.log('Número de puntos:', nPoints);

  //             const bufferedLine = turf.buffer(lineGeoJson, 0.1, {units: 'kilometers'});

  //             const splitPolygons = turf.difference(turf.featureCollection([polygonGeoJson, bufferedLine!]));

  //             // Mostrar los polígonos resultantes
  //             console.log('Polígonos resultantes:', splitPolygons);
  //             this.polygonVectorSource.addFeature(splitPolygons as Polygon);
  //         });

  //         this.map.removeInteraction(this.draw!);
  //     });
  // }

  activateDrawLine(): void {
    if (this.drawLine) {
      this.map.removeInteraction(this.drawLine);
    }

    this.drawLine = new Draw({
      source: this.vectorSource,
      type: 'LineString',
    });

    this.map.addInteraction(this.drawLine);

    this.drawLine.on('drawend', (event) => {
      const lineFeature = event.feature;
      const lineGeometry = lineFeature.getGeometry() as LineString;

      console.log('Line drawn:', lineGeometry.getCoordinates());

      // Convertir la línea a GeoJSON
      const lineGeoJson = turf.lineString(lineGeometry.getCoordinates());

      this.polygonVectorSource.getFeatures().forEach((polygonFeature) => {
        const polygonGeometry = polygonFeature.getGeometry() as Polygon;
        const polygonCoordinates = polygonGeometry.getCoordinates();

        // Convertir el polígono a GeoJSON
        const polygonGeoJson = turf.polygon(polygonCoordinates);

        const lineIntersec = turf.lineIntersect(polygonGeoJson, lineGeoJson);
        console.log('lineIntersec:', lineIntersec);
        // const lineFalta = turf.lineString(lineIntersec);

        const linePolygon = turf.polygonToLine(polygonGeoJson);
        // console.log('linePolygon:', linePolygon);
        // console.log('lineGeoJson:', lineGeoJson);

        let sides: any = [];

        if (linePolygon.type === 'Feature') {
          const lines =
            linePolygon.geometry.type === 'MultiLineString'
              ? linePolygon.geometry.coordinates
              : [linePolygon.geometry.coordinates];
          lines.forEach((line) => {
            const split = turf.lineSplit(turf.lineString(line), lineGeoJson);
            sides.push(split);
          });
        }

        let newPolygons: any = [];

        sides.forEach((splitFeatureCollection: any) => {
          splitFeatureCollection.features.forEach((splitLineFeature: any) => {
            const coords = splitLineFeature.geometry.coordinates;

            // Cierra el polígono asegurándose de que el primer punto sea igual al último
            if (coords[0] !== coords[coords.length - 1]) {
              coords.push(coords[0]); // Añadir el primer punto al final para cerrarlo
            }

            // Crear un polígono a partir de las líneas divididas
            const newPolygon = turf.polygon([coords]);
            newPolygons.push(newPolygon);
          });
        });

        console.log('New Polygons:', newPolygons);

        // let nPoints = split.features.length;
        // console.log('featrues split:', split.features);
        // console.log('Número de puntos:', nPoints);

        // const bufferedLine = turf.buffer(lineGeoJson, 0.1, {units: 'kilometers'});

        // const splitPolygons = turf.difference(turf.featureCollection([polygonGeoJson, bufferedLine!]));

        // Mostrar los polígonos resultantes
        // console.log('Polígonos resultantes:', splitPolygons);
      });

      // this.map.removeInteraction(this.draw!);
    });
  }

  intersectPolygons() {
    if (this.drawPolygonCut) {
      this.deactivateAllInteractionTool();
      this.disabledActions = false;
    } else {
      this.deactivateAllInteractionTool();
      // bloquear seleccion y tooltip
      this.disabledActions = true;

      // crear un nuevo poligono y agregarlo al vectorSource
      this.drawPolygonCut = new Draw({
        // source: this.polygonVectorSource,
        type: 'Polygon',
      });
      this.map.addInteraction(this.drawPolygonCut);

      this.drawPolygonCut.on('drawend', (event) => {
        const feature = event.feature;

        this.selectedPolygon = feature;
        const polygonGeometryCut: Polygon = feature.getGeometry() as Polygon;
        // obtener objeto de poligono en formato turf
        const polygonGeoJsonCut = turf.polygon(
          polygonGeometryCut.getCoordinates()
        );

        // recorrer los poligonos existentes
        this.polygonVectorSource.getFeatures().forEach((polygonFeature) => {
          const polygonGeometry = polygonFeature.getGeometry() as Polygon;
          // obtener el poligo iterado en formato turf
          const polygonGeoJson = turf.polygon(polygonGeometry.getCoordinates());

          if (
            turf.booleanIntersects(polygonGeoJson, polygonGeoJsonCut) &&
            !turf.booleanContains(polygonGeoJson, polygonGeoJsonCut)
          ) {
            // si los poligonos se cruzan y ademas no debe de contener ninguno al otro, calcular la diferencia entre los dos poligonos
            const resultPolygon = turf.difference(
              turf.featureCollection([polygonGeoJson, polygonGeoJsonCut])
            );

            if (resultPolygon){
              this.polygonVectorSource.removeFeature(polygonFeature);
              if (resultPolygon?.geometry.type == 'Polygon') {
                const newCoordinates = resultPolygon!.geometry.coordinates;
                const transformedCoordinates =
                  this.transformedCoordinates(newCoordinates);
  
                if (polygonFeature.getGeometry()?.getType() === 'Polygon') {
                  const geometry = polygonFeature.getGeometry() as Polygon;
                  geometry.setCoordinates(transformedCoordinates);
                }
  
                this.polygonVectorSource.addFeature(polygonFeature);
                
                
              } 
              
              
              
              
              else if (resultPolygon?.geometry.type == 'MultiPolygon') {
                resultPolygon!.geometry.coordinates.forEach((coords) => {
                  const transformedCoordinates = this.transformedCoordinates(coords);
  
                  let clonedFeature = polygonFeature.clone();
  
                  if (clonedFeature && clonedFeature.getGeometry()?.getType() === 'Polygon') {
                    const geometry = clonedFeature.getGeometry() as Polygon;
                    geometry.setCoordinates(transformedCoordinates);
                    this.polygonVectorSource.addFeature(clonedFeature);
                  }
                  // if (!this.polygonVectorSource.hasFeature(feature)) {
                  //   // agregamos la nueva geometria solo si no lo esta
                  //   this.polygonVectorSource.addFeature(feature);
                  // }
                });
              }

              if (!this.polygonVectorSource.hasFeature(feature)) {
                // agregamos la nueva geometria solo si no lo esta
                this.polygonVectorSource.addFeature(feature);
              }

            }
            
            

            

            // Marcar como seleccionados los estados de la nueva geometria
            this.selectStatesByPolygon(polygonGeometryCut, true);
          }

          this.deactivateAllInteractionTool();
          setTimeout(() => {
            this.disabledActions = false;
          }, 500);
        });
      });
    }
  }

  // transformar las coordenadas a formato compatible para hacer el setCoordinates en openlayers
  private transformedCoordinates(coordinates: any) {
    return coordinates.map((ring: any) =>
      ring.map((coord: any) => [coord[0], coord[1]])
    );
  }

  activateDrawPolygon(): void {
    if (this.drawPolygon) {
      this.deactivateAllInteractionTool();
      this.disabledActions = false;
    } else {
      this.deactivateAllInteractionTool();
      this.disabledActions = true;

      this.drawPolygon = new Draw({
        source: this.polygonVectorSource,
        type: 'Polygon',
      });
      this.map.addInteraction(this.drawPolygon);

      this.drawPolygon.on('drawend', (event) => {
        const feature = event.feature;

        this.selectedPolygon = feature;
        const polygonGeometry: Polygon = feature.getGeometry() as Polygon;
        const extent = polygonGeometry!.getExtent();

        const view = this.map.getView();
        const center = view.getCenter();
        if (center) {
          const convertedCenter = toLonLat(center);
          if (convertedCenter.length >= 2) {
            this.initialCenter = [convertedCenter[0], convertedCenter[1]];
          }
        }
        this.initialZoom = view.getZoom() ?? 0;

        view.fit(extent, {
          size: this.map.getSize(),
          padding: [50, 50, 50, 50],
          maxZoom: 13,
        });

        this.selectStatesByPolygon(polygonGeometry, true);
        this.deactivateAllInteractionTool();
        setTimeout(() => {
          this.disabledActions = false;
        }, 500);
      });
    }
  }

  removeSelectFeature(): void {
    const polygonGeometry: Polygon =
      this.selectedPolygon!.getGeometry() as Polygon;
    this.selectStatesByPolygon(polygonGeometry, false);

    if (this.initialCenter && this.initialZoom !== null) {
      this.map.getView().setCenter(fromLonLat(this.initialCenter));
      this.map.getView().setZoom(this.initialZoom);
    }

    this.vectorSource.removeFeature(this.selectedPolygon!);
    this.polygonVectorSource.removeFeature(this.selectedPolygon!);
    this.selectedPolygon = null;
    this.updateSelectedStatesByPolygon();
  }

  hasDrwanPolygons(): boolean {
    if (this.polygonVectorSource) {
      return this.polygonVectorSource!.getFeatures().length > 0;
    } else {
      return false;
    }
  }

  // recorre todos los poligonos que hay en el vector para marcar sus estados como seleccionados
  updateSelectedStatesByPolygon() {
    console.log(
      'poligonos para seleccionar :',
      this.polygonVectorSource.getFeatures().length
    );
    this.polygonVectorSource.getFeatures().forEach((feature) => {
      const polygonGeometry = feature.getGeometry() as Polygon;
      this.selectStatesByPolygon(polygonGeometry, true);
    });
  }

  activateModifyTool(): void {
    if (this.modifyInteraction) {
      this.deactivateAllInteractionTool();
      this.disabledActions = false;
    } else {
      this.disabledActions = true;
      this.deactivateAllInteractionTool();

      let oldPolygon: Polygon;

      this.modifyInteraction = new Modify({
        source: this.polygonVectorSource,
      });
      this.map.addInteraction(this.modifyInteraction);

      this.modifyInteraction.on('modifystart', (event) => {
        const selectedFeatures = event.features;
        selectedFeatures.forEach((feature) => {
          oldPolygon = feature.getGeometry()!.clone() as Polygon;
        });
      });

      this.modifyInteraction.on('modifyend', () => {
        // Desseleccionar los estados del polígono anterior
        this.selectStatesByPolygon(oldPolygon, false);

        this.updateSelectedStatesByPolygon();
        this.deactivateAllInteractionTool();
        setTimeout(() => {
          this.disabledActions = false;
        }, 500);
      });

      this.select = new Select({
        condition: click,
        layers: [this.polygonVectorLayer],
        filter: (feature) => {
          return feature.getProperties()['ste_code'] == undefined;
        },
      });

      this.map.addInteraction(this.select);
    }
  }

  activateTranformTool(): void {
    if (this.translateInteraction) {
      this.deactivateAllInteractionTool();
      this.disabledActions = false;
    } else {
      this.deactivateAllInteractionTool();
      this.disabledActions = true;

      let oldPolygon: Polygon;

      this.select = new Select({
        condition: click,
        filter: (feature) => this.polygonVectorSource.hasFeature(feature),
      });

      this.map.addInteraction(this.select);

      this.translateInteraction = new Transform({
        layers: [this.polygonVectorLayer],
        scale: true,
        rotate: true,
        translate: true,
        stretch: true,
        selection: true,
      });
      this.map.addInteraction(this.translateInteraction!);

      this.translateInteraction!.on('translatestart', (event) => {
        const selectedFeatures = event.features;
        selectedFeatures.forEach((feature) => {
          oldPolygon = feature.getGeometry()!.clone() as Polygon;
        });
      });

      // Escuchar el evento de transforamcion y actualizar la seleccion
      this.translateInteraction!.on('translateend', (event) => {
        // Desseleccionar los estados del polígono anterior
        this.selectStatesByPolygon(oldPolygon, false);

        this.updateSelectedStatesByPolygon();
        // this.deactivateAllInteractionTool();
      });
    }
  }

  // Desactivar todas las herramientas de interacción
  deactivateAllInteractionTool(): void {
    if (this.drawPolygon) {
      this.map.removeInteraction(this.drawPolygon);
      this.drawPolygon = null;
    }
    if (this.drawPolygonCut) {
      this.map.removeInteraction(this.drawPolygonCut);
      this.drawPolygonCut = null;
    }
    if (this.drawLine) {
      this.map.removeInteraction(this.drawLine);
      this.drawLine = null;
    }
    if (this.select) {
      this.map.removeInteraction(this.select);
      this.select = null;
    }

    if (this.modifyInteraction) {
      this.map.removeInteraction(this.modifyInteraction);
      this.modifyInteraction = null;
    }

    if (this.translateInteraction) {
      this.map.removeInteraction(this.translateInteraction);
      this.translateInteraction = null;
    }
  }

  private getStyle(feature: any) {
    const properties = feature.getProperties();
    const featureCode = properties['ste_code']
      ? properties['ste_code'][0]
      : null;

    let filterState: StateInterface | undefined;
    if (featureCode) {
      filterState = this.stateList.find((state) => state.code === featureCode);
    }

    if (filterState?.selected) {
      return new Style({
        stroke: new Stroke({
          color: 'red',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(255, 105, 180, 1)',
        }),
      });
    }

    if (!filterState || filterState.totalCases === undefined) {
      return new Style({
        stroke: new Stroke({
          color: 'rgba(0, 0, 255, 0.3)',
          width: 2,
        }),
        fill: new Fill({
          color: 'rgba(0, 0, 255, 0.1)',
        }),
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
        width: 2,
      }),
      fill: new Fill({
        color: fillColor,
      }),
    });
  }

  openComparedComponent() {
    const statesToCompare = this.stateList.filter((state) => state.selected);
    if (statesToCompare.length > 1) {
      this.comparedStates = true;
      this.statesToCompare = statesToCompare;
    } else {
      this.dialog.open(ErrorDialogComponent, {
        width: '250px',
      });
    }
  }

  closeModal() {
    this.comparedStates = false;
  }
}
