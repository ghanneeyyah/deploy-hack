import { Map, Layers } from 'lucide-react';

export default function MapControls({ mapType, onMapTypeChange }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onMapTypeChange('markers')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
          mapType === 'markers'
            ? 'bg-maroon-800 text-white border-maroon-800'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Map className="w-4 h-4" />
        Markers
      </button>
      <button
        onClick={() => onMapTypeChange('heatmap')}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
          mapType === 'heatmap'
            ? 'bg-maroon-800 text-white border-maroon-800'
            : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
        }`}
      >
        <Layers className="w-4 h-4" />
        Heatmap
      </button>
    </div>
  );
}
