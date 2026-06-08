export default function MapLegend() {
  return (
    <div className="flex items-center gap-4 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-2">
      <div className="flex items-center gap-1.5">
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            background: '#7f1d1d',
            borderRadius: '50% 50% 50% 0',
            transform: 'rotate(-45deg)',
          }}
        />
        <span>Missing Person</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            background: '#2563eb',
            borderRadius: '50%',
          }}
        />
        <span>Sighting</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          style={{
            display: 'inline-block',
            width: 14,
            height: 14,
            background: '#16a34a',
            borderRadius: '50%',
          }}
        />
        <span>New Sighting (live)</span>
      </div>
    </div>
  );
}
