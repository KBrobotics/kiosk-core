/**
 * InfoKiosk Node-RED Settings
 * This file configures Node-RED for the InfoKiosk application
 */

module.exports = {
  // Flow file - auto-loaded on startup
  flowFile: 'flows.json',
  
  // Disable flow file pretty printing for smaller files
  flowFilePretty: true,
  
  // Admin UI settings
  adminAuth: null, // No auth for development - add auth for production!
  
  // HTTP settings
  httpAdminRoot: '/',
  httpNodeRoot: '/',
  
  // Static file serving - serve worker and admin dashboards
  httpStatic: '/data/static',
  
  // CORS settings for API access
  httpNodeCors: {
    origin: "*",
    methods: "GET,PUT,POST,DELETE,OPTIONS"
  },
  
  // Logging
  logging: {
    console: {
      level: "info",
      metrics: false,
      audit: false
    }
  },
  
  // Editor settings
  editorTheme: {
    projects: {
      enabled: false
    }
  },
  
  // Function node settings
  functionGlobalContext: {
    // Add any global context here
  }
};
