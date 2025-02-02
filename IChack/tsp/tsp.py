from flask import Flask, request, jsonify
from math import sin, cos, sqrt, atan2, radians
from aco import SolveTSPUsingACO
import requests
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

app = Flask(__name__)

@app.route("/tsp", methods=['POST'])
def generate_locations():
    """
    Generates 10 random tourist locations within a given radius.
    Expects a JSON payload with `lat`, `long`, and `radius`.
    """
    data = request.get_json()
    lat = data.get("lat")
    long = data.get("long")
    radius = data.get("radius", 2000)  # Default radius
    query = data.get("query", "must see tourist locations")

    key = os.getenv("PLACES_API_KEY")
    if not key:
        return jsonify({"error": "Missing Google Places API key"}), 500

    base_url = (
        f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?"
        f"location={lat},{long}&radius={radius}&keyword={query}&key={key}"
    )

    response = requests.get(base_url)
    data = response.json()

    if "results" not in data:
        return jsonify({"error": "Invalid response from Google Places API"}), 500

    res_list = []
    lat_long_map = {}

    for idx, r in enumerate(data.get('results', [])):
        photo_url = None
        if 'photos' in r:
            photo_reference = r['photos'][0]['photo_reference']
            photo_url = (
                f"https://maps.googleapis.com/maps/api/place/photo?"
                f"maxwidth=400&photoreference={photo_reference}&key={key}"
            )

        place_lat = r['geometry']['location']['lat']
        place_long = r['geometry']['location']['lng']

        place_data = {
            "name": r.get('name', 'Unknown'),
            "vicinity": r.get('vicinity', 'No address provided'),
            "rating": r.get('rating', 'N/A'),
            "user_ratings_total": r.get('user_ratings_total', 'N/A'),
            "photo_url": photo_url,
            "lat": place_lat,
            "long": place_long
        }

        res_list.append(place_data)
        lat_long_map[idx] = (place_lat, place_long)

    return jsonify({"locations": res_list, "lat_long_map": lat_long_map})


def get_tsp(points):
    """
    Solves the Traveling Salesman Problem using Ant Colony Optimization.
    """
    colony_size = 15
    steps = 50
    mode = 'ACS'
    nodes = [tuple(point) for point in points]

    model = SolveTSPUsingACO(
        mode=mode,
        colony_size=colony_size,
        steps=steps,
        nodes=nodes
    )

    runtime, distance, best_tour = model.run()
    print(runtime, distance, best_tour)

    return best_tour


def calculate_distance(coord1, coord2):
    # https://stackoverflow.com/a/19412565
    
    R = 6373.0  # Earth's radius in km

    lat1, lon1 = radians(coord1[0]), radians(coord1[1])
    lat2, lon2 = radians(coord2[0]), radians(coord2[1])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


if __name__ == '__main__':
    app.run(debug=True)

