var assert = require('assert'),
	nock = require('nock');

var client = require('./../');

suite('express middleware:', function(){
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

	test('with configuration parameter', function(done){
		nock('http://foobar.com')
			.get('/v1/json/')
			.reply(200, replyJSON);

		var req = {
			headers: {
				'host': 'foobar.com',
				'user-agent': 'FooBar UA'
			},
			connection: {
				remoteAddress: '192.168.10.10'
			}
		};

		client.middleware({
			host: 'foobar.com',
			apiKey: apiKey
		})(req, null, function(err){
			assert.ifError(err);
			assert.equal(client.config.apiKey, apiKey);
			assert.equal(client.config.username, apiKey.split(':')[0]);
			assert.equal(client.config.password, apiKey.split(':')[1]);
			assert.deepEqual(req.capabilities, replyJSON.capabilities);
			client.config = null;
			done();
		});
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

		var req = {
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
			connection: {
				remoteAddress: '192.168.10.10'
			}
		};

		client.middleware()(req, null, function(err){
			assert.ifError(err);
			assert.deepEqual(req.capabilities, replyJSON.capabilities);
			client.config = null;
			done();
		});
	});
});
