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
import { Geometry, Polygon } from 'ol/geom';
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
  private polygonSource!: VectorSource;
  private vectorLayer!: VectorLayer;
  private map!: Map;
  tooltipElement!: HTMLElement;
  private stateList: StateInterface[] = [];
  filteredStateList: StateInterface[] = [];
  searchTerm: string = '';
  private draw?: Draw;
  disabledActions = false;
  features: Feature[] = [];
  selectedPolygon: Feature | null = null;

  private select: Select | null = null;

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
    // vector source con las features que dibujemos nosotros
    this.polygonSource = new VectorSource<Feature>({
      features: [],
    });

    // this.polygonLayer = new VectorLayer({
    //   source: this.polygonSource,
    //   style: (feature) => this.getStyle(feature)

    // });

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
    const featuresInsidePolygon = this.features.filter((feature: Feature) => {
      const featureGeometry = feature.getGeometry() as Polygon;
      const coordinates = featureGeometry.getCoordinates()[0];
      return coordinates.some((coordinate) =>
        polygon.intersectsCoordinate(coordinate)
      );
    });
    return featuresInsidePolygon;
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

  activateDraw(type: 'Polygon' | 'LineString' | 'Point'): void {
    this.disabledActions = true;
    if (this.draw) {
      this.map.removeInteraction(this.draw);
    }

    this.draw = new Draw({
      source: this.vectorSource,
      type: type,
    });

    this.map.addInteraction(this.draw);

    this.draw.on('drawend', (event) => {
      const feature = event.feature;
      this.polygonSource.addFeature(feature);

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
        maxZoom: 15,
      });

      this.selectStatesByPolygon(polygonGeometry, true);

      setTimeout(() => {
        this.disabledActions = false;
      }, 500);

      this.map.removeInteraction(this.draw!);
    });
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
    this.polygonSource.removeFeature(this.selectedPolygon!);
    this.selectedPolygon = null;
  }

  private loadGeoJsonData(geojsonObject: any): void {
    const vectorSource = new VectorSource({
      features: new GeoJSON().readFeatures(geojsonObject, {
        featureProjection: 'EPSG:3857',
      }),
    });
    this.vectorSource = vectorSource;

    this.features = vectorSource.getFeatures();

    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => this.getStyle(feature),
    });
    this.vectorLayer = vectorLayer;

    this.map.addLayer(vectorLayer);
  }

  hasDrwanPolygons(): boolean {
    return this.polygonSource.getFeatures().length > 0;
  }

  updateSelectedStatesByPolygon(features: Feature[]): void {
    features.forEach((feature: Feature) => {
      const geometry = feature.getGeometry();

      if (geometry && geometry.getType() === 'Polygon') {
        const newPolygonGeometry: Polygon = geometry as Polygon;
        // Seleccionar los estados del polígono modificado
        this.selectStatesByPolygon(newPolygonGeometry, true);
      } else {
        console.error(
          'La geometría modificada no es un polígono o es inválida'
        );
      }
    });
  }

  activateModifyTool(): void {
    if (this.modifyInteraction) {
      this.deactivateAllInteractionTool();
    } else {
      this.disabledActions = true;
      this.deactivateAllInteractionTool();

      const oldPolygon =
        this.selectedPolygon!.getGeometry()!.clone() as Polygon;

      this.modifyInteraction = new Modify({
        source: this.polygonSource,
      });

      this.map.addInteraction(this.modifyInteraction);

      this.modifyInteraction.on('modifyend', (event) => {
        // Desseleccionar los estados del polígono anterior
        this.selectStatesByPolygon(oldPolygon, false);

        // Seleccionar los estados del polígono modificado
        this.updateSelectedStatesByPolygon(event.features.getArray());
        this.deactivateAllInteractionTool();
      });

      this.select = new Select({
        condition: click,
        layers: [this.vectorLayer],
        filter: (feature) => {
          return feature.getProperties()['ste_code'] == undefined;
        },
      });

      this.map.addInteraction(this.select);
    }
  }

  activateHandTool(): void {
    if (this.translateInteraction) {
      this.deactivateAllInteractionTool();
    } else {
      this.deactivateAllInteractionTool();

      const oldPolygon =
        this.selectedPolygon!.getGeometry()!.clone() as Polygon;

      if (this.polygonSource.getFeatures().length === 0) {
        this.deactivateAllInteractionTool();
        this.disabledActions = false;
      } else {
        this.select = new Select({
          condition: click,
          filter: (feature) => this.polygonSource.hasFeature(feature),
        });

        this.map.addInteraction(this.select);

        this.translateInteraction = new Translate({
          features: this.select.getFeatures(),
        });

        this.map.addInteraction(this.translateInteraction);

        // Escuchar el evento de movimiento y actualizar la seleccion
        this.translateInteraction.on('translateend', (event) => {
          // Desseleccionar los estados del polígono anterior
          this.selectStatesByPolygon(oldPolygon, false);

          // Seleccionar los estados del polígono modificado
          this.updateSelectedStatesByPolygon(event.features.getArray());
          this.deactivateAllInteractionTool();
        });
      }
    }
  }

  // Desactivar todas las herramientas de interacción
  deactivateAllInteractionTool(): void {
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
    this.disabledActions = false;
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
