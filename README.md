# translink
A high-level API for connecting nodes together using **P2P** and **DHT** technologies without using queues (NATS/RabbitMQ/Kafka/etc.) and intermediate servers. Just connect.

All messages are encrypted with **end-to-end encryption**. (more: http://hypercore-protocol.org)

Using **[`Hyperswarm`](https://github.com/hyperswarm/hyperswarm)**
## Installation
```
npm install @coryfoundation/translink
```

## Usage
**Join to network**
```js
import Translink from '@coryfoundation/translink'
const bridge = new Translink({ namespace: 'my-simple-namespace' })

// Subscriptions, events, gets, ...

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

**Broadcast event to nodes with same event**
```js
bridge.broadcast('my.event', { something: 'data' })
```

**Broadcast event to all nodes**
```js
bridge.broadcastToAllNodes('my.event', { something: 'data' })
```

## Replic nodes
You can duplicate nodes with the same subscriptions an infinite number of times. Translink will send a message to a random available node.

## License
MIT
