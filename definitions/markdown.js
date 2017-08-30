global.marked = require('marked');
global.marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

global.markdown = function(text) {
	return marked(text).replace(/<img/g, '<img class="img-responsive img-rounded"').replace(/<table/g, '<table class="table table-bordered"').replace(/"\@\d+[0-9a-z]+"/, function(id) {
		var link = F.global.pages.findItem('id', id.substring(2, id.length - 1));
		return link ? ('"/' + link.url + '/" class="jrouting"') : id;
	});
};