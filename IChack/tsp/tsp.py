from flask import Flask, request
from math import sin, cos, sqrt, atan2, radians
import numpy as np
import random

app = Flask(__name__)

@app.route("/tsp", methods=['POST'])
def hello_world():
    content = request.get_json()
    
    starting = tuple(content['start'])
    points = content['coordinates']

    distances = {}

    for point in points:
        distances[tuple(point)] = calculate_distance(tuple(point), starting)
    print(distances)
    return content

def calculate_distance(distance1, distance2):
    
    # https://stackoverflow.com/a/19412565

    # Approximate radius of earth in km
    R = 6373.0
  
    lat1 = radians(distance1[0])
    lon1 = radians(distance1[1])
    lat2 = radians(distance2[0])
    lon2 = radians(distance2[1])

    dlon = lon2 - lon1
    dlat = lat2 - lat1

    a = sin(dlat / 2)**2 + cos(lat1) * cos(lat2) * sin(dlon / 2)**2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    distance = R * c

    return distance

if __name__ == '__main__':
    app.run(debug=True)