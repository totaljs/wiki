G.protection = {};

// Clears blocked IP addreses
ON('service', function(interval) {
	if (interval % 30 === 0)
		G.protection = {};
});

AUTH(function(req, res, flags, next) {

	var cookie = req.cookie(F.config['manager-cookie']);
	if (!cookie)
		return next(false);

	if (G.protection[req.ip] > 3)
		return next(false);

	cookie = +cookie;
	var users = F.config['manager-superadmin'];
	for (var i = 0; i < users.length; i++) {
		if (users[i].hash() === cookie)
			return next(true, users[i].split(':')[0]);
	}

	if (G.protection[req.ip])
		G.protection[req.ip]++;
	else
		G.protection[req.ip] = 1;

	next(false);
});