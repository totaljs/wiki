const REG_LINKS = /"\@\d+[0-9a-z]+(#|")/g;
const REG_HREF = /href="\//g;
const REG_TABLE = /<table/g;

global.marked = require('marked');
global.marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

global.markdown = function(text) {
	return marked(text).replace(REG_TABLE, '<table class="table table-bordered"').replace(REG_LINKS, function(id) {
		var link = F.global.pages.findItem('id', id.substring(2, id.length - 1));
		return (link ? ('"/' + link.url + '/' + id.substring(id.length - 1)) : id);
	}).replace(REG_HREF, 'class="jrouting" href="/');
};