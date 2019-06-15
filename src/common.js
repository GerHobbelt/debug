
/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */

function setup(env) {
	createDebug.debug = createDebug;
	createDebug.default = createDebug;
	createDebug.coerce = coerce;
	createDebug.disable = disable;
	createDebug.enable = enable;
	createDebug.enabled = enabled;
	createDebug.humanize = require('ms');

	Object.keys(env).forEach(key => {
		createDebug[key] = env[key];
	});

	/**
	* Active `debug` instances.
	* @type {Object<String, Function>}
	*/
	createDebug.instances = {};

	/**
	* The currently active debug mode names, and names to skip.
	*/

	createDebug.names = [];
	createDebug.skips = [];

	/**
	 * Map of `%N` formatting handling functions for output formatting.
	 * `m` and `_time` are special hardcoded keys for `%m` and `%{timeformat}` respectively.
 	 *
	 * Valid key names are a single, lower or upper-case letter, e.g. "j" and "J".
	 */
	createDebug.outputFormatters = {};

	/**
	 * Map %m to applying formatters to arguments
	 */
	createDebug.outputFormatters.m = function (_, args) {
		args[0] = createDebug.coerce(args[0]);

		if (typeof args[0] !== 'string') {
			// Anything else: let's inspect with %O
			/**
			 * Note: This only inspects the first argument,
			 * so if debug({foo: "bar"}, {foo: "bar"}) is passed
			 * only the first object will be colored by node's formatters.O
			 */
			args.unshift('%O');
		}

		// Apply any `formatters` transformations
		let index = 0;
		args[0] = args[0].replace(/%([a-zA-Z%])/g, (match, format) => {
			// If we encounter an escaped % then don't increase the array index
			console.warn("M formatter", match, format, typeof createDebug.outputFormatters[format]);
			if (match === '%%') {
				return match;
			}
			index++;
			// do not *recurse* %m formatters, which would b0rk input such as
			// this:
			//     let str = "%m";
			//     log("%m", str);  // the INTENT is here to literal-dump `str` anyhow
			let formatter = createDebug.outputFormatters[format];
			if (typeof formatter === 'function' && formatter !== createDebug.outputFormatters.m) {
				const val = args[index];
				match = formatter.call(this, format, val);

				// Now we need to remove `args[index]` since it's inlined in the `format`
				args.splice(index, 1);
				index--;
			}
			return match;
		});

		return args;
	};

	/**
	 * Map %+ to humanize()'s defaults (1000ms diff => "1s")
	 */
	createDebug.outputFormatters['+'] = function () {
		return '+' + createDebug.humanize(this.diff);
	};

	/**
	 * Map %d to returning milliseconds
	 */
	createDebug.outputFormatters.d = function () {
		return '+' + this.diff + 'ms';
	};

	/**
	 * Map %n to outputting namespace prefix
	 */
	createDebug.outputFormatters.n = function () {
		return this.namespace;
	};

	/**
	 * Map %_time to handling time...?
	 */
	createDebug.outputFormatters._time = function (format) {
		// Browser doesn't have date
		return new Date().toISOString();
	};

	/**
	* Map of meta-formatters which are applied to outputFormatters
	*/
	createDebug.metaFormatters = {};

	/**
	 * Map %j* to `JSON.stringify()`.
	 */
	createDebug.outputFormatters.j = function (_, v) {
		console.warn("handle j+:", arguments);
		try {
			return JSON.stringify(v);
		} catch (error) {
			return '[UnexpectedJSONStringifyError]: ' + error.message;
		}
	};

	/**
	 * Map %J* to `JSON.stringify(obj, null, 2)`, i.e. formatted JSON output.
	 */
	createDebug.outputFormatters.J = function (_, v) {
		console.warn("handle J:", arguments);
		try {
			return JSON.stringify(v, null, 2);
		} catch (error) {
			return '[UnexpectedJSONStringifyError]: ' + error.message;
		}
	};

	/**
	 * Map %c* to to `applyColor()`
	 */
	createDebug.outputFormatters.c = function (_, v) {
		if (this.useColors) {
			return this.applyColor(v);
		} else {
			return v;
		}
	};

	/**
	 * Map %C* to to `applyColor(arg, bold = true)` (node)
	 */
	createDebug.outputFormatters.C = function (_, v) {
		if (this.useColors) {
			return this.applyColor(v, true);
		} else {
			return v;
		}
	};

	/**
	* Selects a color for a debug namespace
	* @param {String} namespace The namespace string for the for the debug instance to be colored
	* @return {Number|String} An ANSI color code for the given namespace
	* @api private
	*/
	function selectColor(namespace) {
		let hash = 0;

		for (let i = 0; i < namespace.length; i++) {
			hash = ((hash << 5) - hash) + namespace.charCodeAt(i);
			hash |= 0; // Convert to 32bit integer
		}

		return createDebug.colors[Math.abs(hash) % createDebug.colors.length];
	}

	createDebug.selectColor = selectColor;

	/**
	* Create a debugger with the given `namespace`.
	*
	* @param {String} namespace
	* @return {Function}
	* @api public
	*/
	function createDebug(namespace) {
		let prevTime;
		const value = createDebug.instances[namespace];

		if (value !== undefined) {
			return value;
		}

		function debug(...args) {
			// Disabled?
			if (!debug.enabled) {
				return;
			}

			const self = debug;

			// Set `diff` timestamp
			const curr = Number(new Date());
			const ms = curr - (prevTime || curr);
			self.diff = ms;
			self.prev = prevTime;
			self.curr = curr;
			prevTime = curr;

			// Apply relevant `outputFormatters` to `format`
			const reg = /%([a-zA-Z+]+|[a-zA-Z]*?\{.+\})/;
			let formattedArgs = [];
			let res;
			let outputFormat = self.format; // Make a copy of the format
			console.warn("outputFormat:", outputFormat);
			while (res = outputFormat.match(reg)) {
				let [matched, formatToken] = res;
				let formatter;
				let formatted;
				console.warn("outputFormat MATCH:", {matched, formatToken});

				// Split out the part before the matched format token
				const split = outputFormat.slice(0, res.index);
				outputFormat = outputFormat.slice(res.index + matched.length);

				// And add it to the arguments
				if (split.length > 0) {
					formattedArgs.push(split);
				}

				// Map of meta-formatters which are applied to outputFormatters
				const metaFormatters = [];
				// Extract metaformatters
				while (formatToken.length > 1 && !formatToken.startsWith('{')) {
					const metaFormatterToken = formatToken.slice(0, 1);
					formatToken = formatToken.slice(1);
					console.warn("metaFormatterToken MATCH:", {metaFormatterToken, formatToken});
					metaFormatters.push(metaFormatterToken);
				}

				// Not really sure how to handle time at this point
				console.warn("formatToken FINAL:", formatToken);
				if (formatToken.startsWith('{')) {
					formatter = createDebug.outputFormatters._time;
				} else {
					formatter = createDebug.outputFormatters[formatToken];
				}
				console.warn("formatter:", typeof formatter);
				// When there's no formatter function, we won't be producing any output,
				// hence we do not want that failure to go by silently as this is surely a 
				// coding/configuration bug: throw an error.
				if (typeof formatter !== 'function') {
					throw new Error(`Unsupported format specification: '${matched}'`);
				}
				formatted = formatter.call(self, formatToken, args);

				// Apply metaFormatters
				metaFormatters.forEach(metaFormat => {
					const metaFormatter = createDebug.metaFormatters[metaFormat];
					console.warn("metaFormatter:", {metaFormat, formatted, fn: typeof metaFormatter});
  				// We don't want to silently skip absent/undefined metaFormatters
				  // as this is quite probably a coding/configuration bug: 
          // hence we throw an error.
				  if (typeof metaFormatter !== 'function') {
					  throw new Error(`Unsupported meta format: '${metaFormat}' in the format specification '${matched}'`);
				  }
					formatted = metaFormatter.call(self, metaFormat, formatted);
				});

				console.warn("formatted:", formatted);
				if (Array.isArray(formatted)) { // Intended to concatenate %m's args in the middle of the format
					formattedArgs = formattedArgs.concat(formatted);
				} else {
					formattedArgs.push(formatted);
				}
			}

			const logFn = self.log || createDebug.log;
			logFn.apply(self, formattedArgs);
		}

		debug.namespace = namespace;
		debug.enabled = createDebug.enabled(namespace);
		debug.useColors = createDebug.useColors();
		debug.format = createDebug.getFormat() || '%{H:M-Z}%n%m%+'; // '  %n%m%+'
		debug.color = selectColor(namespace);
		debug.applyColor = createDebug.applyColor.bind(debug);
		debug.destroy = destroy;
		debug.extend = extend;
		// Debug.formatArgs = formatArgs;
		// debug.rawLog = rawLog;

		// env-specific initialization logic for debug instances
		if (typeof createDebug.init === 'function') {
			createDebug.init(debug);
		}

		createDebug.instances[namespace] = debug;

		return debug;
	}

	function destroy() {
    let rv = false;
    
		if (createDebug.instances[this.namespace] !== undefined) {
  		if (createDebug.instances[this.namespace] !== this) {
        throw new Error('Trying to destroy an already destroyed instance.');
      }
			delete createDebug.instances[this.namespace];
      rv = true;
		}

		// nuke instance methods to ensure any subsequent call to debug~log will cause a crash!
		
		function mkmsg(fn) {
			throw new Error(fn + '() invocated after debug instance has been destroyed');
		}

		this.log = function logInvocatedAfterBeingDestroyed() {
			mkmsg('log');
		};
		this.extend = function extendInvocatedAfterBeingDestroyed() {
			mkmsg('extend');
		};
		this.enabled = true; // make sure debug(...) executes the instance-specific log function

		return rv;
	}

	function extend(namespace, delimiter) {
		const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace);
		newDebug.log = this.log;
		return newDebug;
	}

	/**
	* Enables a debug mode by namespaces. This can include modes
	* separated by a colon and wildcards.
	*
	* @param {String} namespaces
	* @api public
	*/
	function enable(namespaces, options) {
		options = options || {};

		createDebug.save(namespaces);

		if (!options.append && options.append !== undefined) {
			createDebug.names = [];
			createDebug.skips = [];
		}

		createDebug.names = createDebug.names || [];
		createDebug.skips = createDebug.skips || [];

		const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
		const len = split.length;

		for (let i = 0; i < len; i++) {
			if (!split[i]) {
				// ignore empty strings
				continue;
			}

			namespaces = split[i].replace(/[.?$^()+{}[\]|/\\]/g, '\\$&').replace(/\*/g, '.*?');

			if (namespaces[0] === '-') {
				namespaces = namespaces.substr(1);
				const re = new RegExp('^' + namespaces + '$');
				createDebug.skips.push(re);
				// When you SKIP a namespace, it SHOULD NOT be part of the inclusive `names` list anymore.
				// Hence the (contrived) namespaces spec 'a,-a,a' should end up as namespace 'a' being ENABLED!
				const s = re.toString();
				createDebug.names = createDebug.names.filter(el => {
					return el.toString() !== s;
				});
			} else {
				const re = new RegExp('^' + namespaces + '$');
				createDebug.names.push(re);
				// When you SKIP a namespace, it SHOULD NOT be part of the inclusive `names` list anymore.
				// Hence the (contrived) namespaces spec 'a,-a,a' should end up as namespace 'a' being ENABLED!
				const s = re.toString();
				createDebug.skips = createDebug.skips.filter(el => {
					return el.toString() !== s;
				});
			}
		}

		const keys = Object.keys(createDebug.instances);

		for (let i = 0; i < keys.length; i++) {
			const instance = createDebug.instances[keys[i]];
			instance.enabled = createDebug.enabled(instance.namespace);
		}
	}

	/**
	* Disable debug output.
	*
	* @return {String} namespaces
	* @api public
	*/
	function disable() {
		const namespaces = [
			...createDebug.names.map(toNamespace),
			...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
		].join(',');
		createDebug.names = [];
		createDebug.skips = [];
		return namespaces;
	}

	/**
	* Returns true if the given mode name is enabled, false otherwise.
	*
	* @param {String} name
	* @return {Boolean}
	* @api public
	*/
	function enabled(name) {
		if (name === '*') {
			return createDebug.names.length > 0;
		}

		for (let i = 0, len = createDebug.skips.length; i < len; i++) {
			if (createDebug.skips[i].test(name)) {
				return false;
			}
		}

		for (let i = 0, len = createDebug.names.length; i < len; i++) {
			if (createDebug.names[i].test(name)) {
				return true;
			}
		}

		return false;
	}

	/**
	* Convert regexp to namespace
	*
	* @param {RegExp} regxep
	* @return {String} namespace
	* @api private
	*/
	function toNamespace(regexp) {
		return regexp.toString()
			.substring(2, regexp.toString().length - 2)
			.replace(/\.\*\?$/, '*');
	}

	/**
	* Coerce `val`.
	*
	* @param {Mixed} val
	* @return {Mixed}
	* @api private
	*/
	function coerce(val) {
		if (val instanceof Error) {
			return val.stack || (val.name + ': ' + val.message);
		}

		return val;
	}

	createDebug.enable(createDebug.load());

	return createDebug;
}

module.exports = setup;
