import { useState, useEffect, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  useMapEvents,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue with bundlers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// Default center: Cairo, Egypt
const EGYPT_CENTER = [30.0444, 31.2357];
const DEFAULT_ZOOM = 12;

function LocationMarker({ position, onLocationSelect }) {
  const map = useMapEvents({
    click(e) {
      onLocationSelect(e.latlng);
    },
  });

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom());
    }
  }, [position, map]);

  return position ? <Marker position={position} /> : null;
}

function LocateButton({ onLocate }) {
  const map = useMap();
  const [locating, setLocating] = useState(false);
  const buttonRef = useRef(null);

  // Prevent Leaflet's own click/drag handlers from intercepting clicks on this button
  useEffect(() => {
    const node = buttonRef.current;
    if (node) {
      L.DomEvent.disableClickPropagation(node);
      L.DomEvent.disableScrollPropagation(node);
    }
  }, []);

  const handleLocate = useCallback(
    (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!navigator.geolocation) return;
      setLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const latlng = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
          map.flyTo(latlng, 16);
          onLocate(latlng);
          setLocating(false);
        },
        () => {
          map.flyTo(EGYPT_CENTER, DEFAULT_ZOOM);
          setLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000 },
      );
    },
    [map, onLocate],
  );

  return (
    <div
      className="leaflet-top leaflet-right"
      style={{ pointerEvents: "none" }}
    >
      <div className="leaflet-control" style={{ pointerEvents: "auto" }}>
        <button
          ref={buttonRef}
          type="button"
          onClick={handleLocate}
          className="bg-white px-3 py-2 rounded-lg shadow-md text-sm font-bold text-gray-800 hover:bg-gray-100 border border-gray-300 flex items-center gap-1.5 cursor-pointer"
          style={{ margin: "10px" }}
          title="Use my location"
        >
          {locating ? (
            <svg
              className="animate-spin h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                className="opacity-25"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
            </svg>
          )}
          My Location
        </button>
      </div>
    </div>
  );
}

/**
 * MapAddressPicker - A map component for selecting delivery addresses in Egypt.
 * Uses OpenStreetMap (Nominatim) for reverse geocoding.
 *
 * @param {Object} props
 * @param {Function} props.onAddressSelect - Callback ({lat, lng, address, city, state, postal_code, country}) => void
 * @param {Object} props.initialPosition - {lat, lng} initial marker position
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.height - Map height (default: "300px")
 */
export default function MapAddressPicker({
  onAddressSelect,
  initialPosition,
  className = "",
  height = "300px",
}) {
  const [position, setPosition] = useState(
    initialPosition
      ? { lat: initialPosition.lat, lng: initialPosition.lng }
      : null,
  );
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  const reverseGeocode = useCallback(
    async (latlng) => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latlng.lat}&lon=${latlng.lng}&addressdetails=1&accept-language=en`,
          { headers: { "User-Agent": "EcommerceMarketplace/1.0" } },
        );
        const data = await res.json();
        const addr = data.address || {};
        const displayAddress = data.display_name || "";
        setAddress(displayAddress);

        if (onAddressSelect) {
          onAddressSelect({
            lat: latlng.lat,
            lng: latlng.lng,
            address:
              [addr.road, addr.house_number].filter(Boolean).join(" ") ||
              addr.suburb ||
              displayAddress.split(",")[0] ||
              "",
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || addr.governorate || "",
            postal_code: addr.postcode || "",
            country: addr.country_code?.toUpperCase() || "EG",
            display_address: displayAddress,
          });
        }
      } catch {
        setAddress("Unable to fetch address");
      } finally {
        setLoading(false);
      }
    },
    [onAddressSelect],
  );

  const handleLocationSelect = useCallback(
    (latlng) => {
      setPosition(latlng);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => reverseGeocode(latlng), 400);
    },
    [reverseGeocode],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-border ${className}`}
    >
      <MapContainer
        center={position || EGYPT_CENTER}
        zoom={position ? 16 : DEFAULT_ZOOM}
        style={{ height, width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          onLocationSelect={handleLocationSelect}
        />
        <LocateButton onLocate={handleLocationSelect} />
      </MapContainer>

      {(address || loading) && (
        <div className="p-3 bg-gray-50 border-t border-border">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Fetching address...
            </div>
          ) : (
            <p className="text-sm text-text-secondary truncate" title={address}>
              📍 {address}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
