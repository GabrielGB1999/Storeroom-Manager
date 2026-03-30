from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, emit
import uuid
import sys
import os

app = Flask(__name__)
# Enable CORS for all domains on all routes to avoid browser blocking
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

requests_db = {}

@socketio.on('connect')
def handle_connect():
    print('A user connected', file=sys.stdout)

@socketio.on('disconnect')
def handle_disconnect():
    print('User disconnected', file=sys.stdout)

@socketio.on('join_request')
def handle_join_request(req_id):
    join_room(f"req_{req_id}")

@socketio.on('join_storekeeper')
def handle_join_storekeeper():
    join_room('storekeepers')
    emit('requests_updated', list(requests_db.values()))

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
        
        # Notify storekeepers
        socketio.emit('requests_updated', list(requests_db.values()), to='storekeepers')
        
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
            
        # Notify specific worker
        socketio.emit('status_updated', {'id': req_id, 'status': new_status}, to=f"req_{req_id}")
        # Notify storekeepers
        socketio.emit('requests_updated', list(requests_db.values()), to='storekeepers')
        
        return jsonify({'message': 'Status updated'}), 200
    return jsonify({'message': 'Request not found'}), 404

@app.route('/check_status/<req_id>', methods=['GET'])
def check_status(req_id):
    if req_id in requests_db:
        return jsonify({'status': requests_db[req_id]['status']}), 200
    else:
        return jsonify({'status': 'fulfilled'}), 200

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    password = data.get('password')
    valid_password = os.environ.get('STOREKEEPER_PASSWORD', 'admin123')
    
    if password == valid_password:
        return jsonify({'success': True}), 200
    return jsonify({'success': False, 'message': 'Invalid password'}), 401

if __name__ == '__main__':
    # Ensure it listens on all interfaces
    socketio.run(app, host='0.0.0.0', port=6868, debug=False)
