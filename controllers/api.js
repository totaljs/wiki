const Fs = require('fs');

exports.install = function() {

	ROUTE('GET  /api/pages/                    *Page --> @query');

	GROUP(['authorize'], function() {

		ROUTE('POST     /api/pages/            *Page --> @save', 512);
		ROUTE('GET      /api/pages/{id}/       *Page --> @read');
		ROUTE('GET      /api/stats/{id}/       *Page --> @stats');
		ROUTE('DELETE   /api/pages/{id}/       *Page --> @remove');

		// Files
		ROUTE('POST     /api/upload/',         upload_markdown, ['upload'], 3084); // 3 MB
		ROUTE('GET      /api/upload/clear/',   upload_clear);
	});
};

function upload_markdown() {

	var self = this;
	var id = [];

	self.files.wait(function(file, next) {
		file.read(function(err, data) {

			// Store current file into the HDD
			file.extension = U.getExtension(file.filename);
			var filename = NOSQL('pages').binary.insert(file.filename, data) + '.' + file.extension;
			id.push({ url: '/download/' + filename, filename: file.filename, width: file.width, height: file.height, length: file.length });

			// Next file
			setTimeout(next, 100);
		});

	}, function() {
		// Returns response
		self.json(id);
	});
}

// Clears all useless files
function upload_clear() {

	// response
	this.json(SUCCESS(true));

	var databases = [F.path.databases('pages.nosql')];
	var remove = [];
	var storage = NOSQL('pages').binary;

	storage.all(function(err, files) {

		for (var i = 0, length = files.length; i < length; i++) {
			files[i].is = false;
			files[i].buffer = Buffer.from(files[i].id);
		}

		files.wait(function(file, next) {
			databases.wait(function(filename, resume) {

				if (file.is)
					return resume();

				var tmp = [];

				CLEANUP(Fs.createReadStream(filename).on('data', function(chunk) {

					if (file.is)
						return;

					tmp.push(chunk);
					tmp.length > 2 && tmp.shift();

					if (tmp.length && Buffer.concat(tmp, tmp[0].length + (tmp[1] ? tmp[1].length : 0)).indexOf(file.buffer) !== -1)
						file.is = true;

				}), resume);

			}, function() {
				!file.is && remove.push(file);
				next();
			});

		}, () => remove.wait((item, next) => storage.remove(item.id, next)));
	});
}