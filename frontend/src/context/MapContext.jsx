// src/context/MapContext.jsx
import { createContext, useState, useCallback } from 'react';

export const MapContext = createContext(null);

const DEFAULT_CENTER = [9.0820, 8.6753]; // Nigeria center
const DEFAULT_ZOOM = 6;

export function MapProvider({ children }) {
  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [heatmapData, setHeatmapData] = useState([]);
  const [mapType, setMapType] = useState('markers'); // 'markers' | 'heatmap'
  const [showClusters, setShowClusters] = useState(true);

  const updateCenter = useCallback((newCenter) => {
    setCenter(newCenter);
  }, []);

  const updateZoom = useCallback((newZoom) => {
    setZoom(newZoom);
  }, []);

  const setMarkerData = useCallback((data) => {
    setMarkers(data);
  }, []);

  const addMarker = useCallback((marker) => {
    setMarkers((prev) => [...prev, marker]);
  }, []);

  const removeMarker = useCallback((markerId) => {
    setMarkers((prev) => prev.filter((m) => m.id !== markerId));
  }, []);

  const selectMarker = useCallback((marker) => {
    setSelectedMarker(marker);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedMarker(null);
  }, []);

  const setHeatmapLayerData = useCallback((data) => {
    setHeatmapData(data);
  }, []);

  const value = {
    center,
    zoom,
    markers,
    selectedMarker,
    heatmapData,
    mapType,
    showClusters,
    updateCenter,
    updateZoom,
    setMarkerData,
    addMarker,
    removeMarker,
    selectMarker,
    clearSelection,
    setHeatmapLayerData,
    setMapType,
    setShowClusters,
  };

  return (
    <MapContext.Provider value={value}>
      {children}
    </MapContext.Provider>
  );
}