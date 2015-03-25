var assert = require('assert'),
	nock = require('nock');

var client = require('./../');

suite('hapi:', function(){
	var apiKey = 'abc:123',
		replyJSON = {
			apiVersion: 'WurflCloud 1.5.0.2',
			mtime: 1403122184,
			id: 'generic_ms_phone_os7_5',
			capabilities: {
				is_wireless_device: true,
				mobile_browser: 'IEMobile',
				pointing_method: 'touchscreen',
				device_os: 'Windows Phone OS'
			},
			errors:{}
		};

	setup(function() {
		this.server = {
			cache: function() {
				return {
					get: function(key, cb) {
						cb(null, null);
					},
					set: function() {
					}
				};
			}
		};
	});

	teardown(function() {
		client.config = null;
		client.cache = null;
	});

	test('with configuration parameter', function(done){
		nock('http://foobar.com').get('/v1/json/').reply(200, replyJSON);

		var request = {
				headers: {
					'host': 'foobar.com',
					'user-agent': 'FooBar UA'
				},
				info: {
					remoteAddress: '192.168.10.10'
				}
			};

		this.server.ext = function(event, callback) {
			var replyMock = {
				continue: function() {
					assert.equal(client.config.apiKey, apiKey);
					assert.equal(client.config.username, apiKey.split(':')[0]);
					assert.equal(client.config.password, apiKey.split(':')[1]);
					assert.deepEqual(request.capabilities, replyJSON.capabilities);
					done();
				}
			};

			callback(request, replyMock);
		};

		client.register(this.server, {
			host: 'foobar.com',
			apiKey: apiKey
		}, function() {});
	});

	test('transform headers', function(done){
		client.configure({
			host: 'foobar.com',
			apiKey: apiKey
		});

		nock('http://foobar.com')
			.get('/v1/json/')
			.matchHeader('x-forwarded-for', '192.168.10.10,192.168.50.50')
			.matchHeader('x-accept', '111')
			.matchHeader('x-wap-profile', '222')
			.matchHeader('x-device-user-agent', '333')
			.matchHeader('x-original-user-agent', '444')
			.matchHeader('x-operamini-phone-ua', '555')
			.matchHeader('x-skyfire-phone', '666')
			.matchHeader('x-bolt-phone-ua', '777')
			.reply(200, replyJSON);

		var request = {
				headers: {
					'host': 'foobar.com',
					'user-agent': 'FooBar UA',
					'x-forwarded-for': '192.168.50.50',
					'accept': '111',
					'x-wap-profile': '222',
					'x-device-user-agent': '333',
					'x-original-user-agent': '444',
					'x-operamini-phone-ua': '555',
					'x-skyfire-phone': '666',
					'x-bolt-phone-ua': '777'
				},
				info: {
					remoteAddress: '192.168.10.10'
				}
			};

		this.server.ext = function(event, callback) {
			var replyMock = {
				continue: function() {
					assert.deepEqual(request.capabilities, replyJSON.capabilities);
					done();
				}
			};

			callback(request, replyMock);
		};

		client.register(this.server, null, function() {});
	});
});
