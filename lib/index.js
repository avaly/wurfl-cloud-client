var assign = require('lodash.assign'),
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
			headers: assign({
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

		client.config = assign(assign({}, defaultConfig), configuration);

		if (client.config.apiKey) {
			parts = client.config.apiKey.split(':');
			client.config.username = parts[0];
			client.config.password = parts[1];
		}
	},

	detectDevice: function(ua, callback) {
		internal.cached(ua, function(err, result){
			if (err || !result) {
				internal.requestFromCloud(ua, {}, callback);
			}
			else {
				callback(null, result);
			}
		});
	}

};
