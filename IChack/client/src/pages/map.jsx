import React, { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf';

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);

  mapboxgl.accessToken = "pk.eyJ1IjoibmVvbmNvZGVzIiwiYSI6ImNtMnFpYW9oajExY2kyanNjdzhzdjI5a2kifQ.-2O_gboh9urZ6sxd4ygdxw";

  const coordinates = [
    [-0.1278, 51.5074], // London
    [2.3522, 48.8566],  // Paris
    [4.8357, 45.7640],  // Lyon
    [9.1895, 45.4642],  // Milan
  ];

  const calculateRadius = () => {
    if (!map.current) return 0;
    
    // Get map bounds
    const bounds = map.current.getBounds();
    const center = map.current.getCenter();
    
    // Calculate distance to southwest and northeast corners
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
    // Calculate distances using Turf.js
    const distanceSW = turf.distance(
      [center.lng, center.lat],
      [sw.lng, sw.lat],
      { units: 'kilometers' }
    );
    
    const distanceNE = turf.distance(
      [center.lng, center.lat],
      [ne.lng, ne.lat],
      { units: 'kilometers' }
    );

    // Return the maximum distance (radius to farthest border)
    return Math.max(distanceSW, distanceNE);
  };

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/standard",
      center: coordinates[0],
      zoom: 5,
    });

    map.current.addControl(new mapboxgl.NavigationControl());

    // Add moveend listener
    map.current.on('moveend', () => {
      const center = map.current.getCenter();
      const radius = calculateRadius();
      
      console.log('Map Center:', {
        longitude: center.lng,
        latitude: center.lat,
        radius_km: radius
      });
    });

    coordinates.forEach(coord => {
      new mapboxgl.Marker().setLngLat(coord).addTo(map.current);
    });

    map.current.on("load", () => {
      map.current.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: [],
          },
        },
      });

      map.current.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#ff0000", "line-width": 5 },
      });

      fetchRoute();
    });
  }, []);

  const fetchRoute = async () => {
    if (coordinates.length < 2) return;

    const coordsString = coordinates.map(coord => coord.join(",")).join(";");
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordsString}?geometries=geojson&access_token=${mapboxgl.accessToken}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      if (data.routes.length) {
        const route = data.routes[0].geometry;
        map.current.getSource("route").setData({
          type: "Feature",
          properties: {},
          geometry: route,
        });

        const bounds = new mapboxgl.LngLatBounds();
        coordinates.forEach(coord => bounds.extend(coord));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    } catch (error) {
      console.error("Error fetching route:", error);
    }
  };

  return <div ref={mapContainer} className="w-screen h-screen" />;
};

export default Map;