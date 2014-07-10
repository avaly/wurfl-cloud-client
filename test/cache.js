var assert = require('assert'),
	nock = require('nock');

var client = require('./../');

suite('cache:', function(){
	setup(function(){
		var context = this;

		client.configure({
			host: 'foobar.com',
			apiKey: 'abc:123',
			ttl: 12345
		});

		context.cached = {
			key: null,
			value: null,
			ttl: null
		};
		client.cache = {
			get: function(key, callback){
				if (context.cached.key === key) {
					callback(null, context.cached.value);
				}
				else {
					callback(null, false);
				}
			},
			set: function(key, value, ttl){
				context.cached.key = key;
				context.cached.value = value;
				context.cached.ttl = ttl;
			}
		};

		context.replyJSON = {
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
		context.result = {
			id: 'generic_ms_phone_os7_5',
			capabilities: {
				is_wireless_device: true,
				mobile_browser: 'IEMobile',
				pointing_method: 'touchscreen',
				device_os: 'Windows Phone OS'
			},
			errors: {}
		};
	});

	teardown(function(){
		client.config = null;
		client.cache = null;
	});

	test('save response', function(done){
		var context = this;

		nock('http://foobar.com').get('/v1/json/').reply(200, context.replyJSON);

		client.detectDevice('FooBar', function(err, result){
			assert.ifError(err);
			assert.deepEqual(context.cached.key, 'device:FooBar');
			assert.deepEqual(context.cached.value, context.result);
			assert.deepEqual(context.cached.ttl, 12345);
			done();
		});
	});

	test('use result from cache', function(done){
		var context = this;

		context.cached.key = 'device:FooBar';
		context.cached.value = context.result;

		client.detectDevice('FooBar', function(err, result){
			assert.ifError(err);
			assert.deepEqual(result, context.result);
			done();
		});
	});
});
