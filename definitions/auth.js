F.global.protection = {};

// Clears blocked IP addreses
F.on('service', function(interval) {
	if (interval % 30 === 0)
		F.global.protection = {};
});

F.onAuthorize = function(req, res, flags, next) {

	var cookie = req.cookie(F.config['manager-cookie']);
	if (!cookie)
		return next(false);

	if (F.global.protection[req.ip] > 3)
		return next(false);

	cookie = +cookie;
	var users = F.config['manager-superadmin'];
	for (var i = 0; i < users.length; i++) {
		if (users[i].hash() === cookie)
			return next(true, users[i].split(':')[0]);
	}

	if (F.global.protection[req.ip])
		F.global.protection[req.ip]++;
	else
		F.global.protection[req.ip] = 1;

	next(false);
};