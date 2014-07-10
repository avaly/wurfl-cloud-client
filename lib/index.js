var _assign = require('lodash.assign'),
	_each = require('lodash.foreach'),
	request = require('request');

// Default configuration
var defaultConfig = {
	host: 'api.wurflcloud.com',
	apiKey: '',
	username: '',
	password: '',
	capabilities: [],
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
			headers: _assign({
				'User-Agent': ua,
				'X-Cloud-Client': 'nodejs/wurfl-cloud-client ' + internal.version
			}, headers || {}),
			gzip: true
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
			ip = req.connection.remoteAddress;

		headers['x-forwarded-for'] = ip;
		if (req.headers['x-forwarded-for']) {
			headers['x-forwarded-for'] += ',' + req.headers['x-forwarded-for'];
		}

		_each(HEADERS_MAP, function(resKey, reqKey){
			if (req.headers[reqKey]) {
				headers[resKey] = req.headers[reqKey];
			}
		});

		return headers;
	},

	cached: function(ua, callback) {
		if (client.cache) {
			client.cache.get('device:' + ua, callback);
		}
		else {
			callback(null, false);
		}
	},

	cache: function(ua, device) {
		if (client.cache) {
			client.cache.set('device:' + ua, device, client.config.ttl);
		}
	}

};

// Extenal API
var client = module.exports = {

	config: null,
	cache: null,

	configure: function(configuration) {
		var parts;

		client.config = _assign(_assign({}, defaultConfig), configuration);

		if (client.config.apiKey) {
			parts = client.config.apiKey.split(':');
			client.config.username = parts[0];
			client.config.password = parts[1];
		}
	},

	detectDevice: function(ua, headers, callback) {
		if (!client.config) {
			client.configure({});
		}

		if (!arguments[2]) {
			callback = headers;
			headers = {};
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

	middleware: function(configuration){
		if (!client.config || configuration) {
			client.configure(configuration);
		}

		return function(req, res, next) {
			client.detectDevice(
				req.headers['user-agent'],
				internal.prepareHeaders(req),
				function(err, result){
					if (!err && result.capabilities) {
						req.capabilities = result.capabilities;
					}
					next();
				}
			);
		};
	}

};
