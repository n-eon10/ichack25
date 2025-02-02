import requests

from dotenv import load_dotenv
import os
load_dotenv()


"""
user inputs area they want to visit
generate 10 random locations within area
pass to aco endpoint
    
if there is time consider: base_url = https://maps.googleapis.com/maps/api/directions/json?origin=London&destination=Edinburgh&mode=driving
"""
key = os.getenv("PLACES_API_KEY")

def generate_locations(lat, long, radius, query="must see tourist locations"):
    base_url = f"https://maps.googleapis.com/maps/api/place/nearbysearch/json?location={lat},{long}&radius={radius}&keyword={query}&key={key}"
    response = requests.get(base_url)
    res = {}
    for r in response.json()['results']:
        photo_url = None
        if 'photos' in r:
            photo_reference = r['photos'][0]['photo_reference']
            photo_url =f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key=" + key
        
        lat = r['geometry']['location']['lat']
        long = r['geometry']['location']['lng']

        res[(lat, long)] = (r['name'], r['vicinity'], r['rating'], r['user_ratings_total'], photo_url)

    return res
    

y = generate_locations("51.5074", "0.1278", "2000", "kfc")
print(len(y))
for x in y.items():
    print(x)
    print()