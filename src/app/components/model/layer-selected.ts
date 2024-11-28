import VectorLayer from "ol/layer/Vector";

export interface LayerSelected {
    selected: boolean;
    layer: VectorLayer
}