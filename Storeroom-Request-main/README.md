# 🛠️ Storeroom Request Manager

A lightweight, containerized web application designed to streamline the process of requesting tools in a workshop or storeroom environment. This app replaces paper tickets and shouting with a real-time digital queue system.

## ✨ Features

*   **Worker Interface**:
    *   Simple form to input Name, Course, Supervisor, and a list of Tools.
    *   **Real-time Status Updates**: Notify the worker immediately when their order is ready ("Come and take your order") or fulfilled.
    *   Mobile-friendly Material Design.
*   **Storekeeper Dashboard**:
    *   Password-protected access.
    *   View all active requests in a card layout.
    *   **Actions**: "Call Worker" (triggers alert on worker's screen) and "Clear Request" (removes from list).
*   **Architecture**:
    *   **Frontend**: Pure HTML/CSS/JS served via a lightweight Python HTTP server.
    *   **Backend**: Python Flask API.
    *   **Deployment**: Fully containerized with Docker Compose.

## 🚀 Prerequisites

*   Docker
*   Docker Compose
*   A server or computer reachable via a static IP (e.g., `192.168.1.100`) if deploying on a network.

## ⚙️ Initial Configuration

Before running the application, you **must** configure the server IP address so that devices on the network (phones, laptops) can communicate with the backend.

### 1. Set the Server IP
1.  Open the file `frontend/script.js`.
2.  Locate the first line:
    ```javascript
    const API_URL = "http://localhost:6868";
    ```
3.  Change `localhost` to your server's local IP address.
    *   *Example:*
    ```javascript
    const API_URL = "http://192.168.1.100:6868";
    ```
### 2. Configure Storekeeper password ####
* Go to line 138 in /frontend/script.js
* ``` javascript
  if (pass === "admin123") {
  ```
* Change "admin123" for your desired password
### 2. Configure Firewall (If running on Linux Server)
The application uses two ports:
*   **6767**: Frontend (User Interface)
*   **6868**: Backend (API)

You must allow traffic on these ports.

**For Ubuntu (UFW):**
```bash
sudo ufw allow 6767/tcp
sudo ufw allow 6868/tcp
sudo ufw reload
```

**For CentOS/RHEL (Firewalld):**
```bash
sudo firewall-cmd --zone=public --add-port=6767/tcp --permanent
sudo firewall-cmd --zone=public --add-port=6868/tcp --permanent
sudo firewall-cmd --reload
```

## 📦 How to Run

1.  Clone this repository:
    ```bash
    git clone https://github.com/GabrielGB1999/Storeroom-Request.git
    ```

2.  Build and start the containers:
    ```bash
    docker-compose up --build -d
    ```

3.  Check the status:
    ```bash
    docker ps
    ```
    *You should see `storeroom_frontend` running on port 6767 and `storeroom_backend` on port 6868.*

## 📖 Usage Guide

### For Workers (Requesting Tools)
1.  Connect your phone or laptop to the same Wi-Fi network as the server.
2.  Open a browser and navigate to: `http://<SERVER_IP>:6767`
3.  Fill in your details, add tools to the list, and click **Send Request**.
4.  Wait on the screen. The status will update automatically to **"COME AND TAKE YOUR ORDER"** when the storekeeper calls you.

### For Storekeepers (Managing Requests)
1.  Open `http://<SERVER_IP>:6767` in your browser.
2.  Click the **"Storekeeper"** button in the top right.
3.  Login with the default password: **`admin123`**
4.  **Workflow**:
    *   When a request arrives, gather the tools.
    *   Click **"Call Worker"** to notify them.
    *   When they pick up the tools, click **"Clear"** to archive the request.

## 🔧 Troubleshooting

**"Connection Refused" on other devices:**
*   Ensure you updated `frontend/script.js` with the correct IP, not `localhost`.
*   Ensure you rebuilt the container after changing the script (`docker-compose up --build -d`).
*   Check your firewall settings (Step 2 in Configuration).

**The app loads, but requests don't send:**
*   Open the Browser Developer Console (F12).
*   If you see "Mixed Content" errors (HTTPS vs HTTP), ensure you are typing `http://` explicitly in the address bar, as the app does not use SSL by default.

## 📝 License
GNU V 3.0
*Do not delete "Created by Gabrie1999" in Index.html file. Add your name in the "Deployed by" section in the Index.html 
 
