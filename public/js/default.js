UPTODATE('1 day', '/');
PING('/api/ping/');

var common = { hash: location.hash.substring(1) };

// Helpers
var firstcall = true;
var clickcall = false;

SETTER(true, 'loading', 'hide');

ON('ready', function() {
	refresh_markdown(true);
	refresh_navigation();
	$(document).on('click', '.categorybutton', function() {
		$('.categories').tclass('categoriesshow');
	});

	common.hash && refresh_scroll();

	$(document).on('click', 'h1,h2,h3', function() {
		var el = $(this);
		var id = el.attr('id');
		if (id)
			location.hash = id;
	});


	setTimeout(function() {
		var sel = NAV.url.substring(1, NAV.url.length - 1);
		var item = common.items.findItem('url', sel);

		if (!item) {
			var q = MAIN.parseQuery();
			if (q.q) {
				var arr = q.q.replace(/[,-]+/g, ' ').split(' ');
				item = common.items.findItem(function(item) {
					var is = true;
					for (var i = 0; i < arr.length; i++) {
						if (item.url.indexOf(arr[i]) === -1) {
							is = false;
							break;
						}
					}
					return is;
				});
			}
		}

		if (item && item.$pointer) {
			SETTER('tree', 'expand', item.$pointer);
			SETTER('tree', 'select', item.$pointer);
		}

	}, 200);

});

// setTimeout because I expect that the homepage is loaded first (this is a prevention for double reading)
setTimeout(function() {

	// Default route
	ROUTE('/', function() {
		SETTER('tree', 'unselect');
		AJAX('GET /', function(response) {
			$('#preview').html(response);
			SETTER('loading', 'hide', 500);
		});
	});

	// Because of browser's navigation: back/next page
	ON('location', function(url) {
		// User clicked on class=".jrouting" link
		if (clickcall) {
			clickcall = false;
			return;
		}
		var item = common.items.findItem('url', url.substring(1, url.length - 1));
		if (item) {
			SETTER('tree', 'select', item.$pointer);
			SETTER('tree', 'expand', item.$pointer);
		}
	});

}, 1000);

$(document).on('click', '.markdown a', function(e) {
	var href = $(this).attr('href');
	if (href.substring(0, 1) === '#') {
		location.hash = href;
		e.preventDefault();
		e.stopPropagation();
	}
});

$(document).on('click', '.jrouting', function(e) {

	e.preventDefault();
	e.stopPropagation();
	var url = $(this).attr('href').substring(1);

	var index = url.indexOf('#');
	if (index !== -1) {
		common.hash = url.substring(index + 1);
		url = url.substring(0, index - 1);
	} else {
		url = url.substring(0, url.length - 1);
		common.hash = '';
	}

	var item = common.items.findItem('url', url);
	if (item) {
		firstcall = false;
		SETTER('tree', 'select', item.$pointer);
		SETTER('tree', 'expand', item.$pointer);
	}
});

function refresh_pages() {
	AJAX('GET /api/pages/', function(response) {

		function tree(idparent, parent) {
			var output = [];
			for (var i = 0, length = response.length; i < length; i++) {
				if (response[i].parent === idparent) {
					!response[i].group && (response[i].children = null);
					response[i].parent = parent;
					output.push(response[i]);
				}
			}

			output.quicksort('name');
			output.sort(function(a, b) {
				if (!a.children && b.children)
					return 1;
				if (a.children && !b.children)
					return -1;
				return Intl.Collator().compare(a.name, b.name);
			});
			return output;
		}

		var output = [];

		response.forEach(function(item) {
			item.children = tree(item.id, item);
			if (item.group) {
				!item.children && (item.children = []);
			} else
				item.children = null;
			!item.parent && output.push(item);
		});

		SET('common.pages', output);
		SET('common.items', response);

		var sel = response.findItem('url', NAVIGATION.url.substring(1, NAVIGATION.url.length - 1));
		if (sel && sel.$pointer) {
			SETTER('tree', 'select', sel.$pointer);
			SETTER('tree', 'expand', sel.$pointer);
		}

		setTimeout(function() {
			firstcall = false;
		}, 500);

	});
}

refresh_pages();

function treeclick(obj, group, expanded) {

	if (firstcall) {
		if (!obj.children) {
			firstcall = false;
			return;
		}
	}

	if (obj.children && group && expanded && firstcall) {
		firstcall = false;
		var item = obj.children.findItem('children', null);
		if (item) {
			SETTER('tree', 'select', item.$pointer);
			SETTER('tree', 'expand', item.$pointer);
		}
		group = true;
	}

	if (group)
		return;

	SETTER('loading', 'show');
	var url = '/{0}/'.format(obj.url);

	if (NAV.url !== url) {
		clickcall = true;
		url = url + (common.hash ? '#' + common.hash : '');
		REDIRECT(url);
	}

	$('.categories').rclass('categoriesshow');
	AJAX('GET ' + url, function(response) {
		$('html,body').prop('scrollTop', 0);
		document.title = obj.title;
		$('#preview').html(response);
		refresh_markdown(true);
		refresh_navigation();
		refresh_scroll();
		SETTER('loading', 'hide', 500);
	});
}

function refresh_navigation() {

	var el = $('.navigation');
	var current = common.items.findItem('url', NAVIGATION.url.substring(1, NAVIGATION.url.length - 1));

	if (!current || !current.parent)
		return;

	var children = current.parent.children;
	var index = children.findIndex('id', current.id);
	if (index === -1)
		return;

	var prev = children[index - 1];
	var next = children[index + 1];

	prev && !prev.children && el.find('a.jrouting:eq(0)').rclass('disabled').attr('href', '/{0}/'.format(prev.url));

	if (next && !next.children) {
		el.find('a.jrouting:eq(1)').rclass('disabled').attr('href', '/{0}/'.format(next.url));
		$('.navigationfooter').find('a.jrouting').rclass('disabled').attr('href', '/{0}/'.format(next.url));
	}
}

function refresh_scroll() {
	common.hash && setTimeout(function(hash) {
		var el = $('#' + hash);
		el.length && $('html,body').animate({ scrollTop: el.offset().top - 50 }, 300);
	}, 100, common.hash);
	common.hash = '';
}

ON('#search', function(component) {

	if (component.config.type !== 'search')
		return;

	component.find('input').on('focus', function() {

		SETTER('autocomplete', 'attach', this, function(q, render) {

			var arr = [];
			var search = q.toSearch().split(' ').trim();

			search.length && common.items.forEach(function(item) {
				if (!item.search || item.group)
					return;
				for (var i = 0; i < search.length; i++) {
					if (item.search.indexOf(search[i]) === -1)
						return;
				}
				arr.push({ name: item.title, value: item.$pointer });
			});

			arr.length && render(arr);
		}, function(value) {
			firstcall = false;
			SETTER('tree', 'select', value.value);
			SETTER('tree', 'expand', value.value);
			SET('common.search', '');
		}, 13, -5, isMOBILE ? 40 : 200);
	});
});
