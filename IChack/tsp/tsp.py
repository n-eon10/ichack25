from flask import Flask, request
from math import sin, cos, sqrt, atan2, radians
import numpy as np
import random
from aco import SolveTSPUsingACO

app = Flask(__name__)

@app.route("/tsp", methods=['POST'])
def hello_world():
    content = request.get_json()
    
    colony_size = 15
    steps = 50

    mode = 'ACS'
    nodes = []

    points = content['coordinates']

    for point in points:
        nodes.append(tuple(point))
    
    model = SolveTSPUsingACO(
        mode = mode,
        colony_size = colony_size,
        steps = steps,
        nodes = nodes
    )

    runtime, distance = model.run()
    print(runtime, distance)
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