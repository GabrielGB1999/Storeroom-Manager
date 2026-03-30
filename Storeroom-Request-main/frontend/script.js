const API_URL = ""; // Ensure this matches your backend port
let toolsArray = [];
let currentWorkerReqId = localStorage.getItem('currentWorkerReqId') || null;

// --- Translations ---
const translations = {
    en: {
        navTitle: "Storeroom Request Manager",
        navWorker: "Worker",
        navStorekeeper: "StoreKeeper",
        newRequest: "New Request",
        fullName: "Full Name",
        department: "Department/Section",
        supervisor: "Supervisor",
        tools: "Tools",
        addBtn: "Add",
        sendRequest: "Send Request",
        requestSent: "Request Sent",
        waitMessage: "Please, wait for the storekeeper call in this window",
        newRequestBtn: "New Request",
        skAccess: "StoreKeeper Access",
        password: "Password",
        loginBtn: "Log In",
        activeRequest: "Active Request",
        exitBtn: "Exit",
        fillAllFields: "Please, fill all field and request a tool",
        sending: "Sending...",
        failedConnect: "failed to connect",
        checkWifi: "could not connect to server, Check WiFi connection",
        orderReady: "YOUR ORDER IS READY",
        orderRetired: "ORDER RETIRED",
        invalidPassword: "Invalid Password",
        course: "Course:",
        sup: "Sup:",
        callWorker: "Call Worker",
        called: "CALLED",
        clear: "Clear"
    },
    es: {
        navTitle: "Gestor de Solicitudes de Almacén",
        navWorker: "Trabajador",
        navStorekeeper: "Almacenero",
        newRequest: "Nueva Solicitud",
        fullName: "Nombre Completo",
        department: "Departamento/Sección",
        supervisor: "Supervisor",
        tools: "Herramientas",
        addBtn: "Agregar",
        sendRequest: "Enviar Solicitud",
        requestSent: "Solicitud Enviada",
        waitMessage: "Por favor, espere el llamado del almacenero en esta ventana",
        newRequestBtn: "Nueva Solicitud",
        skAccess: "Acceso de Almacenero",
        password: "Contraseña",
        loginBtn: "Iniciar Sesión",
        activeRequest: "Solicitudes Activas",
        exitBtn: "Salir",
        fillAllFields: "Por favor, complete todos los campos y solicite una herramienta",
        sending: "Enviando...",
        failedConnect: "Error de conexión",
        checkWifi: "No se pudo conectar al servidor, verifique la conexión WiFi",
        orderReady: "SU PEDIDO ESTÁ LISTO",
        orderRetired: "PEDIDO RETIRADO",
        invalidPassword: "Contraseña Inválida",
        course: "Curso:",
        sup: "Sup:",
        callWorker: "Llamar Trabajador",
        called: "LLAMADO",
        clear: "Limpiar"
    }
};

let currentLang = localStorage.getItem('appLang') || 'es';

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'es' : 'en';
    localStorage.setItem('appLang', currentLang);
    applyTranslations();
}

function applyTranslations() {
    // Update button text
    const toggleBtn = document.getElementById('lang-toggle');
    if (toggleBtn) {
        toggleBtn.innerText = currentLang === 'en' ? 'ES' : 'EN';
    }

    // Update all data-i18n elements
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            el.innerText = translations[currentLang][key];
        }
    });

    // Re-render requests if storekeeper dashboard is visible
    if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
        // We need to fetch requests again to re-render with new language
        fetch(`${API_URL}/get_requests`)
            .then(res => res.json())
            .then(data => renderRequests(data))
            .catch(err => console.error("Error fetching requests for translation update:", err));
    }
}

// Initialize Socket.io
const socket = io();

// Apply translations on load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
});

// Handle reconnection
socket.on('connect', () => {
    console.log('Connected to server');
    if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
        socket.emit('join_storekeeper');
    }
    if (currentWorkerReqId) {
        // Show overlay if we have an active request
        document.getElementById('worker-status-overlay').classList.remove('hidden');
        
        socket.emit('join_request', currentWorkerReqId);
        // Also fetch the current status just in case we missed an update while disconnected/reloading
        fetch(`${API_URL}/check_status/${currentWorkerReqId}`)
            .then(res => res.json())
            .then(data => {
                updateWorkerStatusUI(data.status);
            })
            .catch(err => console.error("Failed to fetch status on reconnect", err));
    }
});

// Listen for worker status updates
socket.on('status_updated', (data) => {
    if (data.id === currentWorkerReqId) {
        updateWorkerStatusUI(data.status);
    }
});

// Listen for storekeeper dashboard updates
socket.on('requests_updated', (requests) => {
    // Only update if storekeeper dashboard is visible
    if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
        renderRequests(requests);
    }
});

// --- Navigation Logic ---
function showWorkerSection() {
    document.getElementById('worker-section').classList.remove('hidden');
    document.getElementById('login-section').classList.add('hidden');
    document.getElementById('storekeeper-dashboard').classList.add('hidden');
}

function showStorekeeperLogin() {
    document.getElementById('worker-section').classList.add('hidden');
    document.getElementById('login-section').classList.remove('hidden');
    document.getElementById('storekeeper-dashboard').classList.add('hidden');
}

// --- Worker Logic ---
function addTool() {
    const input = document.getElementById('w-tool-input');
    const tool = input.value.trim();
    if (tool) {
        toolsArray.push(tool);
        renderTools();
        input.value = '';
        input.focus();
    }
}

function renderTools() {
    const list = document.getElementById('tool-list');
    list.innerHTML = toolsArray.map(t => `<li>${t}</li>`).join('');
}

async function submitRequest() {
    console.log("Attempting to submit request...");

    const name = document.getElementById('w-name').value;
    const course = document.getElementById('w-course').value;
    const supervisor = document.getElementById('w-supervisor').value;
    
    // UX FIX: If user typed a tool but didn't click 'Add', add it for them
    const pendingTool = document.getElementById('w-tool-input').value.trim();
    if (pendingTool) {
        toolsArray.push(pendingTool);
        document.getElementById('w-tool-input').value = '';
        renderTools();
    }

    if (!name || !course || !supervisor || toolsArray.length === 0) {
        alert(translations[currentLang].fillAllFields);
        return;
    }

    // UI Feedback: Show immediately
    const overlay = document.getElementById('worker-status-overlay');
    const statusMsg = document.getElementById('status-message');
    overlay.classList.remove('hidden');
    statusMsg.innerText = translations[currentLang].sending;
    statusMsg.style.color = "#333";

    try {
        const response = await fetch(`${API_URL}/submit_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, course, supervisor, tools: toolsArray })
        });

        if (!response.ok) {
            throw new Error(`Server error: ${response.status}`);
        }

        const data = await response.json();
        console.log("Request Success:", data);
        currentWorkerReqId = data.id;
        localStorage.setItem('currentWorkerReqId', currentWorkerReqId);

        statusMsg.innerText = translations[currentLang].requestSent;
        statusMsg.style.color = "var(--primary)";
        
        // Join the socket room for this specific request
        socket.emit('join_request', currentWorkerReqId);

    } catch (error) {
        console.error("Fetch error:", error);
        statusMsg.innerText = translations[currentLang].failedConnect;
        statusMsg.style.color = "red";
        alert(translations[currentLang].checkWifi);
        // Hide overlay so they can try again
        setTimeout(() => overlay.classList.add('hidden'), 2000);
    }
}

function updateWorkerStatusUI(status) {
    const statusMsg = document.getElementById('status-message');
    const loader = document.querySelector('.loader');
    const resetBtn = document.getElementById('reset-worker-btn');

    if (status === 'ready') {
        statusMsg.innerText = translations[currentLang].orderReady;
        statusMsg.style.color = "var(--secondary)"; 
    } else if (status === 'fulfilled') {
        statusMsg.innerText = translations[currentLang].orderRetired;
        statusMsg.style.color = "green";
        loader.style.display = 'none';
        resetBtn.classList.remove('hidden');
    }
}

function resetWorker() {
    currentWorkerReqId = null;
    localStorage.removeItem('currentWorkerReqId');
    toolsArray = [];
    document.getElementById('w-name').value = '';
    document.getElementById('w-course').value = '';
    document.getElementById('w-supervisor').value = '';
    document.getElementById('w-tool-input').value = ''; // Clear pending input too
    renderTools();
    document.getElementById('worker-status-overlay').classList.add('hidden');
    document.querySelector('.loader').style.display = 'block';
    document.getElementById('reset-worker-btn').classList.add('hidden');
}

// --- Storekeeper Logic ---
function loginStorekeeper() {
    const pass = document.getElementById('sk-password').value;
    if (pass === "admin123") { 
        document.getElementById('login-section').classList.add('hidden');
        document.getElementById('storekeeper-dashboard').classList.remove('hidden');
        
        // Join storekeeper room to receive real-time updates
        socket.emit('join_storekeeper');
    } else {
        document.getElementById('login-error').innerText = translations[currentLang].invalidPassword;
    }
}

function logoutStorekeeper() {
    document.getElementById('sk-password').value = '';
    showStorekeeperLogin();
}

function renderRequests(requests) {
    const container = document.getElementById('requests-grid');
    container.innerHTML = requests.map(req => `
        <div class="req-box ${req.status === 'ready' ? 'ready' : ''}">
            <h3>${req.name}</h3>
            <p><strong>${translations[currentLang].course}</strong> ${req.course}</p>
            <p><strong>${translations[currentLang].sup}</strong> ${req.supervisor}</p>
            <hr>
            <ul>${req.tools.map(t => `<li>${t}</li>`).join('')}</ul>
            <div class="req-actions">
                ${req.status === 'pending' 
                ? `<button class="btn-secondary" onclick="updateStatus('${req.id}', 'ready')">${translations[currentLang].callWorker}</button>` 
                : `<span style="color:var(--secondary); font-weight:bold; padding: 10px 0;">${translations[currentLang].called}</span>`}
                
                <button class="btn-danger" onclick="updateStatus('${req.id}', 'fulfilled')">${translations[currentLang].clear}</button>
            </div>
        </div>
    `).join('');
}

async function updateStatus(id, status) {
    try {
        await fetch(`${API_URL}/update_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
        });
        // No need to call fetchRequests() here, the socket will broadcast the update
    } catch (e) {
        console.error("Update status error:", e);
    }
}
