from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import sys

app = Flask(__name__)
# Enable CORS for all domains on all routes to avoid browser blocking
CORS(app, resources={r"/*": {"origins": "*"}})

requests_db = {}

@app.route('/submit_request', methods=['POST'])
def submit_request():
    try:
        data = request.json
        print(f"Received data: {data}", file=sys.stdout) # Log to Docker console
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        req_id = str(uuid.uuid4())
        requests_db[req_id] = {
            'id': req_id,
            'name': data.get('name'),
            'course': data.get('course'),
            'supervisor': data.get('supervisor'),
            'tools': data.get('tools', []),
            'status': 'pending'
        }
        print(f"Request created: {req_id}", file=sys.stdout)
        return jsonify({'id': req_id, 'message': 'Request received'}), 200
    except Exception as e:
        print(f"Error in submit_request: {e}", file=sys.stderr)
        return jsonify({'error': str(e)}), 500

@app.route('/get_requests', methods=['GET'])
def get_requests():
    active_requests = [r for r in requests_db.values()]
    return jsonify(active_requests), 200

@app.route('/update_status', methods=['POST'])
def update_status():
    data = request.json
    req_id = data.get('id')
    new_status = data.get('status')
    
    print(f"Updating status for {req_id} to {new_status}", file=sys.stdout)

    if req_id in requests_db:
        if new_status == 'fulfilled':
            del requests_db[req_id]
        else:
            requests_db[req_id]['status'] = new_status
        return jsonify({'message': 'Status updated'}), 200
    return jsonify({'message': 'Request not found'}), 404

@app.route('/check_status/<req_id>', methods=['GET'])
def check_status(req_id):
    if req_id in requests_db:
        return jsonify({'status': requests_db[req_id]['status']}), 200
    else:
        return jsonify({'status': 'fulfilled'}), 200

if __name__ == '__main__':
    # Ensure it listens on all interfaces
    app.run(host='0.0.0.0', port=6868, debug=False)
