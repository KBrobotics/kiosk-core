/**
 * InfoKiosk Worker UI - Kiosk-Grade Application
 * 
 * State Machine Implementation for Worker Kiosk
 * Handles RFID detection, login/logout flow, and message display
 */

// ============================================\\
// CONFIGURATION
// ============================================\\
const CONFIG = {
  // WebSocket
  WS_URL: window.location.protocol === 'https:' 
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`,
  WS_RECONNECT_INTERVAL: 2000,
  WS_MAX_RECONNECT_ATTEMPTS: 50,
  WS_PING_INTERVAL: 30000,

  // REST API fallback
  API_BASE_URL: '/api',
  POLLING_INTERVAL: 5000,
  
  // Timeouts (in milliseconds)
  PENDING_UID_TIMEOUT: 10000,
  RESULT_DISPLAY_TIMEOUT: 4000,
  MESSAGES_DISPLAY_TIMEOUT: 15000,
  
  // HID RFID
  HID_RFID_ENABLED: true,
  HID_INPUT_TIMEOUT: 100, // Max time between keystrokes for HID input
  
  // Debug
  DEBUG: true
};

// ============================================\\
// STATE MANAGEMENT
// ============================================\\
const STATES = {
  IDLE: 'IDLE',
  CARD_DETECTED: 'CARD_DETECTED',
  PROCESSING: 'PROCESSING',
  RESULT: 'RESULT',
  MESSAGES: 'MESSAGES'
};

const state = {
  current: STATES.IDLE,
  connected: false,
  pendingUid: null,
  pendingEmployee: null,
  countdownTimer: null,
  countdownValue: 0,
  resultType: null, // 'success' or 'error'
  resultMessage: '',
  resultDetail: '',
  messages: [],
  hidBuffer: '',
  hidTimeout: null
};

// ============================================\\
// DOM ELEMENTS
// ============================================\\
const elements = {
  statusIndicator: null,
  statusText: null,
  clock: null,
  stateIdle: null,
  stateCardDetected: null,
  stateProcessing: null,
  stateResult: null,
  stateMessages: null,
  employeeInfo: null,
  countdownProgress: null,
  countdownText: null,
  resultIcon: null,
  resultMessage: null,
  resultDetail: null,
  messagesContainer: null,
  messagesCountdown: null,
  hidInput: null
};

// ============================================\\
// LOGGING
// ============================================\\
function log(level, message, data = null) {
  if (!CONFIG.DEBUG && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  if (data) {
    console[level === 'error' ? 'error' : 'log'](prefix, message, data);
  } else {
    console[level === 'error' ? 'error' : 'log'](prefix, message);
  }
}

// ============================================\\
// WEBSOCKET CONNECTION
// ============================================\\
let ws = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;
let pingInterval = null;
let pollingInterval = null;

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) {
    log('debug', 'WebSocket already connected');
    return;
  }

  log('info', 'Connecting to WebSocket:', CONFIG.WS_URL);
  
  try {
    ws = new WebSocket(CONFIG.WS_URL);
    
    ws.onopen = () => {
      log('info', 'WebSocket connected');
      reconnectAttempts = 0;
      updateConnectionStatus(true);
      
      // Request full state on connect
      sendMessage({ type: 'request_full_state' });
      
      // Start ping interval
      if (pingInterval) clearInterval(pingInterval);
      pingInterval = setInterval(() => {
        sendMessage({ type: 'ping' });
      }, CONFIG.WS_PING_INTERVAL);
      
      // Stop polling fallback
      if (pollingInterval) {
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        log('debug', 'WS received:', message);
        handleServerMessage(message);
      } catch (error) {
        log('error', 'Failed to parse WS message:', error);
      }
    };
    
    ws.onerror = (error) => {
      log('error', 'WebSocket error:', error);
    };
    
    ws.onclose = () => {
      log('info', 'WebSocket disconnected');
      updateConnectionStatus(false);
      
      // Clear ping interval
      if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
      }
      
      // Attempt reconnection with exponential backoff
      if (reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        const delay = CONFIG.WS_RECONNECT_INTERVAL * Math.min(reconnectAttempts, 5);
        log('info', `Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
        
        updateConnectionStatus('reconnecting');
        
        reconnectTimeout = setTimeout(() => {
          connectWebSocket();
        }, delay);
      } else {
        log('error', 'Max reconnection attempts reached, falling back to polling');
        startPolling();
      }
    };
  } catch (error) {
    log('error', 'Failed to create WebSocket:', error);
    startPolling();
  }
}

function sendMessage(message) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
    log('debug', 'WS sent:', message);
  } else {
    log('debug', 'WS not connected, cannot send:', message);
  }
}

function updateConnectionStatus(status) {
  state.connected = status === true;
  
  elements.statusIndicator.className = 'indicator';
  
  if (status === true) {
    elements.statusIndicator.classList.add('connected');
    elements.statusText.textContent = 'Connected';
  } else if (status === 'reconnecting') {
    elements.statusIndicator.classList.add('reconnecting');
    elements.statusText.textContent = 'Reconnecting...';
  } else {
    elements.statusIndicator.classList.add('offline');
    elements.statusText.textContent = 'Offline';
  }
}

// ============================================\\
// REST API FALLBACK
// ============================================\\
function startPolling() {
  if (pollingInterval) return;
  
  log('info', 'Starting REST polling fallback');
  pollingInterval = setInterval(fetchState, CONFIG.POLLING_INTERVAL);
  fetchState(); // Immediate first fetch
}

async function fetchState() {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/worker/state`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    log('debug', 'REST state:', data);
    
    // Process as if received via WebSocket
    if (data.pendingUid && state.current === STATES.IDLE) {
      handleServerMessage({
        type: 'rfid_detected',
        rfid_uid: data.pendingUid,
        employee: data.employee
      });
    }
  } catch (error) {
    log('error', 'REST fetch failed:', error);
  }
}

// ============================================\\
// SERVER MESSAGE HANDLING
// ============================================\\
function handleServerMessage(message) {
  switch (message.type) {
    case 'status':
      updateConnectionStatus(message.connected);
      break;
      
    case 'pong':
      // Heartbeat acknowledged
      break;
      
    case 'full_state':
      // Handle initial state sync
      if (message.pendingUid) {
        handleRfidDetected(message.pendingUid, message.employee);
      }
      break;
      
    case 'rfid_detected':
      handleRfidDetected(message.rfid_uid, message.employee);
      break;
      
    case 'login_success':
      handleLoginSuccess(message.employee, message.messages);
      break;
      
    case 'login_error':
      handleLoginError(message.reason, message.details);
      break;
      
    case 'logout_success':
      handleLogoutSuccess(message.employee);
      break;
      
    case 'logout_error':
      handleLogoutError(message.reason, message.details);
      break;
      
    case 'timeout':
      handleTimeout(message.rfid_uid);
      break;
      
    case 'processing':
      transitionTo(STATES.PROCESSING);
      break;
      
    default:
      log('debug', 'Unknown message type:', message.type);
  }
}

// ============================================\\
// EVENT HANDLERS
// ============================================\\
function handleRfidDetected(uid, employee) {
  log('info', 'RFID detected:', uid);
  
  state.pendingUid = uid;
  state.pendingEmployee = employee || null;
  
  // Update employee info display
  if (employee) {
    elements.employeeInfo.textContent = employee.name || `ID: ${uid}`;
  } else {
    elements.employeeInfo.textContent = `Card: ${uid.substring(0, 8)}...`;
  }
  
  // Transition to card detected state
  transitionTo(STATES.CARD_DETECTED);
  
  // Start countdown
  startCountdown(CONFIG.PENDING_UID_TIMEOUT);
}

function handleLoginSuccess(employee, messages) {
  log('info', 'Login success:', employee);
  
  clearCountdown();
  
  state.resultType = 'success';
  state.resultMessage = 'Logged In Successfully';
  state.resultDetail = employee?.name ? `Welcome, ${employee.name}!` : 'Welcome!';
  
  transitionTo(STATES.RESULT);
  
  // Check for messages
  if (messages && messages.length > 0) {
    state.messages = messages;
    setTimeout(() => {
      transitionTo(STATES.MESSAGES);
      startMessagesCountdown();
    }, CONFIG.RESULT_DISPLAY_TIMEOUT);
  } else {
    // Return to idle after result display
    setTimeout(() => {
      transitionTo(STATES.IDLE);
    }, CONFIG.RESULT_DISPLAY_TIMEOUT);
  }
}

function handleLoginError(reason, details) {
  log('info', 'Login error:', reason, details);
  
  clearCountdown();
  
  state.resultType = 'error';
  state.resultMessage = 'Login Failed';
  state.resultDetail = getErrorMessage(reason, details);
  
  transitionTo(STATES.RESULT);
  
  setTimeout(() => {
    transitionTo(STATES.IDLE);
  }, CONFIG.RESULT_DISPLAY_TIMEOUT);
}

function handleLogoutSuccess(employee) {
  log('info', 'Logout success:', employee);
  
  clearCountdown();
  
  state.resultType = 'success';
  state.resultMessage = 'Logged Out Successfully';
  state.resultDetail = employee?.name ? `Goodbye, ${employee.name}!` : 'Goodbye!';
  
  transitionTo(STATES.RESULT);
  
  setTimeout(() => {
    transitionTo(STATES.IDLE);
  }, CONFIG.RESULT_DISPLAY_TIMEOUT);
}

function handleLogoutError(reason, details) {
  log('info', 'Logout error:', reason, details);
  
  clearCountdown();
  
  state.resultType = 'error';
  state.resultMessage = 'Logout Failed';
  state.resultDetail = getErrorMessage(reason, details);
  
  transitionTo(STATES.RESULT);
  
  setTimeout(() => {
    transitionTo(STATES.IDLE);
  }, CONFIG.RESULT_DISPLAY_TIMEOUT);
}

function handleTimeout(uid) {
  log('info', 'Timeout for UID:', uid);
  
  clearCountdown();
  
  state.resultType = 'error';
  state.resultMessage = 'Timeout';
  state.resultDetail = 'No action taken. Please try again.';
  
  transitionTo(STATES.RESULT);
  
  setTimeout(() => {
    transitionTo(STATES.IDLE);
  }, CONFIG.RESULT_DISPLAY_TIMEOUT);
}

function getErrorMessage(reason, details) {
  const errorMessages = {
    'unknown_rfid': 'Unknown card. Please contact administrator.',
    'inactive_employee': 'Employee account is inactive.',
    'no_active_session': 'No active session to log out.',
    'already_logged_in': 'Already logged in.',
    'database_error': 'System error. Please try again.',
    'timeout': 'Request timed out.'
  };
  
  return errorMessages[reason] || details || 'An error occurred.';
}

// ============================================\\
// STATE TRANSITIONS
// ============================================\\
function transitionTo(newState) {
  if (state.current === newState) return;
  
  log('info', `State transition: ${state.current} -> ${newState}`);
  
  const oldState = state.current;
  state.current = newState;
  
  // Hide all state containers
  Object.values(elements).forEach(el => {
    if (el && el.classList && el.classList.contains('state-container')) {
      el.classList.remove('active');
    }
  });
  
  // Show new state container
  switch (newState) {
    case STATES.IDLE:
      elements.stateIdle.classList.add('active');
      state.pendingUid = null;
      state.pendingEmployee = null;
      clearCountdown();
      refocusHidInput();
      break;
      
    case STATES.CARD_DETECTED:
      elements.stateCardDetected.classList.add('active');
      break;
      
    case STATES.PROCESSING:
      elements.stateProcessing.classList.add('active');
      break;
      
    case STATES.RESULT:
      elements.resultIcon.className = `result-icon ${state.resultType}`;
      elements.resultMessage.textContent = state.resultMessage;
      elements.resultDetail.textContent = state.resultDetail;
      elements.stateResult.classList.add('active');
      break;
      
    case STATES.MESSAGES:
      renderMessages();
      elements.stateMessages.classList.add('active');
      break;
  }
}

// ============================================\\
// COUNTDOWN TIMER
// ============================================\\
function startCountdown(durationMs) {
  clearCountdown();
  
  state.countdownValue = durationMs;
  const startTime = Date.now();
  const endTime = startTime + durationMs;
  
  function updateCountdown() {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    const progress = (remaining / durationMs) * 100;
    
    elements.countdownProgress.style.width = `${progress}%`;
    elements.countdownText.textContent = `${Math.ceil(remaining / 1000)}s`;
    
    if (remaining > 0) {
      state.countdownTimer = requestAnimationFrame(updateCountdown);
    }
  }
  
  updateCountdown();
}

function clearCountdown() {
  if (state.countdownTimer) {
    cancelAnimationFrame(state.countdownTimer);
    state.countdownTimer = null;
  }
  elements.countdownProgress.style.width = '100%';
  elements.countdownText.textContent = '';
}

// ============================================\\
// MESSAGES DISPLAY
// ============================================\\
function renderMessages() {
  elements.messagesContainer.innerHTML = '';
  
  const sortedMessages = [...state.messages].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2, normal: 2 };
    return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
  });
  
  sortedMessages.forEach(msg => {
    const card = document.createElement('div');
    card.className = `message-card priority-${msg.priority || 'normal'}`;
    
    const title = document.createElement('div');
    title.className = 'message-title';
    title.textContent = msg.title || 'Message';
    
    const body = document.createElement('div');
    body.className = 'message-body';
    body.textContent = msg.body || msg.content || '';
    
    card.appendChild(title);
    card.appendChild(body);
    elements.messagesContainer.appendChild(card);
  });
}

function startMessagesCountdown() {
  let remaining = CONFIG.MESSAGES_DISPLAY_TIMEOUT / 1000;
  
  elements.messagesCountdown.textContent = remaining;
  
  const interval = setInterval(() => {
    remaining--;
    elements.messagesCountdown.textContent = remaining;
    
    if (remaining <= 0) {
      clearInterval(interval);
      transitionTo(STATES.IDLE);
    }
  }, 1000);
}

// ============================================\\
// HID RFID INPUT HANDLING
// ============================================\\
function setupHidRfidInput() {
  if (!CONFIG.HID_RFID_ENABLED) {
    log('debug', 'HID RFID input disabled');
    return;
  }
  
  elements.hidInput.addEventListener('input', (e) => {
    // Clear previous timeout
    if (state.hidTimeout) {
      clearTimeout(state.hidTimeout);
    }
    
    // Accumulate input
    state.hidBuffer += e.data || '';
    
    // Set timeout to process complete input
    state.hidTimeout = setTimeout(() => {
      processHidInput();
    }, CONFIG.HID_INPUT_TIMEOUT);
  });
  
  elements.hidInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.hidTimeout) {
        clearTimeout(state.hidTimeout);
      }
      processHidInput();
    }
  });
  
  // Keep input focused
  document.addEventListener('click', refocusHidInput);
  document.addEventListener('touchstart', refocusHidInput);
  
  // Initial focus
  refocusHidInput();
}

function processHidInput() {
  const uid = state.hidBuffer.trim();
  state.hidBuffer = '';
  elements.hidInput.value = '';
  
  if (uid.length > 0) {
    log('info', 'HID RFID input received:', uid);
    
    // Send to backend via WebSocket
    sendMessage({
      type: 'hid_rfid_scan',
      rfid_uid: uid
    });
  }
}

function refocusHidInput() {
  if (CONFIG.HID_RFID_ENABLED && elements.hidInput && state.current === STATES.IDLE) {
    setTimeout(() => {
      elements.hidInput.focus();
    }, 100);
  }
}

// ============================================\\
// CLOCK UPDATE
// ============================================\\
function updateClock() {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  elements.clock.textContent = `${hours}:${minutes}:${seconds}`;
}

// ============================================\\
// INITIALIZATION
// ============================================\\
function init() {
  log('info', 'InfoKiosk Worker UI initializing...');
  
  // Cache DOM elements
  elements.statusIndicator = document.getElementById('status-indicator');
  elements.statusText = document.getElementById('status-text');
  elements.clock = document.getElementById('clock');
  elements.stateIdle = document.getElementById('state-idle');
  elements.stateCardDetected = document.getElementById('state-card-detected');
  elements.stateProcessing = document.getElementById('state-processing');
  elements.stateResult = document.getElementById('state-result');
  elements.stateMessages = document.getElementById('state-messages');
  elements.employeeInfo = document.getElementById('employee-info');
  elements.countdownProgress = document.getElementById('countdown-progress');
  elements.countdownText = document.getElementById('countdown-text');
  elements.resultIcon = document.getElementById('result-icon');
  elements.resultMessage = document.getElementById('result-message');
  elements.resultDetail = document.getElementById('result-detail');
  elements.messagesContainer = document.getElementById('messages-container');
  elements.messagesCountdown = document.getElementById('messages-countdown');
  elements.hidInput = document.getElementById('hid-rfid-input');
  
  // Start clock
  updateClock();
  setInterval(updateClock, 1000);
  
  // Setup HID RFID input
  setupHidRfidInput();
  
  // Connect WebSocket
  connectWebSocket();
  
  // Set initial state
  transitionTo(STATES.IDLE);
  
  log('info', 'InfoKiosk Worker UI ready');
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================\\
// EXPORTS FOR TESTING
// ============================================\\
if (typeof window !== 'undefined') {
  window.InfoKiosk = {
    state,
    CONFIG,
    STATES,
    transitionTo,
    handleServerMessage,
    sendMessage
  };
}
