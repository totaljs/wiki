exports.install = function() {
	var url = F.config['manager-url'];

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

	if (F.global.protection[self.ip] > 3) {
		self.invalid().push('error-credentials');
		return;
	}

	var login = self.body.name + ':' + self.body.password;


	if (F.config['manager-superadmin'].indexOf(login) === -1) {
		self.invalid().push('error-credentials');
		if (F.global.protection[self.ip])
			F.global.protection[self.ip]++;
		else
			F.global.protection[self.ip] = 1;
		return;
	}

	delete F.global.protection[self.ip];
	self.cookie(F.config['manager-cookie'], login.hash(), '7 days');
	self.json(SUCCESS(true));
}

// Logoff
function redirect_logoff() {
	var self = this;
	self.cookie(F.config['manager-cookie'], '', '-1 days');
	self.redirect(F.config['manager-url']);
}
