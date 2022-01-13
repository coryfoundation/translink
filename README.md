# translink
A high-level API for connecting nodes together using **P2P** and **DHT** technologies without using queues (NATS/RabbitMQ/Kafka/etc.) and intermediate servers. Just connect.

All messages are encrypted with **end-to-end encryption**. (more: http://hypercore-protocol.org)

Using **[`Hyperswarm`](https://github.com/hyperswarm/hyperswarm)**
## Installation
```
npm install translink
```

## Usage
**Join to network**
```js
import Translink from 'translink'
const bridge = new Translink({ namespace: 'my-simple-namespace' })

// Subscribes, events, gets, ...

await bridge.connect()

```

**Subscribe to event**
```js
bridge.subscribe('my.event', async (payload) => {
  // Something to do
})
```

**Subscribe to request**
```js
bridge.subscribeReq('my.request', async (payload) => {
  // Something to do
  return { something: 'result' }
})
```

**Emit event**
```js
bridge.emit('my.event', { something: 'data' })
```

**Make request**
```js
bridge.get('my.request', { something: 'data' })
.then((result) => {
  // Something to do
}).catch((error) => {
  console.error('Error', error)
})
```

## Replic nodes
You can duplicate nodes with the same subscriptions an infinite number of times. Translink will send a message to a random available node.

(the main thing is that the namespace and the route index in the subscription name match (**my**.event))

## License
MIT
