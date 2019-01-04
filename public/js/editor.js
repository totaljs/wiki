// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {

	CodeMirror.defineOption('rulers', false, function(cm, val) {
		if (cm.state.rulerDiv) {
			cm.state.rulerDiv.parentElement.removeChild(cm.state.rulerDiv);
			cm.state.rulerDiv = null;
			cm.off('refresh', drawRulers);
		}

		if (val && val.length) {
			cm.state.rulerDiv = cm.display.lineSpace.parentElement.insertBefore(document.createElement('div'), cm.display.lineSpace);
			cm.state.rulerDiv.className = 'CodeMirror-rulers';
			drawRulers(cm);
			cm.on('refresh', drawRulers);
		}
	});

	function drawRulers(cm) {
		cm.state.rulerDiv.textContent = '';
		var val = cm.getOption('rulers');
		var cw = cm.defaultCharWidth();
		var left = cm.charCoords(CodeMirror.Pos(cm.firstLine(), 0), 'div').left;
		cm.state.rulerDiv.style.minHeight = (cm.display.scroller.offsetHeight + 30) + 'px';
		for (var i = 0; i < val.length; i++) {
			var elt = document.createElement('div');
			elt.className = 'CodeMirror-ruler';
			var col, conf = val[i];
			if (typeof(conf) == 'number') {
				col = conf;
			} else {
				col = conf.column;
				if (conf.className) elt.className += ' ' + conf.className;
				if (conf.color) elt.style.borderColor = conf.color;
				if (conf.lineStyle) elt.style.borderLeftStyle = conf.lineStyle;
				if (conf.width) elt.style.borderLeftWidth = conf.width;
			}
			elt.style.left = (left + col * cw) + 'px';
			cm.state.rulerDiv.appendChild(elt);
		}
	}
});

(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {

	function Bar(cls, orientation, scroll) {
		var self = this;
		self.orientation = orientation;
		self.scroll = scroll;
		self.screen = self.total = self.size = 1;
		self.pos = 0;
		self.node = document.createElement('div');
		self.node.className = cls + '-' + orientation;
		self.inner = self.node.appendChild(document.createElement('div'));

		CodeMirror.on(self.inner, 'mousedown', function(e) {

			if (e.which != 1)
				return;

			CodeMirror.e_preventDefault(e);
			var axis = self.orientation == 'horizontal' ? 'pageX' : 'pageY';
			var start = e[axis], startpos = self.pos;

			function done() {
				CodeMirror.off(document, 'mousemove', move);
				CodeMirror.off(document, 'mouseup', done);
			}

			function move(e) {
				if (e.which != 1)
					return done();
				self.moveTo(startpos + (e[axis] - start) * (self.total / self.size));
			}

			CodeMirror.on(document, 'mousemove', move);
			CodeMirror.on(document, 'mouseup', done);
		});

		CodeMirror.on(self.node, 'click', function(e) {
			CodeMirror.e_preventDefault(e);
			var innerBox = self.inner.getBoundingClientRect(), where;
			if (self.orientation == 'horizontal')
				where = e.clientX < innerBox.left ? -1 : e.clientX > innerBox.right ? 1 : 0;
			else
				where = e.clientY < innerBox.top ? -1 : e.clientY > innerBox.bottom ? 1 : 0;
			self.moveTo(self.pos + where * self.screen);
		});

		function onWheel(e) {
			var moved = CodeMirror.wheelEventPixels(e)[self.orientation == 'horizontal' ? 'x' : 'y'];
			var oldPos = self.pos;
			self.moveTo(self.pos + moved);
			if (self.pos != oldPos) CodeMirror.e_preventDefault(e);
		}
		CodeMirror.on(self.node, 'mousewheel', onWheel);
		CodeMirror.on(self.node, 'DOMMouseScroll', onWheel);
	}

	Bar.prototype.setPos = function(pos, force) {
		var t = this;
		if (pos < 0)
			pos = 0;
		if (pos > t.total - t.screen)
			pos = t.total - t.screen;
		if (!force && pos == t.pos)
			return false;
		t.pos = pos;
		t.inner.style[t.orientation == 'horizontal' ? 'left' : 'top'] = (pos * (t.size / t.total)) + 'px';
		return true;
	};

	Bar.prototype.moveTo = function(pos) {
		var t = this;
		t.setPos(pos) && t.scroll(pos, t.orientation);
	};

	var minButtonSize = 10;

	Bar.prototype.update = function(scrollSize, clientSize, barSize) {
		var t = this;
		var sizeChanged = t.screen != clientSize || t.total != scrollSize || t.size != barSize;

		if (sizeChanged) {
			t.screen = clientSize;
			t.total = scrollSize;
			t.size = barSize;
		}

		var buttonSize = t.screen * (t.size / t.total);
		if (buttonSize < minButtonSize) {
			t.size -= minButtonSize - buttonSize;
			buttonSize = minButtonSize;
		}

		t.inner.style[t.orientation == 'horizontal' ? 'width' : 'height'] = buttonSize + 'px';
		t.setPos(t.pos, sizeChanged);
	};

	function SimpleScrollbars(cls, place, scroll) {
		var t = this;
		t.addClass = cls;
		t.horiz = new Bar(cls, 'horizontal', scroll);
		place(t.horiz.node);
		t.vert = new Bar(cls, 'vertical', scroll);
		place(t.vert.node);
		t.width = null;
	}

	SimpleScrollbars.prototype.update = function(measure) {
		var t = this;
		if (t.width == null) {
			var style = window.getComputedStyle ? window.getComputedStyle(t.horiz.node) : t.horiz.node.currentStyle;
			if (style)
				t.width = parseInt(style.height);
		}

		var width = t.width || 0;
		var needsH = measure.scrollWidth > measure.clientWidth + 1;
		var needsV = measure.scrollHeight > measure.clientHeight + 1;

		t.vert.node.style.display = needsV ? 'block' : 'none';
		t.horiz.node.style.display = needsH ? 'block' : 'none';

		if (needsV) {
			t.vert.update(measure.scrollHeight, measure.clientHeight, measure.viewHeight - (needsH ? width : 0));
			t.vert.node.style.bottom = needsH ? width + 'px' : '0';
		}

		if (needsH) {
			var l = 0; // measure.barLeft;
			t.horiz.update(measure.scrollWidth, measure.clientWidth, measure.viewWidth - (needsV ? width : 0) - l);
			t.horiz.node.style.right = needsV ? width + 'px' : '0';
			t.horiz.node.style.left = l + 'px';
		}

		return { right: needsV ? width : 0, bottom: needsH ? width : 0 };
	};

	SimpleScrollbars.prototype.setScrollTop = function(pos) {
		this.vert.setPos(pos);
	};

	SimpleScrollbars.prototype.setScrollLeft = function(pos) {
		this.horiz.setPos(pos);
	};

	SimpleScrollbars.prototype.clear = function() {
		var parent = this.horiz.node.parentNode;
		parent.removeChild(this.horiz.node);
		parent.removeChild(this.vert.node);
	};

	CodeMirror.scrollbarModel.simple = function(place, scroll) {
		return new SimpleScrollbars('CodeMirror-simplescroll', place, scroll);
	};

	CodeMirror.scrollbarModel.overlay = function(place, scroll) {
		return new SimpleScrollbars('CodeMirror-overlayscroll', place, scroll);
	};
});

(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {

	var defaults = {
		style: 'matchhighlight',
		minChars: 2,
		delay: 100,
		wordsOnly: false,
		annotateScrollbar: false,
		showToken: false,
		trim: true
	};

	function State(options) {
		this.options = {};
		for (var name in defaults)
			this.options[name] = (options && options.hasOwnProperty(name) ? options : defaults)[name];
		this.overlay = this.timeout = null;
		this.matchesonscroll = null;
		this.active = false;
	}

	CodeMirror.defineOption('highlightSelectionMatches', false, function(cm, val, old) {
		if (old && old != CodeMirror.Init) {
			removeOverlay(cm);
			clearTimeout(cm.state.matchHighlighter.timeout);
			cm.state.matchHighlighter = null;
			cm.off('cursorActivity', cursorActivity);
			cm.off('focus', onFocus);
		}

		if (val) {
			var state = cm.state.matchHighlighter = new State(val);
			if (cm.hasFocus()) {
				state.active = true;
				highlightMatches(cm);
			} else {
				cm.on('focus', onFocus);
			}
			cm.on('cursorActivity', cursorActivity);
		}
	});

	function cursorActivity(cm) {
		var state = cm.state.matchHighlighter;
		if (state.active || cm.hasFocus())
			scheduleHighlight(cm, state);
	}

	function onFocus(cm) {
		var state = cm.state.matchHighlighter;
		if (!state.active) {
			state.active = true;
			scheduleHighlight(cm, state);
		}
	}

	function scheduleHighlight(cm, state) {
		clearTimeout(state.timeout);
		state.timeout = setTimeout(function() {
			highlightMatches(cm);
		}, state.options.delay);
	}

	function addOverlay(cm, query, hasBoundary, style) {
		var state = cm.state.matchHighlighter;
		cm.addOverlay(state.overlay = makeOverlay(query, hasBoundary, style));
		if (state.options.annotateScrollbar && cm.showMatchesOnScrollbar) {
			var searchFor = hasBoundary ? new RegExp('\\b' + query.replace(/[\\[.+*?(){|^$]/g, '\\$&') + '\\b') : query;
			state.matchesonscroll = cm.showMatchesOnScrollbar(searchFor, false, { className: 'CodeMirror-selection-highlight-scrollbar' });
		}
	}

	function removeOverlay(cm) {
		var state = cm.state.matchHighlighter;
		if (state.overlay) {
			cm.removeOverlay(state.overlay);
			state.overlay = null;
			if (state.matchesonscroll) {
				state.matchesonscroll.clear();
				state.matchesonscroll = null;
			}
		}
	}

	function highlightMatches(cm) {
		cm.operation(function() {

			var state = cm.state.matchHighlighter;
			removeOverlay(cm);

			if (!cm.somethingSelected() && state.options.showToken) {
				var re = state.options.showToken === true ? /[\w$]/ : state.options.showToken;
				var cur = cm.getCursor(), line = cm.getLine(cur.line), start = cur.ch, end = start;
				while (start && re.test(line.charAt(start - 1))) --start;
				while (end < line.length && re.test(line.charAt(end))) ++end;
				if (start < end)
					addOverlay(cm, line.slice(start, end), re, state.options.style);
				return;
			}

			var from = cm.getCursor('from'), to = cm.getCursor('to');
			if (from.line != to.line)
				return;

			if (state.options.wordsOnly && !isWord(cm, from, to))
				return;

			var selection = cm.getRange(from, to);

			if ((/\W/).test(selection))
				return;

			if (state.options.trim) selection = selection.replace(/^\s+|\s+$/g, '');
			if (selection.length >= state.options.minChars)
				addOverlay(cm, selection, false, state.options.style);
		});
	}

	function isWord(cm, from, to) {
		var str = cm.getRange(from, to);
		if (str.match(/^\w+$/) !== null) {
			if (from.ch > 0) {
				var pos = {line: from.line, ch: from.ch - 1};
				var chr = cm.getRange(pos, from);
				if (chr.match(/\W/) === null)
					return false;
			}
			if (to.ch < cm.getLine(from.line).length) {
				var pos = {line: to.line, ch: to.ch + 1};
				var chr = cm.getRange(to, pos);
				if (chr.match(/\W/) === null)
					return false;
			}
			return true;
		} else
			return false;
	}

	function boundariesAround(stream, re) {
		return (!stream.start || !re.test(stream.string.charAt(stream.start - 1))) && (stream.pos == stream.string.length || !re.test(stream.string.charAt(stream.pos)));
	}

	function makeOverlay(query, hasBoundary, style) {
		return { token: function(stream) {
			if (stream.match(query) && (!hasBoundary || boundariesAround(stream, hasBoundary)))
				return style;
			stream.next();
			stream.skipTo(query.charAt(0)) || stream.skipToEnd();
		}};
	}
});

(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {
	CodeMirror.defineOption('showTrailingSpace', false, function(cm, val, prev) {
		if (prev == CodeMirror.Init)
			prev = false;
		if (prev && !val)
			cm.removeOverlay('trailingspace');
		else if (!prev && val) {
			cm.addOverlay({ token: function(stream) {
				for (var l = stream.string.length, i = l; i; --i) {
					if (stream.string.charCodeAt(i - 1) !== 32)
						break;
				}
				if (i > stream.pos) {
					stream.pos = i;
					return null;
				}
				stream.pos = l;
				return 'trailingspace';
			}, name: 'trailingspace' });
		}
	});
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {

	CodeMirror.defineOption('scrollPastEnd', false, function(cm, val, old) {
		if (old && old != CodeMirror.Init) {
			cm.off('change', onChange);
			cm.off('refresh', updateBottomMargin);
			cm.display.lineSpace.parentNode.style.paddingBottom = '';
			cm.state.scrollPastEndPadding = null;
		}
		if (val) {
			cm.on('change', onChange);
			cm.on('refresh', updateBottomMargin);
			updateBottomMargin(cm);
		}
	});

	function onChange(cm, change) {
		if (CodeMirror.changeEnd(change).line == cm.lastLine())
			updateBottomMargin(cm);
	}

	function updateBottomMargin(cm) {
		var padding = '';

		if (cm.lineCount() > 1) {
			var totalH = cm.display.scroller.clientHeight - 30;
			var lastLineH = cm.getLineHandle(cm.lastLine()).height;
			padding = (totalH - lastLineH) + 'px';
		}

		if (cm.state.scrollPastEndPadding != padding) {
			cm.state.scrollPastEndPadding = padding;
			cm.display.lineSpace.parentNode.style.paddingBottom = padding;
			cm.off('refresh', updateBottomMargin);
			cm.setSize();
			cm.on('refresh', updateBottomMargin);
		}
	}
});

// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
(function(mod) {
	mod(CodeMirror);
})(function(CodeMirror) {

	var reg_skip = (/[a-zA-Z'"`0-9]/);

	var defaults = {
		pairs: '()[]{}\'\'""',
		triples: '',
		explode: '[]{}'
	};

	var Pos = CodeMirror.Pos;

	CodeMirror.defineOption('autoCloseBrackets', false, function(cm, val, old) {

		if (old && old != CodeMirror.Init) {
			cm.removeKeyMap(keyMap);
			cm.state.closeBrackets = null;
		}

		if (val) {
			ensureBound(getOption(val, 'pairs'));
			cm.state.closeBrackets = val;
			cm.addKeyMap(keyMap);
		}
	});

	function getOption(conf, name) {
		if (name == 'pairs' && typeof conf == 'string')
			return conf;
		if (typeof(conf) == 'object' && conf[name] != null)
			return conf[name];
		return defaults[name];
	}

	var keyMap = { Backspace: handleBackspace, Enter: handleEnter };

	function ensureBound(chars) {
		for (var i = 0; i < chars.length; i++) {
			var ch = chars.charAt(i), key = '\'' + ch + '\'';
			!keyMap[key] && (keyMap[key] = handler(ch));
		}
	}

	ensureBound(defaults.pairs + '`');

	function handler(ch) {
		return function(cm) {
			return handleChar(cm, ch);
		};
	}

	function getConfig(cm) {
		var deflt = cm.state.closeBrackets;
		if (!deflt || deflt.override)
			return deflt;
		return cm.getModeAt(cm.getCursor()).closeBrackets || deflt;
	}

	function handleBackspace(cm) {
		var conf = getConfig(cm);
		if (!conf || cm.getOption('disableInput'))
			return CodeMirror.Pass;

		var pairs = getOption(conf, 'pairs');
		var ranges = cm.listSelections();

		for (var i = 0; i < ranges.length; i++) {
			if (!ranges[i].empty())
				return CodeMirror.Pass;
			var around = charsAround(cm, ranges[i].head);
			if (!around || pairs.indexOf(around) % 2 != 0)
				return CodeMirror.Pass;
		}

		for (var i = ranges.length - 1; i >= 0; i--) {
			var cur = ranges[i].head;
			cm.replaceRange('', Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1), '+delete');
		}
	}

	function handleEnter(cm) {
		var conf = getConfig(cm);
		var explode = conf && getOption(conf, 'explode');
		if (!explode || cm.getOption('disableInput'))
			return CodeMirror.Pass;

		var ranges = cm.listSelections();
		for (var i = 0; i < ranges.length; i++) {
			if (!ranges[i].empty())
				return CodeMirror.Pass;
			var around = charsAround(cm, ranges[i].head);
			if (!around || explode.indexOf(around) % 2 != 0)
				return CodeMirror.Pass;
		}

		cm.operation(function() {
			var linesep = cm.lineSeparator() || '\n';
			cm.replaceSelection(linesep + linesep, null);
			cm.execCommand('goCharLeft');
			ranges = cm.listSelections();
			for (var i = 0; i < ranges.length; i++) {
				var line = ranges[i].head.line;
				cm.indentLine(line, null, true);
				cm.indentLine(line + 1, null, true);
			}
		});
	}

	function contractSelection(sel) {
		var inverted = CodeMirror.cmpPos(sel.anchor, sel.head) > 0;
		return { anchor: new Pos(sel.anchor.line, sel.anchor.ch + (inverted ? -1 : 1)), head: new Pos(sel.head.line, sel.head.ch + (inverted ? 1 : -1)) };
	}

	function handleChar(cm, ch) {
		var conf = getConfig(cm);
		if (!conf || cm.getOption('disableInput'))
			return CodeMirror.Pass;

		var pairs = getOption(conf, 'pairs');
		var pos = pairs.indexOf(ch);
		if (pos == -1)
			return CodeMirror.Pass;

		var triples = getOption(conf, 'triples');
		var identical = pairs.charAt(pos + 1) == ch;
		var ranges = cm.listSelections();
		var opening = pos % 2 == 0;
		var type;

		for (var i = 0; i < ranges.length; i++) {
			var range = ranges[i], cur = range.head, curType;
			var next = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
			if (opening && !range.empty()) {
				curType = 'surround';
			} else if ((identical || !opening) && next == ch) {
				if (identical && stringStartsAfter(cm, cur)) {
					curType = 'both';
				} else if (triples.indexOf(ch) >= 0 && cm.getRange(cur, Pos(cur.line, cur.ch + 3)) == ch + ch + ch)
					curType = 'skipThree';
				else
					curType = 'skip';
			} else if (identical && cur.ch > 1 && triples.indexOf(ch) >= 0 && cm.getRange(Pos(cur.line, cur.ch - 2), cur) == ch + ch) {
				if (cur.ch > 2 && /\bstring/.test(cm.getTokenTypeAt(Pos(cur.line, cur.ch - 2))))
					return CodeMirror.Pass;
				curType = 'addFour';
			} else if (identical) {
				var prev = cur.ch == 0 ? ' ' : cm.getRange(Pos(cur.line, cur.ch - 1), cur);
				if (!CodeMirror.isWordChar(next) && prev != ch && !CodeMirror.isWordChar(prev))
					curType = 'both';
				else
					return CodeMirror.Pass;
			} else if (opening) {
				var n = cm.getRange(cur, Pos(cur.line, cur.ch + 1));
				if (reg_skip.test(n))
					return CodeMirror.Pass;
				curType = 'both';
			} else
				return CodeMirror.Pass;
			if (!type)
				type = curType;
			else if (type != curType)
				return CodeMirror.Pass;
		}

		var left = pos % 2 ? pairs.charAt(pos - 1) : ch;
		var right = pos % 2 ? ch : pairs.charAt(pos + 1);

		cm.operation(function() {
			if (type == 'skip') {
				cm.execCommand('goCharRight');
			} else if (type == 'skipThree') {
				for (var i = 0; i < 3; i++)
					cm.execCommand('goCharRight');
			} else if (type == 'surround') {
				var sels = cm.getSelections();
				for (var i = 0; i < sels.length; i++)
					sels[i] = left + sels[i] + right;
				cm.replaceSelections(sels, 'around');
				sels = cm.listSelections().slice();
				for (var i = 0; i < sels.length; i++)
					sels[i] = contractSelection(sels[i]);
				cm.setSelections(sels);
			} else if (type == 'both') {
				cm.replaceSelection(left + right, null);
				cm.triggerElectric(left + right);
				cm.execCommand('goCharLeft');
			} else if (type == 'addFour') {
				cm.replaceSelection(left + left + left + left, 'before');
				cm.execCommand('goCharRight');
			}
		});
	}

	function charsAround(cm, pos) {
		var str = cm.getRange(Pos(pos.line, pos.ch - 1),
			Pos(pos.line, pos.ch + 1));
		return str.length == 2 ? str : null;
	}

	function stringStartsAfter(cm, pos) {
		var token = cm.getTokenAt(Pos(pos.line, pos.ch + 1));
		return /\bstring/.test(token.type) && token.start == pos.ch && (pos.ch == 0 || !/\bstring/.test(cm.getTokenTypeAt(pos)));
	}
});