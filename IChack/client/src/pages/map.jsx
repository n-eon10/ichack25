import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf';

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);

  mapboxgl.accessToken = "pk.eyJ1IjoibmVvbmNvZGVzIiwiYSI6ImNtMnFpYW9oajExY2kyanNjdzhzdjI5a2kifQ.-2O_gboh9urZ6sxd4ygdxw";

  const coordinates = [
    [-0.1278, 51.5074], // London
    [2.3522, 48.8566],  // Paris
    [4.8357, 45.7640],  // Lyon
    [9.1895, 45.4642],  // Milan
  ];

  const calculateRadius = () => {
    if (!map.current) return 0;
    
    const bounds = map.current.getBounds();
    const center = map.current.getCenter();
    
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    
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

    return Math.max(distanceSW, distanceNE);
  };

  const handleLocationCapture = () => {
    if (!map.current) return;
    
    const center = map.current.getCenter();
    const radius = calculateRadius();
    
    setCurrentLocation({
      longitude: center.lng,
      latitude: center.lat,
      radius_km: radius
    });

    console.log('Captured Location:', {
      longitude: center.lng,
      latitude: center.lat,
      radius_km: radius
    });
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

    map.current.on('moveend', () => {
      const center = map.current.getCenter();
      const radius = calculateRadius();
      
      console.log('Map Center:', {
        longitude: center.lng,
        latitude: center.lat,
        radius_km: radius
      });

      const data = {
        lat: center.lat.toString(),
        long: center.lng.toString(),
        radius: radius.toString()
      };

      fetch('/tps', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
          data = data['ordered_locations'];
      })
      .catch((error) => {
          console.error('Error:', error);
      });
      
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

      fetchRoute(coordinates);
    });
  }, []);

<<<<<<< HEAD
  // Fetch route data from Mapbox Directions API
  const fetchRoute = async () => {
=======
  const fetchRoute = async (coordinates) => {
>>>>>>> 8ebcdadd5505d5a36669d14fc599de6a4f8f20ca
    if (coordinates.length < 2) return;
  
    let cumulativeRoute = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [], // This will store all points cumulatively
      },
    };
  
    for (let i = 0; i < coordinates.length - 1; i++) {
      const segment = [coordinates[i], coordinates[i + 1]];
  
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${segment[0].join(",")};${segment[1].join(",")}?geometries=geojson&access_token=${mapboxgl.accessToken}`;
  
      try {
        const response = await fetch(url);
        const data = await response.json();
  
        if (data.routes.length) {
          const segmentGeometry = data.routes[0].geometry.coordinates;
  
          // Add new segment points to the cumulative route
          cumulativeRoute.geometry.coordinates.push(...segmentGeometry);
  
          // Ensure source exists before updating
          const routeSource = map.current.getSource("route");
          if (routeSource) {
            routeSource.setData(cumulativeRoute);
          }
  
          // Fit map bounds dynamically
          const bounds = new mapboxgl.LngLatBounds();
          cumulativeRoute.geometry.coordinates.forEach(coord => bounds.extend(coord));
          map.current.fitBounds(bounds, { padding: 50 });
  
          // Wait before drawing the next segment (animation effect)
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
          <p>Longitude: {currentLocation.longitude.toFixed(4)}</p>
          <p>Latitude: {currentLocation.latitude.toFixed(4)}</p>
          <p>Radius: {currentLocation.radius_km.toFixed(1)} km</p>
        </div>
      )}
    </div>
  );
};

export default Map;