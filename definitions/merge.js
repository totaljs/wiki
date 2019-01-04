// Merging static files
// Only CSS and JavaScript

// CSS
MERGE('/css/manager.css', '/css/cdn.min.css', '/css/ui.css', '/css/manager.css');
MERGE('/css/default.css', '/css/cdn.min.css', '/css/ui.css', '/css/default.css');

// JavaScript
MERGE('/js/manager.js', '/js/cdn.min.js', '/js/ui.js', '/js/editor.js', '/js/markdown.js');
MERGE('/js/default.js', '/js/cdn.min.js', '/js/ui.js', '/js/default.js');