import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Eye } from 'lucide-react';
import mapService from '../../services/map.service';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import LiveMap from '../../components/map/LiveMap';
import MapLegend from '../../components/map/MapLegend';

export default function CitizenMapPage() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    try {
      const response = await mapService.getAll();
      setMapData(response.data || response);
    } catch (err) {
      console.error('Failed to load map data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Live Sighting Map</h1>
          <p className="text-gray-600 mt-1">
            Real-time locations of missing persons and reported sightings.
          </p>
        </div>
        <button
          onClick={fetchMapData}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="card p-4 flex items-center gap-3">
          <MapPin className="w-5 h-5 text-maroon-800" />
          <div>
            <p className="text-lg font-bold text-gray-900">
              {mapData?.missingPersons?.length || mapData?.markers?.length || 0}
            </p>
            <p className="text-xs text-gray-500">Active Missing Persons</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <Eye className="w-5 h-5 text-blue-600" />
          <div>
            <p className="text-lg font-bold text-gray-900">
              {mapData?.sightings?.length || 0}
            </p>
            <p className="text-xs text-gray-500">Recorded Sightings</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <MapLegend />
      </div>

      <div className="card overflow-hidden" style={{ height: '600px' }}>
        <LiveMap
          markers={mapData?.missingPersons || mapData?.markers || []}
          sightings={mapData?.sightings || []}
          mapType="markers"
          isAdmin={false}
        />
      </div>

      <p className="text-xs text-gray-400 mt-3 text-center">
        New sightings appear automatically in real time. Green markers pulse when just reported.
      </p>
    </div>
  );
}
