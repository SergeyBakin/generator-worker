# Generator-Worker
Lightweight application works on the server side, which exchanges messages between servers via redis db. The first running script is a generator, that sends messages to the redis server for other servers. The other running copies are listeners(workers) and they receive these messages that are not duplicated. If the generator was failed, then one from listeners will becoming generator. In this project using generator random messages and errors.

## Installation Guide
1. Install `node.js >= v6.x.x`
2. Install `redis` db
3. Clone project to specific folder
4. Run command `npm install`

## Launch

You can run multiple copies of the script. You can see the work in real time if you put a command `console.log()`.

1. Run `node appTimer.js`, this is first method, the speed to send is approximately 1000 messages per second.
2. Run `node appWhilst.js`, this is second method, the speed to send is approximately 20 000 messages per second.
3. Run `node appPubSub.js`, this is third method, the method use Publish / Subscribe, attention, it is very quikly work.
4. Run `node appTimer.js getErrors`, and you will get all errors.
