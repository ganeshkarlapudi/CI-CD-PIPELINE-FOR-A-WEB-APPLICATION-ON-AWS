from flask import Flask, render_template, request, jsonify
import json
import os

app = Flask(__name__, static_folder="static", template_folder="templates")
DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r") as f:
                return json.load(f)
        except Exception:
            return []
    return []

def save_data(data):
    with open(DATA_FILE, "w") as f:
        json.dump(data, f, indent=2)

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        student = {
            "name": request.form.get("name","").strip(),
            "email": request.form.get("email","").strip(),
            "course": request.form.get("course","").strip(),
            "phone": request.form.get("phone","").strip()
        }
        # basic validation
        if not student["name"] or not student["email"]:
            return "<h2>Missing required fields</h2><a href='/register'>Back</a>", 400

        students = load_data()
        students.append(student)
        save_data(students)
        return "<h2>Registration Successful!</h2><a href='/'>Back to Home</a>"
    return render_template("register.html")

@app.route("/students")
def students():
    return jsonify(load_data())

@app.route("/students_page")
def students_page():
    return render_template("students.html")

if __name__ == "__main__":
    # Listen on 0.0.0.0 port 80 so EC2 public IP serves it
    app.run(host="0.0.0.0", port=80)
