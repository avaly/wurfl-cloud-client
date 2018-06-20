var assert = require('assert'),
	nock = require('nock');

var client = require('./../');

suite('configure:', function(){
	setup(function(){
		client.config = null;
	});

	test('split apiKey in username and password', function(){
		client.configure({
			apiKey: 'abc:123'
		});
		assert.equal(client.config.apiKey, 'abc:123');
		assert.equal(client.config.username, 'abc');
		assert.equal(client.config.password, '123');
	});

	test('override defaults', function(){
		client.configure({
			host: 'foobar.com'
		});
		assert.deepEqual(client.config, {
			host: 'foobar.com',
			apiKey: '',
			username: '',
			password: '',
			capabilities: [],
			timeout: 2000,
			ttl: 2592000
		});
	});

	test('initialize in deviceDetect', function(done){
		nock('http://api.wurflcloud.com').get('/v1/json/').reply(200, {});

		client.detectDevice('UA', function(err, result){
			assert.ifError(err);
			assert.notEqual(client.config, {});
			assert.equal(client.config.host, 'api.wurflcloud.com');
			done();
		});
	});

});
