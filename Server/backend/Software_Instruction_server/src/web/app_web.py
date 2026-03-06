import os
from flask import Flask, render_template, request
import sys
from flask import send_from_directory
import logging
import time

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from retrieval.search_engine import search
from response_generator.generate_response import generate_detailed_response

app = Flask(__name__)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("AUTO_FIXER")
logger.info("🚀 Software instruction web backend initializing...")


@app.before_request
def _log_request_start():
    request._start_time = time.perf_counter()
    logger.info("➡️ [software-web][%s] %s", request.method, request.path)


@app.after_request
def _log_request_end(response):
    started = getattr(request, "_start_time", None)
    elapsed_ms = (time.perf_counter() - started) * 1000 if started else 0.0
    logger.info(
        "⬅️ [software-web][%s] %s | status=%s | %.2fms",
        request.method,
        request.path,
        response.status_code,
        elapsed_ms,
    )
    return response

@app.route("/", methods=["GET", "POST"])
def index():
    logger.info("🧾 Software web index handler started")
    response = None
    images = []

    if request.method == "POST":
        query = request.form["query"]
        logger.info("🔍 Processing software query | chars=%s", len(query))

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
        logger.info("✅ Software response generated | images=%s", len(images))

    return render_template("index.html", response=response, images=images)

if __name__ == "__main__":
    app.run(debug=True)



@app.route('/images/<path:filename>')
def serve_image(filename):
    logger.info("🖼 Serving extracted image | file=%s", filename)
    base_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "data", "extracted_images"))
    return send_from_directory(base_path, filename)
