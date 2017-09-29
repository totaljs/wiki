COMPONENT('tree', 'selected:selected', function(self, config) {

	var cache = null;
	var counter = 0;
	var expanded = {};
	var selindex = -1;

	self.template = Tangular.compile('<div class="item{{ if children }} expand{{ fi }}" title="{{ name }}" data-index="{{ $pointer }}"><i class="fa {{ if children }}ui-tree-folder{{ else }}fa-file-o{{ fi }}"></i>{{ name }}</div>');
	self.readonly();

	self.make = function() {
		self.aclass('ui-tree');
		self.event('click', '.item', function() {
			var el = $(this);
			var index = +el.attr('data-index');
			self.select(index);
		});
	};

	self.select = function(index) {
		var cls = config.selected;
		var el = self.find('[data-index="{0}"]'.format(index));
		if (el.hclass('expand')) {
			var parent = el.parent();
			parent.tclass('show');
			var is = expanded[index] = parent.hclass('show');
			el.find('.fa').tclass('fa-folder', !is).tclass('fa-folder-open', is);
			config.exec && EXEC(config.exec, cache[index], true, is);
		} else {
			!el.hclass(cls) && self.find('.' + cls).rclass(cls);
			el.aclass(cls);
			config.exec && EXEC(config.exec, cache[index], false);
			selindex = index;
		}
	};

	self.unselect = function() {
		var cls = config.selected;
		self.find('.' + cls).rclass(cls);
	};

	self.clear = function() {
		expanded = {};
		selindex = -1;
	};

	self.expand = function(index) {
		if (index == null) {
			self.find('.expand').each(function() {
				$(this).parent().aclass('show');
			});
		} else {
			self.find('[data-index="{0}"]'.format(index)).each(function() {
				var el = $(this);
				if (el.hclass('expand')) {
					// group
					el.parent().aclass('show');
				} else {
					// item
					while (true) {
						el = el.closest('.children').prev();
						if (!el.hclass('expand'))
							break;
						el.parent().aclass('show');
					}
				}
			});
		}
	};

	self.collapse = function(index) {
		if (index == null) {
			self.find('.expand').each(function() {
				$(this).parent().rclass('show');
			});
		} else {
			self.find('[data-index="{0}"]'.format(index)).each(function() {
				var el = $(this);
				if (el.hclass('expand')) {
					// group
					el.parent().rclass('show');
				} else {
					// item
					while (true) {
						el = el.closest('.children').prev();
						if (!el.hclass('expand'))
							break;
						el.parent().rclass('show');
					}
				}
			});
		}
	};

	self.renderchildren = function(builder, item, level) {
		builder.push('<div class="children children{0}" data-level="{0}">'.format(level));
		item.children.forEach(function(item) {
			counter++;
			item.$pointer = counter;
			cache[counter] = item;
			builder.push('<div class="node{0}">'.format(expanded[counter] ? ' show' : ''));
			builder.push(self.template(item));
			item.children && self.renderchildren(builder, item, level + 1);
			builder.push('</div>');
		});
		builder.push('</div>');
	};

	self.reset = function() {
		var cls = config.selected;
		self.find('.' + cls).rclass(cls);
	};

	self.first = function() {
		cache.first && self.select(cache.first.$pointer);
	};

	self.setter = function(value) {

		var builder = [];

		counter = 0;
		cache = {};

		value && value.forEach(function(item) {
			counter++;
			item.$pointer = counter;
			cache[counter] = item;
			builder.push('<div class="node{0}">'.format(expanded[counter] ? ' show' : '') + self.template(item));
			if (item.children)
				self.renderchildren(builder, item, 1);
			else if (!cache.first)
				cache.first = item;
			builder.push('</div>');
		});

		self.html(builder.join(''));

		if (selindex !== -1)
			self.select(selindex);
		else
			config.first !== false && cache.first && setTimeout(self.first, 100);
	};
});

COMPONENT('loading', function(self) {

	var pointer;

	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-loading');
		self.append('<div></div>');
	};

	self.show = function() {
		clearTimeout(pointer);
		self.rclass('hidden');
		return self;
	};

	self.hide = function(timeout) {
		clearTimeout(pointer);
		pointer = setTimeout(function() {
			self.aclass('hidden');
		}, timeout || 1);
		return self;
	};
});

COMPONENT('exec', function(self, config) {
	self.readonly();
	self.blind();
	self.make = function() {
		self.event('click', config.selector || '.exec', function() {
			var el = $(this);
			var attr = el.attr('data-exec');
			var path = el.attr('data-path');
			attr && EXEC(attr, el);
			path && SET(path, new Function('return ' + el.attr('data-value'))());
		});
	};
});

COMPONENT('binder', function(self) {

	var keys, keys_unique;

	self.readonly();
	self.blind();

	self.make = function() {
		self.watch('*', self.autobind);
		self.scan();

		self.on('component', function() {
			setTimeout2(self.id, self.scan, 200);
		});

		self.on('destroy', function() {
			setTimeout2(self.id, self.scan, 200);
		});
	};

	self.autobind = function(path) {
		var mapper = keys[path];
		var template = {};
		mapper && mapper.forEach(function(item) {
			var value = self.get(item.path);
			var element = item.selector ? item.element.find(item.selector) : item.element;
			template.value = value;
			item.classes && classes(element, item.classes(value));
			item.visible && element.tclass('hidden', item.visible(value) ? false : true);
			item.html && element.html(item.Ta ? item.html(template) : item.html(value));
			item.disable && element.prop('disabled', item.disable(value));
		});
	};

	function classes(element, val) {
		var add = '';
		var rem = '';
		val.split(' ').forEach(function(item) {
			switch (item.substring(0, 1)) {
				case '+':
					add += (add ? ' ' : '') + item.substring(1);
					break;
				case '-':
					rem += (rem ? ' ' : '') + item.substring(1);
					break;
				default:
					add += (add ? ' ' : '') + item;
					break;
			}
		});
		rem && element.rclass(rem);
		add && element.aclass(add);
	}

	function decode(val) {
		return val.replace(/\&\#39;/g, '\'');
	}

	self.prepare = function(code) {
		return code.indexOf('=>') === -1 ? FN('value=>' + decode(code)) : FN(decode(code));
	};

	self.scan = function() {
		keys = {};
		keys_unique = {};
		self.find('[data-b]').each(function() {

			var el = $(this);
			var path = el.attr('data-b');
			var arr = path.split('.');
			var p = '';

			var classes = el.attr('data-b-class');
			var html = el.attr('data-b-html');
			var visible = el.attr('data-b-visible');
			var disable = el.attr('data-b-disable');
			var selector = el.attr('data-b-selector');
			var obj = el.data('data-b');

			keys_unique[path] = true;

			if (!obj) {
				obj = {};
				obj.path = path;
				obj.element = el;
				obj.classes = classes ? self.prepare(classes) : undefined;
				obj.visible = visible ? self.prepare(visible) : undefined;
				obj.disable = disable ? self.prepare(disable) : undefined;
				obj.selector = selector ? selector : null;

				if (el.attr('data-b-template') === 'true') {
					var tmp = el.find('script[type="text/html"]');
					var str = '';

					if (tmp.length)
						str = tmp.html();
					else
						str = el.html();

					if (str.indexOf('{{') !== -1) {
						obj.html = Tangular.compile(str);
						obj.Ta = true;
						tmp.length && tmp.remove();
					}
				} else
					obj.html = html ? self.prepare(html) : undefined;

				el.data('data-b', obj);
			}

			for (var i = 0, length = arr.length; i < length; i++) {
				p += (p ? '.' : '') + arr[i];
				if (keys[p])
					keys[p].push(obj);
				else
					keys[p] = [obj];
			}
		});

		Object.keys(keys_unique).forEach(function(key) {
			self.autobind(key, self.get(key));
		});

		return self;
	};
});

COMPONENT('inlineform', function(self, config) {

	var W = window;
	var header = null;
	var dw = 300;

	if (!W.$$inlineform) {
		W.$$inlineform = true;
		$(document).on('click', '.ui-inlineform-close', function() {
			SETTER('inlineform', 'hide');
		});
		$(window).on('resize', function() {
			SETTER('inlineform', 'hide');
		});
	}

	self.readonly();
	self.submit = function() {
		if (config.submit)
			EXEC(config.submit, self);
		else
			self.hide();
	};

	self.cancel = function() {
		config.cancel && EXEC(config.cancel, self);
		self.hide();
	};

	self.hide = function() {
		if (self.hclass('hidden'))
			return;
		self.release(true);
		self.aclass('hidden');
		self.find('.ui-inlineform').rclass('ui-inlineform-animate');
	};

	self.make = function() {

		var icon;

		if (config.icon)
			icon = '<i class="fa fa-{0}"></i>'.format(config.icon);
		else
			icon = '<i></i>';

		$(document.body).append('<div id="{0}" class="hidden ui-inlineform-container" style="max-width:{1}"><div class="ui-inlineform"><i class="fa fa-caret-up ui-inlineform-arrow"></i><div class="ui-inlineform-title"><button class="ui-inlineform-close"><i class="fa fa-times"></i></button>{4}<span>{3}</span></div></div></div>'.format(self._id, (config.width || dw) + 'px', self.path, config.title, icon));

		var el = $('#' + self._id);
		el.find('.ui-inlineform').get(0).appendChild(self.element.get(0));
		self.rclass('hidden');
		self.replace(el);

		header = self.virtualize({ title: '.ui-inlineform-title > span', icon: '.ui-inlineform-title > i' });

		self.find('button').on('click', function() {
			var el = $(this);
			switch (this.name) {
				case 'submit':
					if (el.hasClass('exec'))
						self.hide();
					else
						self.submit(self.hide);
					break;
				case 'cancel':
					!this.disabled && self[this.name](self.hide);
					break;
			}
		});

		config.enter && self.event('keydown', 'input', function(e) {
			e.which === 13 && !self.find('button[name="submit"]').get(0).disabled && self.submit(self.hide);
		});
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'icon':
				header.icon.rclass(header.icon.attr('class'));
				value && header.icon.aclass('fa fa-' + value);
				break;
			case 'title':
				header.title.html(value);
				break;
		}
	};

	self.toggle = function(el, position, offsetX, offsetY) {
		if (self.hclass('hidden'))
			self.show(el, position, offsetX, offsetY);
		else
			self.hide();
	};

	self.show = function(el, position, offsetX, offsetY) {

		SETTER('inlineform', 'hide');

		self.rclass('hidden');
		self.release(false);

		var offset = el.offset();
		var w = config.width || dw;
		var elw = el.width();
		var ma = 26;

		if (position === 'right') {
			offset.left -= w - elw;
			ma = w - 26;
		} else if (position === 'center') {
			ma = (w / 2);
			offset.left -= ma - (elw / 2);
			ma -= 12;
		}

		offset.top += el.height() + 10;

		if (offsetX)
			offset.left += offsetX;

		if (offsetY)
			offset.top += offsetY;

		config.reload && EXEC(config.reload, self);

		self.find('.ui-inlineform-arrow').css('margin-left', ma);
		self.css(offset);
		var el = self.find('input[type="text"],select,textarea');
		!isMOBILE && el.length && el.eq(0).focus();
		setTimeout(function() {
			self.find('.ui-inlineform').aclass('ui-inlineform-animate');
		}, 300);
	};
});

COMPONENT('textbox', function(self, config) {

	var input, container, content = null;

	self.validate = function(value) {

		if (!config.required || config.disabled)
			return true;

		if (self.type === 'date')
			return value instanceof Date && !isNaN(value.getTime());

		if (value == null)
			value = '';
		else
			value = value.toString();

		EMIT('reflow', self.name);

		switch (self.type) {
			case 'email':
				return value.isEmail();
			case 'url':
				return value.isURL();
			case 'currency':
			case 'number':
				return value > 0;
		}

		return config.validation ? self.evaluate(value, config.validation, true) ? true : false : value.length > 0;
	};

	self.make = function() {

		content = self.html();

		self.type = config.type;
		self.format = config.format;

		self.event('click', '.fa-calendar', function(e) {
			if (config.disabled)
				return;
			if (config.type === 'date') {
				e.preventDefault();
				window.$calendar && window.$calendar.toggle(self.element, self.find('input').val(), function(date) {
					self.set(date);
				});
			}
		});

		self.event('click', '.fa-caret-up,.fa-caret-down', function() {
			if (config.disabled)
				return;
			if (config.increment) {
				var el = $(this);
				var inc = el.hasClass('fa-caret-up') ? 1 : -1;
				self.change(true);
				self.inc(inc);
			}
		});

		self.event('click', '.ui-textbox-control-icon', function() {
			if (config.disabled)
				return;
			if (self.type === 'search') {
				self.$stateremoved = false;
				$(this).rclass('fa-times').aclass('fa-search');
				self.set('');
			}
		});

		self.redraw();
	};

	self.redraw = function() {

		var attrs = [];
		var builder = [];
		var tmp;

		if (config.type === 'password')
			tmp = 'password';
		else
			tmp = 'text';

		self.tclass('ui-disabled', config.disabled === true);
		self.type = config.type;
		attrs.attr('type', tmp);
		config.placeholder && attrs.attr('placeholder', config.placeholder);
		config.maxlength && attrs.attr('maxlength', config.maxlength);
		config.keypress != null && attrs.attr('data-jc-keypress', config.keypress);
		config.delay && attrs.attr('data-jc-keypress-delay', config.delay);
		config.disabled && attrs.attr('disabled');
		config.error && attrs.attr('error');
		attrs.attr('data-jc-bind', '');

		config.autofill && attrs.attr('name', self.path.replace(/\./g, '_'));
		config.align && attrs.attr('class', 'ui-' + config.align);
		config.autofocus && attrs.attr('autofocus');

		builder.push('<input {0} />'.format(attrs.join(' ')));

		var icon = config.icon;
		var icon2 = config.icon2;

		if (!icon2 && self.type === 'date')
			icon2 = 'calendar';
		else if (self.type === 'search') {
			icon2 = 'search ui-textbox-control-icon';
			self.setter2 = function(value) {
				if (self.$stateremoved && !value)
					return;
				self.$stateremoved = value ? false : true;
				self.find('.ui-textbox-control-icon').tclass('fa-times', value ? true : false).tclass('fa-search', value ? false : true);
			};
		}

		icon2 && builder.push('<div><span class="fa fa-{0}"></span></div>'.format(icon2));
		config.increment && !icon2 && builder.push('<div><span class="fa fa-caret-up"></span><span class="fa fa-caret-down"></span></div>');

		if (config.label)
			content = config.label;

		if (content.length) {
			var html = builder.join('');
			builder = [];
			builder.push('<div class="ui-textbox-label{0}">'.format(config.required ? ' ui-textbox-label-required' : ''));
			icon && builder.push('<span class="fa fa-{0}"></span> '.format(icon));
			builder.push(content);
			builder.push(':</div><div class="ui-textbox">{0}</div>'.format(html));
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.html(builder.join(''));
			self.aclass('ui-textbox-container');
			input = self.find('input');
			container = self.find('.ui-textbox');
		} else {
			config.error && builder.push('<div class="ui-textbox-helper"><i class="fa fa-warning" aria-hidden="true"></i> {0}</div>'.format(config.error));
			self.aclass('ui-textbox ui-textbox-container');
			self.html(builder.join(''));
			input = self.find('input');
			container = self.element;
		}
	};

	self.configure = function(key, value, init) {

		if (init)
			return;

		var redraw = false;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.find('input').prop('disabled', value);
				break;
			case 'format':
				self.format = value;
				self.refresh();
				break;
			case 'required':
				self.noValid(!value);
				!value && self.state(1, 1);
				self.find('.ui-textbox-label').tclass('ui-textbox-label-required', value);
				break;
			case 'placeholder':
				input.prop('placeholder', value || '');
				break;
			case 'maxlength':
				input.prop('maxlength', value || 1000);
				break;
			case 'autofill':
				input.prop('name', value ? self.path.replace(/\./g, '_') : '');
				break;
			case 'label':
				content = value;
				redraw = true;
				break;
			case 'type':
				self.type = value;
				if (value === 'password')
					value = 'password';
				else
					self.type = 'text';
				redraw = true;
				break;
			case 'align':
				input.rclass(input.attr('class')).aclass('ui-' + value || 'left');
				break;
			case 'autofocus':
				input.focus();
				break;
			case 'icon':
			case 'icon2':
			case 'increment':
				redraw = true;
				break;
		}

		redraw && setTimeout2('redraw.' + self.id, function() {
			self.redraw();
			self.refresh();
		}, 100);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		container.tclass('ui-textbox-invalid', invalid);
		config.error && self.find('.ui-box-helper').tclass('ui-box-helper-show', invalid);
	};
});

COMPONENT('validation', function(self, config) {

	var path, elements = null;
	var def = 'button[name="submit"]';

	self.readonly();

	self.make = function() {
		elements = self.find(config.selector || def);
		path = self.path.replace(/\.\*$/, '');
		setTimeout(function() {
			self.watch(self.path, self.state, true);
		}, 50);
	};

	self.configure = function(key, value, init) {
		if (init)
			return;
		switch (key) {
			case 'selector':
				elements = self.find(value || def);
				break;
		}
	};

	self.state = function() {
		var disabled = MAIN.disabled(path);
		if (!disabled && config.if)
			disabled = !EVALUATE(self.path, config.if);
		elements.prop('disabled', disabled);
	};
});

COMPONENT('codemirror', 'linenumbers:false', function(self, config) {

	var skipA = false;
	var skipB = false;

	self.editor = null;
	self.getter = null;

	self.reload = function() {
		self.editor.refresh();
	};

	self.validate = function(value) {
		return config.disabled || !config.required ? true : value && value.length > 0;
	};

	self.configure = function(key, value, init) {
		if (init)
			return;

		switch (key) {
			case 'disabled':
				self.tclass('ui-disabled', value);
				self.editor.readOnly = value;
				self.editor.refresh();
				break;
			case 'required':
				self.find('.ui-codemirror-label').tclass('ui-codemirror-label-required', value);
				self.state(1, 1);
				break;
			case 'icon':
				self.find('i').rclass().aclass('fa fa-' + value);
				break;
		}

	};

	self.make = function() {

		var content = config.label || self.html();
		self.html((content ? '<div class="ui-codemirror-label' + (config.required ? ' ui-codemirror-label-required' : '') + '">' + (config.icon ? '<i class="fa fa-' + config.icon + '"></i> ' : '') + content + ':</div>' : '') + '<div class="ui-codemirror"></div>');
		var container = self.find('.ui-codemirror');

		self.editor = CodeMirror(container.get(0), { styleActiveLine: true, matchBrackets: true, lineWrapping: config.linewrapping, lineNumbers: config.linenumbers, mode: config.type || 'htmlmixed', indentUnit: 4 });
		if (config.height !== 'auto') {
			var is = typeof(config.height) === 'number';
			self.editor.setSize('100%', is ? (config.height + 'px') : (config.height || '200px'));
			!is && self.css('height', config.height);
		}

		if (config.disabled) {
			self.aclass('ui-disabled');
			self.editor.readOnly = true;
			self.editor.refresh();
		}

		self.editor.on('change', function(a, b) {

			if (config.disabled)
				return;

			var val = self.editor.getValue();
			self.emit('change', val);

			if (skipB && b.origin !== 'paste') {
				skipB = false;
				return;
			}

			setTimeout2(self.id, function() {
				skipA = true;
				self.reset(true);
				self.dirty(false);
				self.set(val);
			}, 200);
		});

		skipB = true;
	};

	self.setter = function(value) {

		if (skipA === true) {
			skipA = false;
			return;
		}

		skipB = true;
		self.editor.setValue(value || '');
		self.editor.refresh();
		skipB = true;

		CodeMirror.commands['selectAll'](self.editor);
		skipB = true;
		self.editor.setValue(self.editor.getValue());
		skipB = true;

		setTimeout(function() {
			self.editor.refresh();
		}, 200);

		setTimeout(function() {
			self.editor.refresh();
		}, 1000);

		setTimeout(function() {
			self.editor.refresh();
		}, 2000);
	};

	self.state = function(type) {
		if (!type)
			return;
		var invalid = config.required ? self.isInvalid() : false;
		if (invalid === self.$oldstate)
			return;
		self.$oldstate = invalid;
		self.find('.ui-codemirror').tclass('ui-codemirror-invalid', invalid);
	};
});

function refresh_markdown() {
	var el = $('.markdown');
	if (el.length) {
		marked_video(el.find('.lang-video'));
		marked_iframe(el.find('.lang-iframe'));
		el.find('pre code').each(FN('(i,b) => hljs.highlightBlock(b)'));
		el.find('a').each(function() {
			var el = $(this);
			var href = el.attr('href');
			href.substring(0, 1) !== '/' && el.attr('target', '_blank');
			href === '#' && el.attr('href', '#' + el.html().toLowerCase().replace(/[^\w]+/g, '-'));
		});
	}
}

function highlight(el) {
	$(el).find('pre code').each(function(i, block) {
		hljs.highlightBlock(block);
	});
}

function marked_video(selector) {
	selector.each(function() {
		var el = $(this);
		var html = el.html();
		if (html.indexOf('youtube') !== -1) {
			el.parent().replaceWith('<div class="video"><iframe src="https://www.youtube.com/embed/' + html.split('v=')[1] + '" frameborder="0" allowfullscreen></iframe></div>');
		} else if (html.indexOf('vimeo') !== -1) {
			el.parent().replaceWith('<div class="video"><iframe src="//player.vimeo.com/video/' + html.substring(html.lastIndexOf('/') + 1) + '" frameborder="0" allowfullscreen></iframe></div>');
		}
	});
}

function marked_iframe(selector) {
	selector.each(function() {
		var el = $(this);
		el.parent().replaceWith('<div class="iframe">' + el.html().replace(/\&lt\;/g, '<').replace(/\&gt\;/g, '>') + '</div>');
	});
}

COMPONENT('confirm', function(self) {

	var is, visible = false;

	self.readonly();
	self.singleton();

	self.make = function() {

		self.aclass('ui-confirm hidden');

		self.event('click', 'button', function() {
			self.hide($(this).attr('data-index').parseInt());
		});

		self.event('click', function(e) {
			var t = e.target.tagName;
			if (t !== 'DIV')
				return;
			var el = self.find('.ui-confirm-body');
			el.aclass('ui-confirm-click');
			setTimeout(function() {
				el.rclass('ui-confirm-click');
			}, 300);
		});

		$(window).on('keydown', function(e) {
			if (!visible)
				return;
			var index = e.which === 13 ? 0 : e.which === 27 ? 1 : null;
			if (index != null) {
				self.find('button[data-index="{0}"]'.format(index)).trigger('click');
				e.preventDefault();
			}
		});
	};

	self.confirm = function(message, buttons, fn) {
		self.callback = fn;

		var builder = [];

		buttons.forEach(function(item, index) {
			builder.push('<button data-index="{1}">{0}</button>'.format(item, index));
		});

		self.content('ui-confirm-warning', '<div class="ui-confirm-message">{0}</div>{1}'.format(message.replace(/\n/g, '<br />'), builder.join('')));
	};

	self.hide = function(index) {
		self.callback && self.callback(index);
		self.rclass('ui-confirm-visible');
		setTimeout2(self.id, function() {
			visible = false;
			self.aclass('hidden');
		}, 1000);
	};

	self.content = function(cls, text) {
		!is && self.html('<div><div class="ui-confirm-body"></div></div>');
		self.find('.ui-confirm-body').empty().append(text);
		self.rclass('hidden');
		setTimeout2(self.id, function() {
			visible = true;
			self.aclass('ui-confirm-visible');
		}, 5);
	};
});

COMPONENT('nosqlcounter', 'count:0', function(self, config) {

	var months = MONTHS;

	self.readonly();
	self.make = function() {
		self.toggle('ui-nosqlcounter hidden', true);
	};

	self.configure = function(key, value) {
		switch (key) {
			case 'months':
				if (value instanceof Array)
					months = value;
				else
					months = value.split(',').trim();
				break;
		}
	};

	self.setter = function(value) {

		var is = !value || !value.length;
		self.toggle('hidden', is);

		if (is)
			return self.empty();

		var maxbars = 12;

		if (config.count === 0)
			maxbars = self.element.width() / 30 >> 0;
		else
			maxbars = config.count;

		if (WIDTH() === 'xs')
			maxbars = maxbars / 2;

		var dt = new Date();
		var current = dt.format('yyyyMM');
		var stats = null;

		if (config.lastvalues) {
			var max = value.length - maxbars;
			if (max < 0)
				max = 0;
			stats = value.slice(max, value.length);
		} else {
			stats = [];
			for (var i = 0; i < maxbars; i++) {
				var id = dt.format('yyyyMM');
				var item = value.findItem('id', id);
				stats.push(item ? item : { id: id, month: dt.getMonth() + 1, year: dt.getFullYear(), value: 0 });
				dt = dt.add('-1 month');
			}
			stats.reverse();
		}

		var max = stats.scalar('max', 'value');
		var bar = 100 / maxbars;
		var builder = [];
		var cls = '';

		stats.forEach(function(item, index) {
			var val = item.value;
			if (val > 999)
				val = (val / 1000).format(1, 2) + 'K';

			var h = (item.value / max) * 60;
			h += 40;

			cls = item.value ? '' : 'empty';

			if (item.id === current)
				cls += (cls ? ' ' : '') + 'current';

			if (index === maxbars - 1)
				cls += (cls ? ' ' : '') + 'last';

			builder.push('<div style="width:{0}%;height:{1}%" title="{3}" class="{4}"><span>{2}</span></div>'.format(bar.format(2, ''), h.format(0, ''), val, months[item.month - 1] + ' ' + item.year, cls));
		});

		self.html(builder);
	};
});

COMPONENT('repeater', 'hidden:true', function(self, config) {

	var filter = null;
	var recompile = false;
	var reg = /\$(index|path)/g;

	self.readonly();

	self.configure = function(key, value) {
		if (key === 'filter')
			filter = value ? GET(value) : null;
	};

	self.make = function() {
		var element = self.find('script');

		if (!element.length) {
			element = self.element;
			self.element = self.element.parent();
		}

		var html = element.html();
		element.remove();
		self.template = Tangular.compile(html);
		recompile = html.indexOf('data-jc="') !== -1;
	};

	self.setter = function(value) {

		if (!value || !value.length) {
			config.hidden && self.aclass('hidden');
			self.empty();
			return;
		}

		var builder = [];
		for (var i = 0, length = value.length; i < length; i++) {
			var item = value[i];
			item.index = i;
			if (!filter || filter(item)) {
				builder.push(self.template(item).replace(reg, function(text) {
					return text.substring(0, 2) === '$i' ? i.toString() : self.path + '[' + i + ']';
				}));
			}
		}

		self.html(builder.join(''));
		config.hidden && self.rclass('hidden');
		recompile && self.compile();
	};
});

COMPONENT('autocomplete', function(self) {

	var container, old, onSearch, searchtimeout, searchvalue, blurtimeout, onCallback, datasource, offsetter = null;
	var is = false;
	var margin = {};

	self.template = Tangular.compile('<li{{ if index === 0 }} class="selected"{{ fi }} data-index="{{ index }}"><span>{{ name }}</span><span>{{ type }}</span></li>');
	self.readonly();
	self.singleton();

	self.make = function() {
		self.aclass('ui-autocomplete-container hidden');
		self.html('<div class="ui-autocomplete"><ul></ul></div>');
		container = self.find('ul');

		self.event('click', 'li', function(e) {
			e.preventDefault();
			e.stopPropagation();
			onCallback && onCallback(datasource[+$(this).attr('data-index')], old);
			self.visible(false);
		});

		self.event('mouseenter mouseleave', 'li', function(e) {
			$(this).tclass('selected', e.type === 'mouseenter');
		});

		$(document).on('click', function() {
			is && self.visible(false);
		});

		$(window).on('resize', function() {
			self.resize();
		});
	};

	function keydown(e) {
		var c = e.which;
		var input = this;

		if (c !== 38 && c !== 40 && c !== 13) {
			if (c !== 8 && c < 32)
				return;
			clearTimeout(searchtimeout);
			searchtimeout = setTimeout(function() {
				var val = input.value;
				if (!val)
					return self.render(EMPTYARRAY);
				if (searchvalue === val)
					return;
				searchvalue = val;
				self.resize();
				onSearch(val, function(value) { self.render(value); });
			}, 200);
			return;
		}

		var current = self.find('.selected');

		if (c === 13) {
			self.visible(false);
			if (current.length) {
				onCallback(datasource[+current.attr('data-index')], old);
				e.preventDefault();
				e.stopPropagation();
			}
			return;
		}

		e.preventDefault();
		e.stopPropagation();

		if (current.length) {
			current.rclass('selected');
			current = c === 40 ? current.next() : current.prev();
		}

		if (!current.length)
			current = self.find('li:{0}-child'.format(c === 40 ? 'first' : 'last'));
		current.aclass('selected');
	}

	function blur() {
		clearTimeout(blurtimeout);
		blurtimeout = setTimeout(function() {
			self.visible(false);
		}, 300);
	}

	self.visible = function(visible) {
		clearTimeout(blurtimeout);
		self.tclass('hidden', !visible);
		is = visible;
	};

	self.resize = function() {

		if (!offsetter || !old)
			return;

		var offset = offsetter.offset();
		offset.top += offsetter.height();
		offset.width = offsetter.width();

		if (margin.left)
			offset.left += margin.left;
		if (margin.top)
			offset.top += margin.top;
		if (margin.width)
			offset.width += margin.width;

		self.css(offset);
	};

	self.attach = function(input, search, callback, top, left, width) {
		self.attachelement(input, input, search, callback, top, left, width);
	};

	self.attachelement = function(element, input, search, callback, top, left, width) {

		clearTimeout(searchtimeout);

		if (input.setter)
			input = input.find('input');
		else
			input = $(input);

		if (old) {
			old.removeAttr('autocomplete');
			old.off('blur', blur);
			old.off('keydown', keydown);
		}

		input.on('keydown', keydown);
		input.on('blur', blur);
		input.attr({ 'autocomplete': 'off' });

		old = input;
		margin.left = left;
		margin.top = top;
		margin.width = width;

		offsetter = $(element);
		self.resize();
		self.refresh();
		searchvalue = '';
		onSearch = search;
		onCallback = callback;
		self.visible(false);
	};

	self.render = function(arr) {

		datasource = arr;

		if (!arr || !arr.length) {
			self.visible(false);
			return;
		}

		var builder = [];
		for (var i = 0, length = arr.length; i < length; i++) {
			var obj = arr[i];
			obj.index = i;
			builder.push(self.template(obj));
		}

		container.empty().append(builder.join(''));
		self.visible(true);
	};
});

COMPONENT('shortcuts', function(self) {

	var items = [];
	var length = 0;

	self.singleton();
	self.readonly();
	self.blind();

	self.make = function() {
		$(window).on('keydown', function(e) {
			if (length) {

				for (var i = 0; i < length; i++) {
					var o = items[i];
					if (o.fn(e)) {
						if (o.prevent) {
							e.preventDefault();
							e.stopPropagation();
						}
						setTimeout(function(o, e) {
							o.callback(e);
						}, 100, o, e);
					}
				}
			}
		});
	};

	self.register = function(shortcut, callback, prevent) {
		var builder = [];
		shortcut.split('+').trim().forEach(function(item) {
			var lower = item.toLowerCase();
			switch (lower) {
				case 'ctrl':
				case 'alt':
				case 'shift':
					builder.push('e.{0}Key'.format(lower));
					return;
				case 'win':
				case 'meta':
				case 'cmd':
					builder.push('e.metaKey');
					return;
				case 'space':
					builder.push('e.keyCode===32');
					return;
				case 'tab':
					builder.push('e.keyCode===9');
					return;
				case 'esc':
					builder.push('e.keyCode===27');
					return;
				case 'enter':
					builder.push('e.keyCode===13');
					return;
				case 'backspace':
				case 'del':
				case 'delete':
					builder.push('(e.keyCode===8||e.keyCode===127)');
					return;
				case 'up':
					builder.push('e.keyCode===38');
					return;
				case 'down':
					builder.push('e.keyCode===40');
					return;
				case 'right':
					builder.push('e.keyCode===39');
					return;
				case 'left':
					builder.push('e.keyCode===37');
					return;
				case 'f1':
				case 'f2':
				case 'f3':
				case 'f4':
				case 'f5':
				case 'f6':
				case 'f7':
				case 'f8':
				case 'f9':
				case 'f10':
				case 'f11':
				case 'f12':
					var a = item.toUpperCase();
					builder.push('e.key===\'{0}\''.format(a));
					return;
				case 'capslock':
					builder.push('e.which===20');
					return;
			}

			var num = item.parseInt();
			if (num)
				builder.push('e.which===' + num);
			else
				builder.push('e.key===\'{0}\''.format(item));

		});

		items.push({ fn: new Function('e', 'return ' + builder.join('&&')), callback: callback, prevent: true });
		length = items.length;
		return self;
	};
});