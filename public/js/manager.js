UPTODATE('1 day', '/');

marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

function markdown(text) {
	return marked(text).replace(/<table/g, '<table class="table table-bordered"');
}