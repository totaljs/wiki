exports.install = function() {
	ROUTE('/*', wiki);
	FILE('/download/', file_read);
};

// ==========================================================================
// FILES
// ==========================================================================

function wiki() {
	var self = this;
	var item = F.global.pages.findItem('url', self.req.split.join('/'));

	self.xhr && self.layout('');

	if (!item) {
		self.title(F.config.name);
		self.view('detail');
		return;
	}

	NOSQL('pages').one().where('id', item.id).callback(function(err, response) {

		!self.xhr && self.title(item.title);

		if (response) {

			var counter = NOSQL('pages').counter;

			counter.hit(response.id);

			if (self.query.type === 'markdown') {
				counter.hit('markdown');
				self.binary(Buffer.from(response.body), 'text/markdown', 'utf8', item.title.slug() + '.md');
				return;
			} else {
				counter.hit('all');
			}

			response.title = item.title;
		}

		self.view('detail', response);
	});
}

// Reads a specific file from database
// For images (jpg, gif, png) supports percentual resizing according "?s=NUMBER" argument in query string e.g.: .jpg?s=50, .jpg?s=80 (for image galleries)
// URL: /download/*.*
function file_read(req, res) {
	var id = req.split[1].replace('.' + req.extension, '');
	// Reads specific file by ID
	F.exists(req, res, function(next, filename) {
		NOSQL('pages').binary.read(id, function(err, stream) {

			if (err) {
				next();
				return res.throw404();
			}

			var writer = require('fs').createWriteStream(filename);

			CLEANUP(writer, function() {
				res.file(filename);
				next();
			});

			stream.pipe(writer);
		});
	});
}