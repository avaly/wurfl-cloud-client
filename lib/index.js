var _ = require('underscore'),
	request = require('request');

// Default configuration
var defaultConfig = {
	host: 'api.wurflcloud.com',
	apiKey: '',
	username: '',
	password: '',
	capabilities: [],
	timeout: 2000, // milliseconds to wait for the server to respond
	ttl: 30 * 24 * 3600 // 30 days
};

var HEADERS_MAP = {
	'accept': 'X-Accept',
	'x-wap-profile': 'x-wap-profile',
	'profile': 'x-wap-profile',
	'x-device-user-agent': 'X-Device-User-Agent',
	'x-original-user-agent': 'X-Original-User-Agent',
	'x-operamini-phone-ua': 'X-OperaMini-Phone-UA',
	'x-skyfire-phone': 'X-Skyfire-Phone',
	'x-bolt-phone-ua': 'X-Bolt-Phone-UA'
};

// Internal API
var internal = {

	version: require('./../package.json').version,

	requestFromCloud: function(ua, headers, callback){
		var requestOptions = {
			uri: 'http://' + client.config.host + '/v1/json/',
			auth: {
				username: client.config.username,
				password: client.config.password
			},
			headers: _.extend({
				'User-Agent': ua,
				'X-Cloud-Client': 'nodejs/wurfl-cloud-client ' + internal.version
			}, headers || {}),
			gzip: true,
			timeout: client.config.timeout
		};

		request(requestOptions, function(err, response, body){
			var data;

			if (err) {
				return callback(err);
			}
			if (response.statusCode !== 200) {
				return callback(body);
			}

			try {
				data = JSON.parse(body);

				delete data.apiVersion;
				delete data.mtime;
				internal.cache(ua, data);

				callback(null, data);
			}
			catch(e) {
				callback(e);
			}
		});
	},

	prepareHeaders: function(req){
		var headers = [],
			ip = (
				req.connection && req.connection.remoteAddress ?
				req.connection.remoteAddress : // express
				(
					req.info && req.info.remoteAddress ?
					req.info.remoteAddress :  // hapi
					null
				)
			);

		headers['x-forwarded-for'] = ip;
		if (req.headers['x-forwarded-for']) {
			headers['x-forwarded-for'] += ',' + req.headers['x-forwarded-for'];
		}

		_.each(HEADERS_MAP, function(resKey, reqKey){
			if (req.headers[reqKey]) {
				headers[resKey] = req.headers[reqKey];
			}
		});

		return headers;
	},

	cached: function(ua, callback) {
		if (client.cache) {
			client.cache.get('device:' + ua.replace(/[:\s]/g, '_'), callback);
		}
		else {
			callback(null, false);
		}
	},

	cache: function(ua, device) {
		if (client.cache) {
			client.cache.set('device:' + ua.replace(/[:\s]/g, '_'), device, client.config.ttl);
		}
	}

};

/**
 * WURFL Cloud client module
 *
 * @class WURFLCloudClient
 */
var client = module.exports = {

	/**
	 * The config object
	 *
	 * @property config
	 * @type {Object}
	 */
	config: null,

	/**
	 * The cache interface used to save detections results.
	 *
	 * The implementation of the cache layer is left up to the application using this module.
	 *
	 * All it needs to expose in this interface is two methods: `get` and `set`.
	 *
	 * The cache key will be set to `device:UA` where `UA` is the User-Agent string with
	 * all instances of the `:` character replaced by `_`, to play nice with Redis keys.
	 *
	 * The TTL for storing these cached values can be defined in the configuration, default is 30 days.
	 *
	 * @example
	 *
	 *     client.cache = {
	 *         get: function(key, callback) {},
	 *         set: function(key, value, ttl) {}
	 *     };
	 *
	 * @property cache
	 * @type {Object}
	 */
	cache: null,

	/**
	 * Configure the module
	 *
	 * An API key can be either sent as `apiKey` in `username:password` format
	 * or as individual `username` and `password` properties.
	 *
	 * @example
	 *
	 *     client.configure({
	 *         host: 'custom-wurfl-cloud-host.com',
	 *         apiKey: 'foobar:1234567890'
	 *     });
	 *
	 *     client.configure({
	 *         username: 'foobar',
	 *         password: '1234567890'
	 *     });
	 *
	 * @static
	 * @method configure
	 * @param  {Object} configuration
	 */
	configure: function(configuration) {
		var parts;

		client.config = _.extend({}, defaultConfig, configuration);

		if (client.config.apiKey) {
			parts = client.config.apiKey.split(':');
			client.config.username = parts[0];
			client.config.password = parts[1];
		}
	},

	/**
	 * Detect a device by user agent
	 *
	 * @example
	 *
	 *     client.detectDevice(userAgent, function(err, result) {
	 *         // result is part of the response from WURFL cloud
	 *     });
	 *
	 *     client.detectDevice(userAgent, {
	 *         'X-Extra-Header': 'Wow!'
	 *     }, function(err, result) {
	 *         // result is part of the response from WURFL cloud
	 *     });
	 *
	 * @static
	 * @method detectDevice
	 * @param  {String}   ua       User Agent string
	 * @param  {Object}   [headers]  Extra HTTP headers
	 * @param  {Function} callback Callback gets called with `(err, result)`
	 */
	detectDevice: function(ua, headers, callback) {
		if (!client.config) {
			client.configure({});
		}
		if (!arguments[2]) {
			callback = headers;
			headers = {};
		}
		if (!ua) {
			return callback(new Error('[wurfl-cloud-client] No User-Agent sent'), null);
		}

		internal.cached(ua, function(err, result){
			if (err || !result) {
				internal.requestFromCloud(ua, headers, callback);
			}
			else {
				callback(null, result);
			}
		});
	},

	/**
	 * Middleware for `connect`/`express`-based applications.
	 *
	 * It populates a `capabilities` on the `request` parameter,
	 * containing the `capabilities` object from the WURFL Cloud response.
	 *
	 * @example
	 *
	 *     var app = express();
	 *     app.use(client.middleware({
	 *         apiKey: '...'
	 *     }));
	 *     app.get('/', function(req) {
	 *         // req.capabilities is populated now
	 *     });
	 *
	 * @static
	 * @method middleware
	 * @param  {Object} [configuration]
	 * @return {Function} The middleware function that takes in the arguments `(req, res, next)`
	 */
	middleware: function(configuration){
		if (!client.config || configuration) {
			client.configure(configuration);
		}

		return function(req, res, next) {
			client.detectDevice(
				req.headers['user-agent'],
				internal.prepareHeaders(req),
				function(err, result){
					if (!err && result && result.capabilities) {
						req.capabilities = result.capabilities;
					}
					next();
				}
			);
		};
	},

	/**
	 * [Hapi](http://hapijs.com/) 8+ plugin
	 *
	 * It populates a `capabilities` on the `request` parameter,
	 * containing the `capabilities` object from the WURFL Cloud response.
	 *
	 * If the config TTL option is set, it uses the caching interface
	 * exposed by Hapi to plugins via [`plugin.cache`](http://hapijs.com/api#plugincacheoptions).
	 *
	 * @example
	 *
	 *     var Hapi = require('hapi');
	 *     var server = new Hapi.Server();
	 *     server.register({
	 *         register: require('wurfl-cloud-client'),
	 *         options: {
	 *             apiKey: '...'
	 *         }
	 *     });
	 *     server.route({
	 *         method: 'GET',
	 *         path: '/',
	 *         handler: function(request, reply) {
	 *             // request.capabilities is populated now
	 *         }
	 *     });
	 *
	 * @static
	 * @method register
	 * @param  {Hapi} server
	 * @param  {Object} options
	 * @param  {Function} next
	 */
	register: function(server, options, next) {
		var cache;

		if (!client.config || options) {
			client.configure(options);
		}

		if (client.config.ttl) {
			cache = server.cache({
				expiresIn: client.config.ttl * 1000
			});
			// Overriding caching interface because Hapi returns
			// an object containing the cached value in a `item` attribute.
			client.cache = {
				get: function(key, cb) {
					cache.get(key, function(err, cached) {
						if (err) {
							return cb(err);
						}
						cb(null, cached);
					});
				},
				set: cache.set.bind(cache)
			};
		}

		server.ext('onRequest', function(request, reply) {
			client.detectDevice(
				request.headers['user-agent'],
				internal.prepareHeaders(request),
				function(err, result){
					if (!err && result && result.capabilities) {
						request.capabilities = result.capabilities;
					}
					reply.continue();
				}
			);
		});

		next();
	}

};

module.exports.register.attributes = {
	pkg: require('../package.json')
};
