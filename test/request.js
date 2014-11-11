var assert = require('assert'),
	nock = require('nock');

var client = require('./../');

suite('request from server:', function(){
	setup(function(){
		client.configure({
			host: 'foobar.com',
			apiKey: 'abc:123'
		});
		this.nock = nock('http://foobar.com').get('/v1/json/');
	});

	teardown(function(){
		client.config = null;
	});

	test('receive correct JSON', function(done){
		this.nock
			.matchHeader(
				'Authorization',
				'Basic ' + new Buffer(client.config.apiKey).toString('base64')
			)
			.matchHeader('User-Agent', 'FooBar UA')
			.matchHeader('X-Cloud-Client', /nodejs\/wurfl-cloud-client [\d\.]+/)
			.matchHeader('X-Custom', 'foobar')
			.reply(200, {
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
			});

		client.detectDevice('FooBar UA', {
			'X-Custom': 'foobar'
		}, function(err, result){
			assert.ifError(err);
			assert.deepEqual(result, {
				id: 'generic_ms_phone_os7_5',
				capabilities: {
					is_wireless_device: true,
					mobile_browser: 'IEMobile',
					pointing_method: 'touchscreen',
					device_os: 'Windows Phone OS'
				},
				errors: {}
			});
			done();
		});
	});

	test('receive bad JSON', function(done){
		this.nock.reply(200, '{"foo');

		client.detectDevice('FooBar', function(err){
			assert.equal(err.constructor, SyntaxError);
			done();
		});
	});

	test('receive bad response code', function(done){
		this.nock.reply(400, {
			error: 'Error message here'
		});

		client.detectDevice('FooBar', function(err){
			assert.equal(err, '{"error":"Error message here"}');
			done();
		});
	});

	test('no User-Agent sent', function(done) {
		client.detectDevice(undefined, function(err){
			assert.ok(err instanceof Error);
			done();
		});
	})

	suite('fail request', function(){
		setup(function(){
			client.configure({
				host: 'unlikely-host-name-aweasd.com',
				apiKey: 'abc:123'
			});
		});

		test('return request error', function(done){
			client.detectDevice('FooBar', function(err){
				assert.equal(err.constructor, Error);
				assert.equal(err.code, 'ENOTFOUND');
				done();
			});
		});
	});
});
