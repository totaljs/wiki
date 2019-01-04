exports.install = function() {
	var url = CONF['manager-url'];

	GROUP(['authorize'], function() {
		ROUTE(url + '/', '~manager');
		ROUTE(url + '/logoff/', redirect_logoff);
	});

	ROUTE(url + '/login/', login, ['unauthorize', 'post']);
	ROUTE(url + '/', '~manager-login', ['unauthorize']);
};

// ==========================================================================
// COMMON
// ==========================================================================

// Login
function login() {
	var self = this;

	if (G.protection[self.ip] > 3) {
		self.invalid().push('error-credentials');
		return;
	}

	var login = self.body.name + ':' + self.body.password;
	if (CONF['manager-superadmin'].indexOf(login) === -1) {
		self.invalid().push('error-credentials');
		if (G.protection[self.ip])
			G.protection[self.ip]++;
		else
			G.protection[self.ip] = 1;
	} else {
		delete G.protection[self.ip];
		self.cookie(CONF['manager-cookie'], login.hash(), '7 days');
		self.json(SUCCESS(true));
	}
}

// Logoff
function redirect_logoff() {
	var self = this;
	self.cookie(CONF['manager-cookie'], '', '-1 days');
	self.redirect(CONF['manager-url']);
}
