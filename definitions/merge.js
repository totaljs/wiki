// Merging static files
// Only CSS and JavaScript

// CSS
MERGE('/css/manager.css', '/css/ui.css#manager', '/css/manager.css');
MERGE('/css/default.css', '/css/ui.css', '/css/default.css');

// JavaScript
MERGE('/js/manager.js', '/js/ui.js#manager', '/js/markdown.js');
MERGE('/js/default.js', '/js/ui.js', '/js/default.js');