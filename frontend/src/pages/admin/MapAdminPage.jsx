// src/pages/admin/MapAdminPage.jsx
import { useState, useEffect } from 'react';
import { MapPin, RefreshCw, Layers, Activity } from 'lucide-react';
import mapService from '../../services/map.service';
import { getErrorMessage } from '../../utils/errorHandler';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';
import LiveMap from '../../components/map/LiveMap';
import MapLegend from '../../components/map/MapLegend';
import MapControls from '../../components/map/MapControls';
import toast from 'react-hot-toast';

export default function MapAdminPage() {
  const [mapData, setMapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mapType, setMapType] = useState('markers');
  const [geocodingLoading, setGeocodingLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchMapData();
    fetchStats();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await mapService.getAll();
      setMapData(response.data || response);
    } catch (err) {
      setError('Failed to load map data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await mapService.getAdminStats();
      setStats(response.data || response);
    } catch (err) {
      console.error('Failed to load map stats:', err);
    }
  };

  const handleBatchGeocode = async () => {
    setGeocodingLoading(true);
    try {
      await mapService.batchGeocode();
      toast.success('Batch geocoding completed!');
      fetchMapData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setGeocodingLoading(false);
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
          <h1 className="text-2xl font-bold text-gray-900">Live Map</h1>
          <p className="text-gray-600 mt-1">Visualize missing persons and sightings on the map.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleBatchGeocode}
            disabled={geocodingLoading}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${geocodingLoading ? 'animate-spin' : ''}`} />
            {geocodingLoading ? 'Geocoding...' : 'Batch Geocode'}
          </button>
          <button
            onClick={fetchMapData}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && <ErrorAlert message={error} className="mb-6" onDismiss={() => setError('')} />}

      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="card p-4 flex items-center gap-3">
            <MapPin className="w-5 h-5 text-maroon-800" />
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalMissing || 0}</p>
              <p className="text-xs text-gray-500">Missing Persons</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <Activity className="w-5 h-5 text-blue-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.totalSightings || 0}</p>
              <p className="text-xs text-gray-500">Sightings</p>
            </div>
          </div>
          <div className="card p-4 flex items-center gap-3">
            <Layers className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-gray-900">{stats.geocodedCount || 0}</p>
              <p className="text-xs text-gray-500">Geocoded</p>
            </div>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="flex items-center gap-4 mb-4">
        <MapControls mapType={mapType} onMapTypeChange={setMapType} />
        <MapLegend />
      </div>

      {/* Map */}
      <div className="card overflow-hidden" style={{ height: '600px' }}>
        <LiveMap
          markers={mapData?.markers || mapData?.missingPersons || []}
          sightings={mapData?.sightings || []}
          mapType={mapType}
          isAdmin
        />
      </div>
    </div>
  );
}