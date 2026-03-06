import os
from flask import Flask, render_template, request
import sys
from flask import send_from_directory

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from retrieval.search_engine import search
from response_generator.generate_response import generate_detailed_response

app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def index():
    response = None
    images = []

    if request.method == "POST":
        query = request.form["query"]

        predicted_type, results = search(query)
        response = generate_detailed_response(query, predicted_type, results)

        # Extract image paths from response
        if "🖼 Related Images:" in response:
            lines = response.split("\n")
            for line in lines:
                if line.strip().startswith("-"):
                    img_path = line.replace("-", "").strip()
                    relative_path = img_path.split("extracted_images/")[-1]
                    images.append("/images/" + relative_path)

    return render_template("index.html", response=response, images=images)

if __name__ == "__main__":
    app.run(debug=True)



@app.route('/images/<path:filename>')
def serve_image(filename):
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "extracted_images"))
    return send_from_directory(base_path, filename)