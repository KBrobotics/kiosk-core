// Attendance Board - Real-time Presence Display
// Connects to Node-RED WebSocket for live updates

(function() {
  'use strict';

  // Configuration
  const CONFIG = {
    wsPath: '/ws',
    apiPath: '/api/board/today',
    refreshInterval: 30000, // 30 seconds fallback
    reconnectDelay: 3000,
    maxReconnectAttempts: 10
  };

  // State
  let ws = null;
  let sessions = [];
  let reconnectAttempts = 0;
  let refreshIntervalId = null;

  // DOM Elements
  const elements = {
    connectionStatus: document.getElementById('connectionStatus'),
    employeeCount: document.getElementById('employeeCount'),
    lastUpdate: document.getElementById('lastUpdate'),
    refreshBtn: document.getElementById('refreshBtn'),
    clock: document.getElementById('clock'),
    date: document.getElementById('date'),
    employeeGrid: document.getElementById('employeeGrid'),
    emptyState: document.getElementById('emptyState')
  };

  // Initialize
  function init() {
    startClock();
    connectWebSocket();
    setupEventListeners();
    loadBoardState();
    startAutoRefresh();
  }

  // Clock
  function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    elements.clock.textContent = now.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    elements.date.textContent = now.toLocaleDateString('pl-PL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // WebSocket Connection
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}${CONFIG.wsPath}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = function() {
        console.log('[WS] Connected');
        reconnectAttempts = 0;
        updateConnectionStatus(true);
        
        // Request full state
        ws.send(JSON.stringify({ type: 'request_full_state' }));
      };

      ws.onmessage = function(event) {
        try {
          const data = JSON.parse(event.data);
          handleWebSocketMessage(data);
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onerror = function(error) {
        console.error('[WS] Error:', error);
      };

      ws.onclose = function() {
        console.log('[WS] Disconnected');
        updateConnectionStatus(false);
        attemptReconnect();
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
      updateConnectionStatus(false);
      attemptReconnect();
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts < CONFIG.maxReconnectAttempts) {
      reconnectAttempts++;
      console.log(`[WS] Reconnecting... (${reconnectAttempts}/${CONFIG.maxReconnectAttempts})`);
      setTimeout(connectWebSocket, CONFIG.reconnectDelay);
    }
  }

  function handleWebSocketMessage(data) {
    console.log('[WS] Message:', data.type);

    switch (data.type) {
      case 'full_state':
        sessions = data.active || [];
        updateLastRefresh();
        renderBoard();
        break;

      case 'session_update':
        if (data.action === 'login' && data.session) {
          // Add new session
          sessions = sessions.filter(s => s.employee_id !== data.session.employee_id);
          sessions.push(data.session);
        } else if (data.action === 'logout' && data.employee_id) {
          // Remove session
          sessions = sessions.filter(s => s.employee_id !== data.employee_id);
        }
        updateLastRefresh();
        renderBoard();
        break;

      case 'pong':
        // Heartbeat response
        break;

      default:
        console.log('[WS] Unknown message type:', data.type);
    }
  }

  // REST API Fallback
  async function loadBoardState() {
    try {
      elements.refreshBtn.classList.add('loading');
      const response = await fetch(CONFIG.apiPath);
      const data = await response.json();

      if (data.success && data.data) {
        sessions = data.data.active || [];
        updateLastRefresh();
        renderBoard();
      }
    } catch (e) {
      console.error('[API] Load failed:', e);
    } finally {
      elements.refreshBtn.classList.remove('loading');
    }
  }

  // Auto Refresh
  function startAutoRefresh() {
    if (refreshIntervalId) {
      clearInterval(refreshIntervalId);
    }
    refreshIntervalId = setInterval(loadBoardState, CONFIG.refreshInterval);
  }

  // UI Updates
  function updateConnectionStatus(connected) {
    const statusDot = elements.connectionStatus.querySelector('.status-dot');
    const statusText = elements.connectionStatus.querySelector('.status-text');

    if (connected) {
      elements.connectionStatus.classList.remove('disconnected');
      elements.connectionStatus.classList.add('connected');
      statusDot.style.background = '#22c55e';
      statusText.textContent = 'Connected';
    } else {
      elements.connectionStatus.classList.remove('connected');
      elements.connectionStatus.classList.add('disconnected');
      statusDot.style.background = '#ef4444';
      statusText.textContent = 'Disconnected';
    }
  }

  function updateLastRefresh() {
    elements.lastUpdate.textContent = new Date().toLocaleTimeString('pl-PL');
  }

  function renderBoard() {
    elements.employeeCount.textContent = sessions.length;

    if (sessions.length === 0) {
      elements.employeeGrid.style.display = 'none';
      elements.emptyState.style.display = 'flex';
    } else {
      elements.employeeGrid.style.display = 'grid';
      elements.emptyState.style.display = 'none';
      renderEmployeeCards();
    }
  }

  function renderEmployeeCards() {
    // Sort by login time (most recent first)
    const sorted = [...sessions].sort((a, b) => 
      new Date(b.login_time) - new Date(a.login_time)
    );

    elements.employeeGrid.innerHTML = sorted.map(session => `
      <div class="employee-card" data-id="${session.employee_id}">
        <div class="card-header">
          <div class="avatar">
            ${getInitials(session.employee_name)}
          </div>
          <div class="card-info">
            <h3 class="employee-name">${escapeHtml(session.employee_name)}</h3>
            <p class="employee-role">${escapeHtml(session.employee_role || 'Employee')}</p>
          </div>
        </div>
        <div class="card-footer">
          <div class="login-time">
            <svg class="icon-small" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <polyline points="12 6 12 12 16 14"/>
            </svg>
            <span>${formatLoginTime(session.login_time)}</span>
          </div>
          <div class="time-elapsed">
            ${getTimeElapsed(session.login_time)}
          </div>
        </div>
      </div>
    `).join('');
  }

  // Helpers
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  function formatLoginTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleTimeString('pl-PL', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTimeElapsed(isoString) {
    const loginTime = new Date(isoString);
    const now = new Date();
    const diffMs = now - loginTime;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours > 0) {
      return `${diffHours}h ${remainingMins}m`;
    }
    return `${diffMins}m`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // Event Listeners
  function setupEventListeners() {
    elements.refreshBtn.addEventListener('click', function() {
      loadBoardState();
    });
  }

  // Update elapsed times every minute
  setInterval(function() {
    if (sessions.length > 0) {
      renderEmployeeCards();
    }
  }, 60000);

  // Start
  document.addEventListener('DOMContentLoaded', init);
})();
