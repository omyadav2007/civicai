'use client';

import React, { useState } from 'react';
import { MapPin, Navigation, Compass, AlertCircle } from 'lucide-react';

interface Props {
  latitude: number | null;
  longitude: number | null;
  address: string;
  onChange: (data: { latitude: number | null; longitude: number | null; address: string }) => void;
}

export default function LocationPicker({ latitude, longitude, address, onChange }: Props) {
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));

        let detectedAddress = address;

        // Try free OpenStreetMap Nominatim reverse geocoding
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
            {
              headers: {
                'User-Agent': 'CivicAI-Academic-Project/1.0',
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.display_name) {
              detectedAddress = data.display_name;
            }
          }
        } catch {
          // If network or CORS restricts Nominatim, keep existing address or suggest coordinates
          if (!detectedAddress) {
            detectedAddress = `Location near [${lat}, ${lng}]`;
          }
        }

        onChange({
          latitude: lat,
          longitude: lng,
          address: detectedAddress || `Coordinates [${lat}, ${lng}]`,
        });
        setIsLocating(false);
      },
      (err) => {
        setIsLocating(false);
        setLocationError(
          err.code === 1
            ? 'Location permission denied. Please enter address and coordinates manually.'
            : 'Unable to retrieve location. Please fill manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4 bg-slate-50 border border-slate-200/90 rounded-xl p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <label className="block text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-teal-600" />
            Issue Location & Address <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-slate-500 mt-0.5">
            Pinpoint the civic issue location to dispatch field maintenance.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={isLocating}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-60 flex-shrink-0"
        >
          {isLocating ? (
            <>
              <Compass className="w-3.5 h-3.5 animate-spin" />
              Locating GPS...
            </>
          ) : (
            <>
              <Navigation className="w-3.5 h-3.5" />
              Use Current Location
            </>
          )}
        </button>
      </div>

      {locationError && (
        <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{locationError}</span>
        </div>
      )}

      {/* Street / Landmark Address */}
      <div>
        <label className="block text-xs font-medium text-slate-700 mb-1">
          Street Address / Landmark Description <span className="text-rose-500">*</span>
        </label>
        <textarea
          rows={2}
          value={address}
          onChange={(e) =>
            onChange({
              latitude,
              longitude,
              address: e.target.value,
            })
          }
          placeholder="e.g., Near Bus Terminal Gate 2, Ring Road, Sector 4"
          required
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
        />
      </div>

      {/* Manual Coordinates Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Latitude (Decimal)
          </label>
          <input
            type="number"
            step="any"
            value={latitude ?? ''}
            onChange={(e) =>
              onChange({
                latitude: e.target.value ? parseFloat(e.target.value) : null,
                longitude,
                address,
              })
            }
            placeholder="e.g., 28.613939"
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Longitude (Decimal)
          </label>
          <input
            type="number"
            step="any"
            value={longitude ?? ''}
            onChange={(e) =>
              onChange({
                latitude,
                longitude: e.target.value ? parseFloat(e.target.value) : null,
                address,
              })
            }
            placeholder="e.g., 77.209021"
            className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
          />
        </div>
      </div>

      {latitude && longitude && (
        <div className="text-[11px] text-teal-800 bg-teal-50/70 border border-teal-200/60 rounded-md p-2 flex items-center justify-between">
          <span>
            Coordinates set: {latitude.toFixed(5)}, {longitude.toFixed(5)}
          </span>
          <a
            href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="underline font-semibold hover:text-teal-950"
          >
            Preview on OpenStreetMap ↗
          </a>
        </div>
      )}
    </div>
  );
}
