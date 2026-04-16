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
        clear: "Clear",
        cancelBtn: "Cancel Order",
        submittedMsg: "Your request has been submitted. Look at the board below for updates.",
        okBtn: "OK",
        publicBoardTitle: "Order Status Board",
        statusWaiting: "Waiting",
        statusReady: "Ready",
        statusDelivered: "Delivered",
        reqId: "ID:"
    },
    es: {
        navTitle: "Gestor de Solicitudes de Pañol",
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
        clear: "Limpiar",
        cancelBtn: "Cancelar Pedido",
        submittedMsg: "Su solicitud ha sido enviada. Vea la pizarra abajo para actualizaciones.",
        okBtn: "Aceptar",
        publicBoardTitle: "Pizarra de Pedidos",
        statusWaiting: "En Espera",
        statusReady: "Listo",
        statusDelivered: "Entregado",
        reqId: "ID:"
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

    // Re-render requests and public board with new language
    fetch(`${API_URL}/get_requests`)
        .then(res => res.json())
        .then(data => {
            if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
                renderRequests(data);
            }
            if (!document.getElementById('worker-section').classList.contains('hidden')) {
                renderPublicBoard(data);
            }
        })
        .catch(err => console.error("Error fetching requests for translation update:", err));
}

// Initialize Socket.io
const socket = io();

// Periodically refresh the public board to clear expired "delivered" items
setInterval(() => {
    if (!document.getElementById('worker-section').classList.contains('hidden')) {
        fetch(`${API_URL}/get_requests`)
            .then(res => res.json())
            .then(data => renderPublicBoard(data))
            .catch(err => console.error("Error periodic refresh:", err));
    }
}, 60000);

// Apply translations on load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
});

// Handle reconnection
socket.on('connect', () => {
    console.log('Connected to server');
    socket.emit('join_requests_board'); // Always join so worker sees public board
    
    if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
        socket.emit('join_storekeeper');
    }
    // We don't really need to rejoin a specific request room if the overlay is dismissed
    // but we can keep it if they refresh while the modal is open
    if (currentWorkerReqId) {
        document.getElementById('worker-status-overlay').classList.remove('hidden');
        let shortId = currentWorkerReqId.substring(0, 4).toUpperCase();
        document.getElementById('status-req-id').innerText = shortId;
        socket.emit('join_request', currentWorkerReqId);
    }
});

// Listen for worker status updates (optional now, since it doesn't stay on screen)
socket.on('status_updated', (data) => {
    // We can do something here if we want, but the public board handles it
});

// Listen for storekeeper dashboard and public board updates
socket.on('requests_updated', (requests) => {
    // Update storekeeper dashboard if visible
    if (!document.getElementById('storekeeper-dashboard').classList.contains('hidden')) {
        renderRequests(requests);
    }
    
    // Always update public board
    renderPublicBoard(requests);
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
        
        let shortId = currentWorkerReqId.substring(0, 4).toUpperCase();
        document.getElementById('status-req-id').innerText = shortId;
        
        // Hide Cancel inside the loop if desired, but we want it visible at first
        
        socket.emit('join_request', currentWorkerReqId);
        // Force server to send updated requests to everyone
        // (Server already does this in submit_request now)
        
    } catch (error) {
        console.error("Fetch error:", error);
        statusMsg.innerText = translations[currentLang].failedConnect;
        statusMsg.style.color = "red";
        alert(translations[currentLang].checkWifi);
        // Hide overlay so they can try again
        setTimeout(() => overlay.classList.add('hidden'), 2000);
    }
}

function resetWorker() {
    currentWorkerReqId = null;
    localStorage.removeItem('currentWorkerReqId');
    toolsArray = [];
    document.getElementById('w-name').value = '';
    document.getElementById('w-course').value = '';
    document.getElementById('w-supervisor').value = '';
    document.getElementById('w-tool-input').value = ''; 
    renderTools();
    
    document.getElementById('worker-status-overlay').classList.add('hidden');
    document.getElementById('status-req-id').innerText = '';
}

async function cancelRequest() {
    if (!currentWorkerReqId) return;
    
    if (!confirm(currentLang === 'en' ? "Are you sure you want to cancel this order?" : "¿Estás seguro de que deseas cancelar este pedido?")) {
        return;
    }

    try {
        await fetch(`${API_URL}/cancel_request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentWorkerReqId })
        });
        resetWorker();
    } catch (e) {
        console.error("Cancel request error:", e);
    }
}

function renderPublicBoard(requests) {
    const listWaiting = document.getElementById('list-waiting');
    const listReady = document.getElementById('list-ready');
    const listDelivered = document.getElementById('list-delivered');
    
    if(!listWaiting) return;
    
    let htmlWaiting = '';
    let htmlReady = '';
    let htmlDelivered = '';
    
    requests.forEach(req => {
        let shortId = req.id.substring(0, 4).toUpperCase();
        let item = `<li>
            <strong>${shortId} - ${req.name}</strong>
            <span>${req.course}</span>
        </li>`;
        
        if (req.status === 'pending') {
            htmlWaiting += item;
        } else if (req.status === 'ready') {
            htmlReady += item;
        } else if (req.status === 'delivered') {
            htmlDelivered += item;
        }
    });

    listWaiting.innerHTML = htmlWaiting;
    listReady.innerHTML = htmlReady;
    listDelivered.innerHTML = htmlDelivered;
}

// --- Storekeeper Logic ---
async function loginStorekeeper() {
    const pass = document.getElementById('sk-password').value;
    
    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pass })
        });
        
        if (response.ok) { 
            document.getElementById('login-section').classList.add('hidden');
            document.getElementById('storekeeper-dashboard').classList.remove('hidden');
            
            // Join storekeeper room to receive real-time updates
            socket.emit('join_storekeeper');
        } else {
            document.getElementById('login-error').innerText = translations[currentLang].invalidPassword;
        }
    } catch (e) {
        console.error("Login error:", e);
        document.getElementById('login-error').innerText = translations[currentLang].failedConnect;
    }
}

function logoutStorekeeper() {
    document.getElementById('sk-password').value = '';
    showStorekeeperLogin();
}

function renderRequests(requests) {
    const container = document.getElementById('requests-grid');
    // Storekeeper should not see delivered requests
    const activeRequests = requests.filter(req => req.status !== 'delivered');
    
    container.innerHTML = activeRequests.map(req => `
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
