const mqttService = require('./mqttService');

test('mqttService should connect successfully', () => {
	expect(mqttService.connect()).toBe(true);
});

test('mqttService should publish messages', () => {
	const result = mqttService.publish('test/topic', 'Hello World');
	expect(result).toBe('Message published');
});

test('mqttService should subscribe to topics', () => {
	const result = mqttService.subscribe('test/topic');
	expect(result).toBe('Subscribed to test/topic');
});