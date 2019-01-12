const REG_LINKS = /"@\d+[0-9a-z]+(#|")/g;
const REG_HREF = /href="\//g;

String.prototype.markdown2 = function() {
	return this.markdown().replace(REG_LINKS, function(id) {
		var link = F.global.pages.findItem('id', id.substring(2, id.length - 1));
		return (link ? ('"/' + link.url + '/' + id.substring(id.length - 1)) : id);
	}).replace(REG_HREF, 'class="jrouting" href="/').replace(/\t/g, '    ');
};

/*! Markdown | (c) 2019 Peter Sirka | www.petersirka.com */
(function Markdown() {

	var links = /(!)?\[.*?\]\(.*?\)/g;
	var links2 = /&lt;(https|http)+:\/\/.*?&gt;/g;
	var imagelinks = /\[!\[.*?\]\(.*?\)\]\(.*?\)/g;
	var format = /__.*?__|_.*?_|\*\*.*?\*\*|\*.*?\*|~~.*?~~|~.*?~/g;
	var ordered = /^([a-z|0-9]{1,2}\.\s)|-\s/i;
	var orderedsize = /^(\s|\t)+/;
	var code = /`.*?`/g;
	var encodetags = /<|>/g;
	var formatclean = /_|\*|~/g;
	var regid = /[^\w]+/g;
	var regdash = /-{2,}/g;
	var regtags = /<\/?[^>]+(>|$)/g;
	var regicons = /(^|[^\w]):[a-z-]+:([^\w]|$)/g;

	var encode = function(val) {
		return '&' + (val === '<' ? 'lt' : 'gt') + ';';
	};

	function markdown_code(value) {
		return '<code>' + value.substring(1, value.length - 1) + '</code>';
	}

	function markdown_imagelinks(value) {
		var end = value.indexOf(')') + 1;
		var img = value.substring(1, end);
		return '<a href="' + value.substring(end + 2, value.length - 1) + '">' + markdown_links(img) + '</a>';
	}

	function markdown_table(value, align, ishead) {

		var columns = value.substring(1, value.length - 1).split('|');
		var builder = '';

		for (var i = 0; i < columns.length; i++) {
			var column = columns[i].trim();
			if (column.charAt(0) == '-')
				continue;
			var a = align[i];
			builder += '<' + (ishead ? 'th' : 'td') + (a && a !== 'left' ? (' class="' + a + '"') : '') + '>' + column + '</' + (ishead ? 'th' : 'td') + '>';
		}

		return '<tr>' + builder + '</tr>';
	}

	function markdown_links(value) {
		var end = value.lastIndexOf(']');
		var img = value.charAt(0) === '!';
		var text = value.substring(img ? 2 : 1, end);
		var link = value.substring(end + 2, value.length - 1);
		var responsive = true;

		if (img) {
			if (text.charAt(0) === '+') {
				responsive = false;
				text = text.substring(1);
			}
		}

		return img ? ('<img src="' + link + '" alt="' + text + '"' + (responsive ? ' class="img-responsive"' : '') + ' border="0" />') : ('<a href="' + link + '">' + text + '</a>');
	}

	function markdown_links2(value)	{
		value = value.substring(4, value.length - 4);
		return '<a href="' + value + '">' + value + '</a>';
	}

	function markdown_format(value) {
		switch (value.charAt(0)) {
			case '_':
				return '<strong>' + value.replace(formatclean, '') + '</strong>';
			case '*':
				return '<em>' + value.replace(formatclean, '') + '</em>';
			case '~':
				return '<strike>' + value.replace(formatclean, '') + '</strike>';
		}
		return value;
	}

	function markdown_id(value) {

		var end = '';
		var beg = '';

		if (value.charAt(0) === '<')
			beg = '-';

		if (value.charAt(value.length - 1) === '>')
			end = '-';

		return (beg + value.replace(regtags, '').toLowerCase().replace(regid, '-') + end).replace(regdash, '-');
	}

	function markdown_icon(value) {

		var beg = -1;
		var end = -1;

		for (var i = 0; i < value.length; i++) {
			var code = value.charCodeAt(i);
			if (code === 58) {
				if (beg === -1)
					beg = i + 1;
				else
					end = i;
			}
		}

		return value.substring(0, beg - 1) + '<i class="fa fa-' + value.substring(beg, end) + '"></i>' + value.substring(end + 1);
	}

	String.prototype.markdown = function() {
		var lines = this.split('\n');
		var builder = [];
		var ul = [];
		var table = false;
		var iscode = false;
		var ishead = false;
		var prev;
		var prevsize = 0;
		var tmp;

		var closeul = function() {
			while (ul.length)
				builder.push('</' + ul.pop() + '>');
		};

		for (var i = 0, length = lines.length; i < length; i++) {

			lines[i] = lines[i].replace(encodetags, encode);

			if (lines[i].substring(0, 3) === '```') {

				if (iscode) {
					builder.push('</code></pre>');
					iscode = false;
					continue;
				}

				closeul();
				iscode = true;
				tmp = '<pre><code class="lang-' + lines[i].substring(3) + '">';
				prev = 'code';
				continue;
			}

			if (iscode) {
				builder.push(tmp + lines[i]);
				if (tmp)
					tmp = '';
				continue;
			}

			var line = lines[i].replace(imagelinks, markdown_imagelinks).replace(links, markdown_links).replace(links2, markdown_links2).replace(format, markdown_format).replace(code, markdown_code).replace(regicons, markdown_icon);
			if (!line) {
				if (table) {
					table = null;
					builder.push('</tbody></table>');
				}
			}

			if (line === '' && lines[i - 1] === '') {
				closeul();
				builder.push('<br />');
				prev = 'br';
				continue;
			}

			if (line[0] === '|') {
				closeul();
				if (!table) {
					var next = lines[i + 1];
					if (next[0] === '|') {
						table = [];
						var columns = next.substring(1, next.length - 1).split('|');
						for (var j = 0; j < columns.length; j++) {
							var column = columns[j].trim();
							var align = 'left';
							if (column.charAt(column.length - 1) === ':')
								align = column[0] === ':' ? 'center' : 'right';
							table.push(align);
						}
						builder.push('<table class="table table-bordered"><thead>');
						prev = 'table';
						ishead = true;
						i++;
					} else
						continue;
				}

				if (ishead)
					builder.push(markdown_table(line, table, true) + '</thead><tbody>');
				else
					builder.push(markdown_table(line, table));
				ishead = false;
				continue;
			}

			if (line.charAt(0) === '#') {

				closeul();

				if (line.substring(0, 2) === '# ') {
					tmp = line.substring(2).trim();
					builder.push('<h1 id="' + markdown_id(tmp) + '">' + tmp + '</h1>');
					prev = '#';
					continue;
				}

				if (line.substring(0, 3) === '## ') {
					tmp = line.substring(3).trim();
					builder.push('<h2 id="' + markdown_id(tmp) + '">' + tmp + '</h2>');
					prev = '##';
					continue;
				}

				if (line.substring(0, 4) === '### ') {
					tmp = line.substring(4).trim();
					builder.push('<h3 id="' + markdown_id(tmp) + '">' + tmp + '</h3>');
					prev = '###';
					continue;
				}

				if (line.substring(0, 5) === '#### ') {
					tmp = line.substring(5).trim();
					builder.push('<h4 id="' + markdown_id(tmp) + '">' + tmp + '</h4>');
					prev = '####';
					continue;
				}

				if (line.substring(0, 6) === '##### ') {
					tmp = line.substring(6).trim();
					builder.push('<h5 id="' + markdown_id(tmp) + '">' + tmp + '</h5>');
					prev = '#####';
					continue;
				}
			}

			tmp = line.substring(0, 3);

			if (tmp === '---' || tmp === '***') {
				prev = 'hr';
				builder.push('<hr class="line' + (tmp.charAt(0) === '-' ? '1' : '2') + '" />');
				continue;
			}

			if (line.substring(0, 5) === '&gt; ') {
				builder.push('<blockquote>' + line.substring(5).trim() + '</blockquote>');
				prev = '>';
				continue;
			}

			var tmpline = line.trim();

			if (ordered.test(tmpline)) {

				var size = line.match(orderedsize);
				if (size)
					size = size[0].length;
				else
					size = 0;

				var append = false;

				if (prevsize !== size) {
					// NESTED
					if (size > prevsize) {
						prevsize = size;
						append = true;
						var index = builder.length - 1;
						builder[index] = builder[index].substring(0, builder[index].length - 5);
						prev = '';
					} else {
						// back to normal
						prevsize = size;
						builder.push('</' + ul.pop() + '>');
					}
				}

				var type = tmpline.charAt(0) === '-' ? 'ul' : 'ol';
				if (prev !== type) {
					var subtype;
					if (type === 'ol')
						subtype = tmpline.charAt(0);
					builder.push('<' + type + (subtype ? (' type="' + subtype + '"') : '') + '>');
					ul.push(type + (append ? '></li' : ''));
					prev = type;
					prevsize = size;
				}

				builder.push('<li>' + (type === 'ol' ? tmpline.substring(tmpline.indexOf('.') + 1) : tmpline.substring(2)).trim().replace(/\[x\]/g, '<i class="fa fa-check-square green"></i>').replace(/\[\s\]/g, '<i class="far fa-square"></i>') + '</li>');

			} else {
				closeul();
				line && builder.push('<p>' + line.trim() + '</p>');
				prev = 'p';
			}
		}

		closeul();
		table && builder.push('</tbody></table>');
		iscode && builder.push('</code></pre>');

		return '<div class="markdown">' + builder.join('\n') + '</div>';
	};

})();