// Merging static files
// Only CSS and JavaScript

// CSS
F.merge('/css/manager.css', '/css/ui.css#manager', '/css/manager.css');
F.merge('/css/default.css', '/css/ui.css', '/css/default.css');

// JavaScript
F.merge('/js/manager.js', '/js/ui.js#manager', '/js/manager.js');
F.merge('/js/default.js', '/js/ui.js', '/js/default.js');