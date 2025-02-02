import React, { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import * as turf from '@turf/turf';

const Map = () => {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [startingCoordinate, setStartingCoordinate] = useState(null);
  const markerRef = useRef(null);

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
      latitude: center.lat,
      longitude: center.lng,
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

    // Add click handler for setting starting position
    map.current.on('click', (e) => {      
      const center = map.current.getCenter();
      const radius = calculateRadius();

      const { lng, lat } = e.lngLat;
      
      // Remove previous marker
      if (markerRef.current) {
        markerRef.current.remove();
      }

      // Create new marker
      const marker = new mapboxgl.Marker({
        color: '#FF0000',
        draggable: false
      }).setLngLat([lng, lat])
        .addTo(map.current);

      markerRef.current = marker;
      setStartingCoordinate([lat, lng]);
            // Fetch from backend
            const data = {
              lat: center.lat.toString(),
              long: center.lng.toString(),
              radius: radius.toString()
            };
            fetch(' http://127.0.0.1:5000/tsp', {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(data => {
                data = data['ordered_locations'];
                console.log(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    });

    map.current.on('moveend', () => {
      const center = map.current.getCenter();
      const radius = calculateRadius();
      
      console.log('Map Center:', {
        latitude: center.lat,
        longitude: center.lng,
        radius_km: radius
      });
   
      // Fetch from backend
      const data = {
        lat: center.lat.toString(),
        long: center.lng.toString(),
        radius: radius.toString()
      };

      getData(data);
      
    });

    const getData = async (data) => {
      const response = await fetch(`http://127.0.0.1:5000/tsp`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      .then(response => response.json())
      .then(data => {
          data = data['ordered_locations'];
          console.log(data);
      })
      .catch((error) => {
          console.error('Error:', error);
      });
    };

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

  const fetchRoute = async (coordinates) => {
    if (coordinates.length < 2) return;
  
    let cumulativeRoute = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [],
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
  
          cumulativeRoute.geometry.coordinates.push(...segmentGeometry);
  
          const routeSource = map.current.getSource("route");
          if (routeSource) {
            routeSource.setData(cumulativeRoute);
          }
  
          const bounds = new mapboxgl.LngLatBounds();
          cumulativeRoute.geometry.coordinates.forEach(coord => bounds.extend(coord));
          map.current.fitBounds(bounds, { padding: 50 });
  
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
                {startingCoordinate[0].toFixed(4)}, {startingCoordinate[1].toFixed(4)}
              </p>
            ) : (
              <p className="text-gray-400 text-sm">
                Click anywhere on the map to set starting position
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Map;