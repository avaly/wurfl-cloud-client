var assert = require('assert');

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
			ttl: 2592000
		});
	});
});
