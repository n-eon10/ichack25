from flask import Flask

app = Flask(__name__)

@app.route("/tsp")
def hello_world(inputs):
    for input in inputs:
        print(input)