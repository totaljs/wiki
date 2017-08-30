NEWSCHEMA('Page').make(function(schema) {

	schema.define('id', 'UID');
	schema.define('parent', 'UID');
	schema.define('name', 'String(50)', true);
	schema.define('author', 'String(50)');
	schema.define('body', String);

	schema.setGet(function($) {
		NOSQL('pages').find().where('id', $.controller.id).first().callback(function(err, response) {
			$.callback(response);
		});
	});

	schema.setQuery(function($) {
		$.callback(F.global.pages);
	});

	schema.setRemove(function($) {

		var db = NOSQL('pages');

		db.find().fields('id', 'parent').callback(function(err, response) {

			var user = $.controller && $.controller.user ? $.controller.user.name : '';
			var remove = {};

			remove[$.controller.id] = true;

			// Find all dependencies
			for (var i = 0, length = response.length; i < length; i++) {
				var item = response[i];
				if (remove[item.parent])
					remove[item.id] = true;
			}

			var keys = Object.keys(remove);

			// Removes documents
			db.remove().in('id', keys).callback(function() {
				refresh();
				$.callback(SUCCESS(true));
			}).log('remove page ' + keys.join(', '), user).backup(user);

			// Removes counter
			db.counter.remove(keys);
		});
	});

	schema.addWorkflow('stats', function($) {
		NOSQL('pages').counter.monthly($.controller.id, $.callback);
	});

	schema.setSave(function($) {

		var db = NOSQL('pages');
		var model = $.model;
		var user = $.controller && $.controller.user ? $.controller.user.name : '';
		var search = [model.name];
		var arr = model.body.split('\n');

		for (var i = 0, length = arr.length; i < length; i++) {
			var line = arr[i];

			switch (line[0]) {
				case '#':
				case '-':
					search.push(line);
					break;
			}
		}

		model.linker = model.name.slug();
		model.search = U.keywords(search.join('\n'), true).join(' ');
		model.group = model.body ? false : true;

		if (model.id) {
			model.dateupdated = F.datetime;
			db.modify(model).where('id', model.id).log('update page ' + model.name, user).callback(refresh).backup(user);
		} else {
			model.id = UID();
			model.datecreated = F.datetime;
			db.insert(model).log('create page ' + model.name, user).callback(refresh);
		}

		$.callback(SUCCESS(true));
	});

	refresh();
});

function refresh() {
	NOSQL('pages').find().fields('id', 'parent', 'linker', 'name', 'datecreated', 'dateupdated', 'group', 'search').sort('name').callback(function(err, response) {

		function tree(parent) {
			var output = [];
			for (var i = 0, length = response.length; i < length; i++)
				response[i].parent === parent && output.push(response[i]);
			return output;
		}

		function linker(parent) {
			response.forEach(function(item) {
				if (parent.id === item.parent) {
					item.url = parent.url + '/' + item.linker;
					item.title = parent.title + ' / ' + item.name;
					linker(item);
				}
			});
		}

		var output = [];

		response.forEach(function(item) {
			item.children = tree(item.id);
			!item.children.length && (item.children = item.group ? [] : null);
			!item.parent && output.push(item);
			if (!item.parent) {
				item.url = item.linker;
				item.title = item.name;
				linker(item, item.url);
			}
		});

		F.global.sitemap = output;
		F.global.pages = response;
	});
}