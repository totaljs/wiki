UPTODATE('1 day', '/');

marked.setOptions({ gfm: true, breaks: true, sanitize: true, tables: true });

function markdown(text) {
	return marked(text).replace(/<img/g, '<img class="img-responsive img-rounded"').replace(/<table/g, '<table class="table table-bordered"');
}