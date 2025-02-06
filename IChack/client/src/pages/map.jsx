import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from "@turf/turf";

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startingCoordinate, setStartingCoordinate] = useState(null);
  const markerRef = useRef(null);

  mapboxgl.accessToken =
    "pk.eyJ1IjoibmVvbmNvZGVzIiwiYSI6ImNtMnFpYW9oajExY2kyanNjdzhzdjI5a2kifQ.-2O_gboh9urZ6sxd4ygdxw";

  const customPinUrl = "https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png";

  const createCustomMarker = (iconUrl, size = 30) => {
    const el = document.createElement("div");
    el.style.backgroundImage = `url(${iconUrl})`;
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;
    el.style.backgroundSize = "cover";
    el.style.backgroundRepeat = "no-repeat";
    // Translate so that the bottom-center of the icon is exactly at the coordinate
    el.style.transform = "translate(-50%, -100%)";
    return el;
  };

  // Calculate the radius (in km) from the map center to the furthest bound
  const calculateRadius = () => {
    if (!map.current) return 0;
    const bounds = map.current.getBounds();
    const center = map.current.getCenter();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const distanceSW = turf.distance([center.lng, center.lat], [sw.lng, sw.lat], { units: "kilometers" });
    const distanceNE = turf.distance([center.lng, center.lat], [ne.lng, ne.lat], { units: "kilometers" });
    return Math.max(distanceSW, distanceNE);
  };

  // Capture the map's center and radius when the button is clicked
  const handleLocationCapture = () => {
    if (!map.current) return;
    const center = map.current.getCenter();
    const radius = calculateRadius();
    setCurrentLocation({
      longitude: center.lng,
      latitude: center.lat,
      radius_km: radius,
    });
    console.log("Captured Location:", { latitude: center.lat, longitude: center.lng, radius_km: radius });
  };

  // Add markers for all attractions (ordered locations) using the custom pin icon.
  // If a location matches the starting point, skip it to avoid duplication.
  const addAttractionMarkers = (locations) => {
    locations.forEach((loc) => {
      const lng = parseFloat(loc.long);
      const lat = parseFloat(loc.lat);
      if (startingCoordinate && startingCoordinate[0] === lng && startingCoordinate[1] === lat) {
        return;
      }
      new mapboxgl.Marker(createCustomMarker(customPinUrl))
        .setLngLat([lng, lat])
        .addTo(map.current);
    });
  };

  useEffect(() => {
    if (map.current) return; // initialize map only once

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: [-0.1278, 51.5074], // London
      zoom: 5,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // On click: set the starting position using a custom pin marker and fetch attractions/route.
    map.current.on("click", (e) => {
      const { lng, lat } = e.lngLat;

      // Remove previous starting marker, if it exists
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Create a new starting marker with the custom pin icon
      const startingMarkerEl = createCustomMarker(customPinUrl);
      const marker = new mapboxgl.Marker(startingMarkerEl, { draggable: false })
        .setLngLat([lng, lat])
        .addTo(map.current);
      markerRef.current = marker;
      setStartingCoordinate([lng, lat]);

      // Fetch backend data using the current map center & radius
      const center = map.current.getCenter();
      const radius = calculateRadius();
      const data = {
        lat: center.lat.toString(),
        long: center.lng.toString(),
        radius: radius.toString(),
      };

      fetch("http://127.0.0.1:5000/tsp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
        .then((response) => response.json())
        .then((data) => {
          const orderedLocations = data["ordered_locations"];
          console.log("Ordered Locations:", orderedLocations);

          // Add a custom pin marker for every attraction
          addAttractionMarkers(orderedLocations);

          // Draw the route connecting the attractions
          fetchRoute(orderedLocations);
        })
        .catch((error) => {
          console.error("Error:", error);
        });
    });

    // On map load, add a GeoJSON source and layer for drawing the route.
    map.current.on("load", () => {
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: [] },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff0000", "line-width": 5 },
      });
    });
  }, []);

  // Fetch and draw the route by connecting the attractions in order.
  // The route is animated by waiting 2 seconds between drawing each segment.
  const fetchRoute = async (locations) => {
    if (!locations || locations.length < 2) return;

    let cumulativeRoute = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates: [] },
    };

    // Convert ordered locations to an array of [lng, lat] coordinates (convert strings to numbers)
    const coordinates = locations.map((loc) => [parseFloat(loc.long), parseFloat(loc.lat)]);

    for (let i = 0; i < coordinates.length - 1; i++) {
      const segment = [coordinates[i], coordinates[i + 1]];
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${segment[0].join(
        ","
      )};${segment[1].join(",")}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

      try {
        const response = await fetch(url);
        const data = await response.json();

        if (data.routes.length) {
          const segmentGeometry = data.routes[0].geometry.coordinates;
          // Append this segment’s geometry to the cumulative route
          cumulativeRoute.geometry.coordinates.push(...segmentGeometry);

          const routeSource = map.current.getSource("route");
          if (routeSource) {
            routeSource.setData(cumulativeRoute);
          }

          // Wait 2 seconds for an animation effect before drawing the next segment
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    }
  };

  const styles = `
    .map-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }
    .mapboxgl-canvas {
      position: absolute;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
    }
  `;

  return (
    <div className="flex h-full w-full">
      <style>{styles}</style>
      <div ref={mapContainer} className="absolute inset-0 w-full h-full" />

      <button
        onClick={handleLocationCapture}
        className="absolute top-4 left-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-600 transition-colors z-10"
      >
        Capture Map Area
      </button>

      {currentLocation && (
        <div className="absolute top-20 left-4 bg-black p-4 rounded-lg shadow-lg z-10 text-white">
          <h3 className="font-bold mb-2">Captured Area:</h3>
          <p>Latitude: {currentLocation.latitude.toFixed(4)}</p>
          <p>Longitude: {currentLocation.longitude.toFixed(4)}</p>
          <p>Radius: {currentLocation.radius_km.toFixed(1)} km</p>

          <div className="mt-4 pt-2 border-t border-gray-600">
            <p className="font-semibold mb-2">Starting Position:</p>
            {startingCoordinate ? (
              <p>
                {startingCoordinate[1].toFixed(4)}, {startingCoordinate[0].toFixed(4)}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">Click anywhere on the map to set starting position</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;
