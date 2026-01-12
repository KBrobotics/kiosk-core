/**
 * InfoKiosk Admin UI - Message Management Application
 * 
 * Handles authentication, CRUD operations for messages,
 * and real-time updates via WebSocket
 */

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
  // API
  API_BASE_URL: '/api/admin',
  
  // WebSocket
  WS_URL: window.location.protocol === 'https:' 
    ? `wss://${window.location.host}/ws`
    : `ws://${window.location.host}/ws`,
  WS_RECONNECT_INTERVAL: 3000,
  WS_MAX_RECONNECT_ATTEMPTS: 10,
  
  // Session
  SESSION_KEY: 'infokiosk_admin_session',
  
  // UI
  TOAST_DURATION: 4000,
  
  // Validation
  TITLE_MAX_LENGTH: 100,
  BODY_MAX_LENGTH: 1000,
  
  // Debug
  DEBUG: true
};

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
  authenticated: false,
  username: '',
  authToken: '',
  messages: [],
  editingMessageId: null,
  isLoading: false,
  deleteTargetId: null,
  connected: false
};

// ============================================
// DOM ELEMENTS
// ============================================
const elements = {};

function cacheElements() {
  // Login
  elements.loginContainer = document.getElementById('login-container');
  elements.loginForm = document.getElementById('login-form');
  elements.usernameInput = document.getElementById('username');
  elements.passwordInput = document.getElementById('password');
  elements.loginError = document.getElementById('login-error');
  elements.loginBtn = document.getElementById('login-btn');
  
  // Admin
  elements.adminContainer = document.getElementById('admin-container');
  elements.adminUser = document.getElementById('admin-user');
  elements.logoutBtn = document.getElementById('logout-btn');
  elements.connectionStatus = document.getElementById('connection-status');
  
  // Messages
  elements.messagesPanel = document.getElementById('messages-panel');
  elements.messagesTbody = document.getElementById('messages-tbody');
  elements.noMessages = document.getElementById('no-messages');
  elements.newMessageBtn = document.getElementById('new-message-btn');
  
  // Editor
  elements.editorPanel = document.getElementById('editor-panel');
  elements.editorTitle = document.getElementById('editor-title');
  elements.closeEditorBtn = document.getElementById('close-editor-btn');
  elements.messageForm = document.getElementById('message-form');
  elements.messageId = document.getElementById('message-id');
  elements.msgTitle = document.getElementById('msg-title');
  elements.msgBody = document.getElementById('msg-body');
  elements.msgTargetType = document.getElementById('msg-target-type');
  elements.msgTargetValue = document.getElementById('msg-target-value');
  elements.targetValueGroup = document.getElementById('target-value-group');
  elements.msgPriority = document.getElementById('msg-priority');
  elements.msgValidFrom = document.getElementById('msg-valid-from');
  elements.msgValidTo = document.getElementById('msg-valid-to');
  elements.msgEnabled = document.getElementById('msg-enabled');
  elements.formError = document.getElementById('form-error');
  elements.saveBtn = document.getElementById('save-btn');
  elements.cancelBtn = document.getElementById('cancel-btn');
  elements.titleCount = document.getElementById('title-count');
  elements.bodyCount = document.getElementById('body-count');
  
  // Modal
  elements.deleteModal = document.getElementById('delete-modal');
  elements.deleteMessageTitle = document.getElementById('delete-message-title');
  elements.cancelDeleteBtn = document.getElementById('cancel-delete-btn');
  elements.confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  
  // Toast
  elements.toastContainer = document.getElementById('toast-container');
}

// ============================================
// LOGGING
// ============================================
function log(level, message, data = null) {
  if (!CONFIG.DEBUG && level === 'debug') return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [ADMIN] [${level.toUpperCase()}]`;
  
  if (data) {
    console[level === 'error' ? 'error' : 'log'](prefix, message, data);
  } else {
    console[level === 'error' ? 'error' : 'log'](prefix, message);
  }
}

// ============================================
// INPUT VALIDATION
// ============================================
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim();
}

function validateTitle(title) {
  const sanitized = sanitizeString(title);
  if (!sanitized) {
    return { valid: false, error: 'Title is required' };
  }
  if (sanitized.length > CONFIG.TITLE_MAX_LENGTH) {
    return { valid: false, error: `Title must be ${CONFIG.TITLE_MAX_LENGTH} characters or less` };
  }
  return { valid: true, value: sanitized };
}

function validateBody(body) {
  const sanitized = sanitizeString(body);
  if (!sanitized) {
    return { valid: false, error: 'Body is required' };
  }
  if (sanitized.length > CONFIG.BODY_MAX_LENGTH) {
    return { valid: false, error: `Body must be ${CONFIG.BODY_MAX_LENGTH} characters or less` };
  }
  return { valid: true, value: sanitized };
}

function validateTargetType(type) {
  const validTypes = ['all', 'role', 'employee'];
  if (!validTypes.includes(type)) {
    return { valid: false, error: 'Invalid target type' };
  }
  return { valid: true, value: type };
}

function validatePriority(priority) {
  const num = parseInt(priority, 10);
  if (isNaN(num) || num < 1 || num > 5) {
    return { valid: false, error: 'Priority must be between 1 and 5' };
  }
  return { valid: true, value: num };
}

function validateMessageForm(formData) {
  const errors = [];
  const validated = {};
  
  // Title
  const titleResult = validateTitle(formData.title);
  if (!titleResult.valid) {
    errors.push(titleResult.error);
  } else {
    validated.title = titleResult.value;
  }
  
  // Body
  const bodyResult = validateBody(formData.body);
  if (!bodyResult.valid) {
    errors.push(bodyResult.error);
  } else {
    validated.body = bodyResult.value;
  }
  
  // Target Type
  const targetTypeResult = validateTargetType(formData.target_type);
  if (!targetTypeResult.valid) {
    errors.push(targetTypeResult.error);
  } else {
    validated.target_type = targetTypeResult.value;
  }
  
  // Target Value (required for role and employee)
  if (validated.target_type === 'role' || validated.target_type === 'employee') {
    const targetValue = sanitizeString(formData.target_value);
    if (!targetValue) {
      errors.push('Target value is required for role or employee targeting');
    } else {
      validated.target_value = targetValue;
    }
  } else {
    validated.target_value = null;
  }
  
  // Priority
  const priorityResult = validatePriority(formData.priority);
  if (!priorityResult.valid) {
    errors.push(priorityResult.error);
  } else {
    validated.priority = priorityResult.value;
  }
  
  // Dates (optional)
  validated.valid_from = formData.valid_from || null;
  validated.valid_to = formData.valid_to || null;
  
  // Enabled
  validated.enabled = Boolean(formData.enabled);
  
  // ID (for updates)
  if (formData.id) {
    validated.id = formData.id;
  }
  
  return {
    valid: errors.length === 0,
    errors,
    data: validated
  };
}

// ============================================
// AUTHENTICATION
// ============================================
function loadSession() {
  try {
    const session = localStorage.getItem(CONFIG.SESSION_KEY);
    if (session) {
      const parsed = JSON.parse(session);
      if (parsed.username && parsed.authToken) {
        state.username = parsed.username;
        state.authToken = parsed.authToken;
        state.authenticated = true;
        return true;
      }
    }
  } catch (e) {
    log('error', 'Failed to load session:', e);
  }
  return false;
}

function saveSession() {
  try {
    localStorage.setItem(CONFIG.SESSION_KEY, JSON.stringify({
      username: state.username,
      authToken: state.authToken
    }));
  } catch (e) {
    log('error', 'Failed to save session:', e);
  }
}

function clearSession() {
  state.authenticated = false;
  state.username = '';
  state.authToken = '';
  localStorage.removeItem(CONFIG.SESSION_KEY);
}

async function login(username, password) {
  // Validate inputs
  const sanitizedUsername = sanitizeString(username);
  const sanitizedPassword = password; // Don't trim passwords
  
  if (!sanitizedUsername || !sanitizedPassword) {
    throw new Error('Username and password are required');
  }
  
  // Create auth token (Base64 encoded)
  const authToken = btoa(`${sanitizedUsername}:${sanitizedPassword}`);
  
  // Test authentication by making an API call
  const response = await fetch(`${CONFIG.API_BASE_URL}/messages`, {
    method: 'GET',
    headers: {
      'Authorization': `Basic ${authToken}`
    }
  });
  
  if (response.status === 401) {
    throw new Error('Invalid username or password');
  }
  
  if (!response.ok) {
    throw new Error('Authentication failed');
  }
  
  // Save state
  state.username = sanitizedUsername;
  state.authToken = authToken;
  state.authenticated = true;
  saveSession();
  
  // Load messages from response
  const messages = await response.json();
  state.messages = messages;
  
  log('info', 'Logged in as:', sanitizedUsername);
}

function logout() {
  clearSession();
  state.messages = [];
  state.editingMessageId = null;
  disconnectWebSocket();
  showLoginUI();
  log('info', 'Logged out');
}

// ============================================
// API COMMUNICATION
// ============================================
async function apiRequest(method, endpoint, data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${state.authToken}`,
      'Content-Type': 'application/json'
    }
  };
  
  if (data) {
    options.body = JSON.stringify(data);
  }
  
  const response = await fetch(`${CONFIG.API_BASE_URL}${endpoint}`, options);
  
  if (response.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `Request failed: ${response.status}`);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  return response.json();
}

async function fetchMessages() {
  try {
    state.messages = await apiRequest('GET', '/messages');
    renderMessages();
    log('debug', 'Fetched messages:', state.messages.length);
  } catch (error) {
    log('error', 'Failed to fetch messages:', error);
    showToast('Failed to load messages', 'error');
  }
}

async function createMessage(messageData) {
  return apiRequest('POST', '/messages', messageData);
}

async function updateMessage(id, messageData) {
  return apiRequest('PUT', `/messages/${id}`, messageData);
}

async function deleteMessage(id) {
  return apiRequest('DELETE', `/messages/${id}`);
}

async function toggleMessageEnabled(id, enabled) {
  return apiRequest('PUT', `/messages/${id}`, { enabled });
}

// ============================================
// WEBSOCKET CONNECTION
// ============================================
let ws = null;
let reconnectAttempts = 0;
let reconnectTimeout = null;

function connectWebSocket() {
  if (ws && ws.readyState === WebSocket.OPEN) return;
  
  log('debug', 'Connecting to WebSocket:', CONFIG.WS_URL);
  
  try {
    ws = new WebSocket(CONFIG.WS_URL);
    
    ws.onopen = () => {
      log('info', 'WebSocket connected');
      reconnectAttempts = 0;
      updateConnectionStatus('connected');
      
      // Authenticate WebSocket connection
      ws.send(JSON.stringify({
        type: 'admin_auth',
        token: state.authToken
      }));
    };
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        handleWebSocketMessage(message);
      } catch (error) {
        log('error', 'Failed to parse WS message:', error);
      }
    };
    
    ws.onerror = (error) => {
      log('error', 'WebSocket error:', error);
    };
    
    ws.onclose = () => {
      log('info', 'WebSocket disconnected');
      updateConnectionStatus('offline');
      
      if (state.authenticated && reconnectAttempts < CONFIG.WS_MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        updateConnectionStatus('reconnecting');
        reconnectTimeout = setTimeout(connectWebSocket, CONFIG.WS_RECONNECT_INTERVAL);
      }
    };
  } catch (error) {
    log('error', 'Failed to create WebSocket:', error);
  }
}

function disconnectWebSocket() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
}

function handleWebSocketMessage(message) {
  log('debug', 'WS message:', message.type);
  
  switch (message.type) {
    case 'messages_updated':
      // Refresh messages when backend notifies of changes
      fetchMessages();
      break;
      
    case 'message_created':
    case 'message_updated':
    case 'message_deleted':
      // Handle individual message updates
      fetchMessages();
      break;
  }
}

function updateConnectionStatus(status) {
  state.connected = status === 'connected';
  
  elements.connectionStatus.className = 'connection-status ' + status;
  
  const statusText = elements.connectionStatus.querySelector('.status-text');
  switch (status) {
    case 'connected':
      statusText.textContent = 'Connected';
      break;
    case 'reconnecting':
      statusText.textContent = 'Reconnecting...';
      break;
    case 'offline':
      statusText.textContent = 'Offline';
      break;
  }
}

// ============================================
// UI RENDERING
// ============================================
function showLoginUI() {
  elements.loginContainer.classList.remove('hidden');
  elements.adminContainer.classList.add('hidden');
  elements.usernameInput.focus();
  hideLoginError();
}

function showAdminUI() {
  elements.loginContainer.classList.add('hidden');
  elements.adminContainer.classList.remove('hidden');
  elements.adminUser.textContent = state.username;
  renderMessages();
}

function showLoginError(message) {
  elements.loginError.textContent = message;
  elements.loginError.classList.remove('hidden');
}

function hideLoginError() {
  elements.loginError.classList.add('hidden');
}

function renderMessages() {
  const tbody = elements.messagesTbody;
  
  if (state.messages.length === 0) {
    tbody.innerHTML = '';
    elements.noMessages.classList.remove('hidden');
    return;
  }
  
  elements.noMessages.classList.add('hidden');
  
  // Sort by priority (descending) then by creation date
  const sortedMessages = [...state.messages].sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority;
    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });
  
  tbody.innerHTML = sortedMessages.map(msg => {
    const status = getMessageStatus(msg);
    const targetDisplay = getTargetDisplay(msg);
    
    return `
      <tr data-id="${escapeHtml(msg.id)}">
        <td>
          <span class="status-badge ${status.class}">${status.label}</span>
        </td>
        <td><strong>${escapeHtml(msg.title)}</strong></td>
        <td>
          <div class="target-display">
            <span class="target-type">${escapeHtml(targetDisplay.type)}</span>
            <span class="target-value">${escapeHtml(targetDisplay.value)}</span>
          </div>
        </td>
        <td>
          <span class="priority-badge priority-${msg.priority}">${msg.priority}</span>
        </td>
        <td>
          <span class="date-display ${msg.valid_from ? '' : 'not-set'}">
            ${msg.valid_from ? formatDate(msg.valid_from) : 'Not set'}
          </span>
        </td>
        <td>
          <span class="date-display ${msg.valid_to ? '' : 'not-set'}">
            ${msg.valid_to ? formatDate(msg.valid_to) : 'Not set'}
          </span>
        </td>
        <td>
          <div class="action-buttons">
            <button class="action-btn toggle" onclick="handleToggle('${escapeHtml(msg.id)}')">
              ${msg.enabled ? 'Disable' : 'Enable'}
            </button>
            <button class="action-btn edit" onclick="handleEdit('${escapeHtml(msg.id)}')">Edit</button>
            <button class="action-btn delete" onclick="handleDelete('${escapeHtml(msg.id)}')">Delete</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function getMessageStatus(msg) {
  const now = new Date();
  
  if (!msg.enabled) {
    return { class: 'disabled', label: 'Disabled' };
  }
  
  if (msg.valid_to && new Date(msg.valid_to) < now) {
    return { class: 'expired', label: 'Expired' };
  }
  
  if (msg.valid_from && new Date(msg.valid_from) > now) {
    return { class: 'scheduled', label: 'Scheduled' };
  }
  
  return { class: 'enabled', label: 'Active' };
}

function getTargetDisplay(msg) {
  switch (msg.target_type) {
    case 'all':
      return { type: 'All', value: 'Everyone' };
    case 'role':
      return { type: 'Role', value: msg.target_value || '-' };
    case 'employee':
      return { type: 'Employee', value: msg.target_value || '-' };
    default:
      return { type: msg.target_type, value: msg.target_value || '-' };
  }
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ============================================
// EDITOR
// ============================================
function showEditor(message = null) {
  state.editingMessageId = message?.id || null;
  
  elements.editorTitle.textContent = message ? 'Edit Message' : 'New Message';
  elements.editorPanel.classList.remove('hidden');
  
  // Populate form
  elements.messageId.value = message?.id || '';
  elements.msgTitle.value = message?.title || '';
  elements.msgBody.value = message?.body || '';
  elements.msgTargetType.value = message?.target_type || 'all';
  elements.msgTargetValue.value = message?.target_value || '';
  elements.msgPriority.value = message?.priority || 2;
  elements.msgValidFrom.value = message?.valid_from ? formatDateTimeLocal(message.valid_from) : '';
  elements.msgValidTo.value = message?.valid_to ? formatDateTimeLocal(message.valid_to) : '';
  elements.msgEnabled.checked = message?.enabled !== false;
  
  updateTargetValueVisibility();
  updateCharCounts();
  hideFormError();
  
  elements.msgTitle.focus();
}

function hideEditor() {
  elements.editorPanel.classList.add('hidden');
  state.editingMessageId = null;
  resetForm();
}

function resetForm() {
  elements.messageForm.reset();
  elements.messageId.value = '';
  updateCharCounts();
  hideFormError();
}

function formatDateTimeLocal(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function updateTargetValueVisibility() {
  const targetType = elements.msgTargetType.value;
  
  if (targetType === 'all') {
    elements.targetValueGroup.style.visibility = 'hidden';
    elements.msgTargetValue.required = false;
  } else {
    elements.targetValueGroup.style.visibility = 'visible';
    elements.msgTargetValue.required = true;
    elements.msgTargetValue.placeholder = targetType === 'role' ? 'Enter role name' : 'Enter employee ID';
  }
}

function updateCharCounts() {
  elements.titleCount.textContent = elements.msgTitle.value.length;
  elements.bodyCount.textContent = elements.msgBody.value.length;
}

function showFormError(message) {
  elements.formError.textContent = message;
  elements.formError.classList.remove('hidden');
}

function hideFormError() {
  elements.formError.classList.add('hidden');
}

// ============================================
// DELETE MODAL
// ============================================
function showDeleteModal(id) {
  const message = state.messages.find(m => m.id === id);
  if (!message) return;
  
  state.deleteTargetId = id;
  elements.deleteMessageTitle.textContent = message.title;
  elements.deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
  elements.deleteModal.classList.add('hidden');
  state.deleteTargetId = null;
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">×</button>
  `;
  
  elements.toastContainer.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 300);
  }, CONFIG.TOAST_DURATION);
}

// ============================================
// EVENT HANDLERS
// ============================================
async function handleLoginSubmit(e) {
  e.preventDefault();
  
  const username = elements.usernameInput.value;
  const password = elements.passwordInput.value;
  
  elements.loginBtn.disabled = true;
  hideLoginError();
  
  try {
    await login(username, password);
    showAdminUI();
    connectWebSocket();
  } catch (error) {
    showLoginError(error.message);
    log('error', 'Login failed:', error);
  } finally {
    elements.loginBtn.disabled = false;
  }
}

async function handleFormSubmit(e) {
  e.preventDefault();
  
  const formData = {
    id: elements.messageId.value || null,
    title: elements.msgTitle.value,
    body: elements.msgBody.value,
    target_type: elements.msgTargetType.value,
    target_value: elements.msgTargetValue.value,
    priority: elements.msgPriority.value,
    valid_from: elements.msgValidFrom.value || null,
    valid_to: elements.msgValidTo.value || null,
    enabled: elements.msgEnabled.checked
  };
  
  // Validate
  const validation = validateMessageForm(formData);
  if (!validation.valid) {
    showFormError(validation.errors.join('. '));
    return;
  }
  
  elements.saveBtn.disabled = true;
  hideFormError();
  
  try {
    if (validation.data.id) {
      await updateMessage(validation.data.id, validation.data);
      showToast('Message updated successfully', 'success');
    } else {
      await createMessage(validation.data);
      showToast('Message created successfully', 'success');
    }
    
    await fetchMessages();
    hideEditor();
  } catch (error) {
    showFormError(error.message);
    log('error', 'Save failed:', error);
  } finally {
    elements.saveBtn.disabled = false;
  }
}

// Global handlers for table buttons
window.handleEdit = function(id) {
  const message = state.messages.find(m => m.id === id);
  if (message) {
    showEditor(message);
  }
};

window.handleDelete = function(id) {
  showDeleteModal(id);
};

window.handleToggle = async function(id) {
  const message = state.messages.find(m => m.id === id);
  if (!message) return;
  
  try {
    await toggleMessageEnabled(id, !message.enabled);
    await fetchMessages();
    showToast(`Message ${message.enabled ? 'disabled' : 'enabled'}`, 'success');
  } catch (error) {
    showToast('Failed to update message', 'error');
    log('error', 'Toggle failed:', error);
  }
};

async function handleConfirmDelete() {
  if (!state.deleteTargetId) return;
  
  elements.confirmDeleteBtn.disabled = true;
  
  try {
    await deleteMessage(state.deleteTargetId);
    await fetchMessages();
    hideDeleteModal();
    showToast('Message deleted', 'success');
    
    // Close editor if editing deleted message
    if (state.editingMessageId === state.deleteTargetId) {
      hideEditor();
    }
  } catch (error) {
    showToast('Failed to delete message', 'error');
    log('error', 'Delete failed:', error);
  } finally {
    elements.confirmDeleteBtn.disabled = false;
  }
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
  log('info', 'InfoKiosk Admin UI initializing...');
  
  cacheElements();
  
  // Event listeners
  elements.loginForm.addEventListener('submit', handleLoginSubmit);
  elements.logoutBtn.addEventListener('click', logout);
  elements.newMessageBtn.addEventListener('click', () => showEditor());
  elements.closeEditorBtn.addEventListener('click', hideEditor);
  elements.cancelBtn.addEventListener('click', hideEditor);
  elements.messageForm.addEventListener('submit', handleFormSubmit);
  elements.msgTargetType.addEventListener('change', updateTargetValueVisibility);
  elements.msgTitle.addEventListener('input', updateCharCounts);
  elements.msgBody.addEventListener('input', updateCharCounts);
  elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
  elements.confirmDeleteBtn.addEventListener('click', handleConfirmDelete);
  elements.deleteModal.querySelector('.modal-overlay').addEventListener('click', hideDeleteModal);
  
  // Check for existing session
  if (loadSession()) {
    log('info', 'Session restored for:', state.username);
    showAdminUI();
    fetchMessages();
    connectWebSocket();
  } else {
    showLoginUI();
  }
  
  log('info', 'InfoKiosk Admin UI ready');
}

// Start application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// ============================================
// EXPORTS FOR TESTING
// ============================================
if (typeof window !== 'undefined') {
  window.InfoKioskAdmin = {
    state,
    CONFIG,
    fetchMessages,
    showToast,
    logout
  };
}
