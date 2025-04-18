// Rename this sample file to main.js to use on your project.
// The main.js file will be overwritten in updates/reinstalls.

var rn_bridge = require('rn-bridge');

// Echo every message received from react-native.
rn_bridge.channel.on('message', (msg) => {
  rn_bridge.channel.send(msg);
} );

rn_bridge.channel.send("Node was initialized.");
rn_bridge.channel.send(`Node was initialized a`);
rn_bridge.channel.send(`Node was initialized b`);
rn_bridge.channel.send(`Node was initialized c`);


for (let i = 0; i < 5; i++) {
  setTimeout(() => {
    rn_bridge.channel.send(`Node was initialized ${i}`);
  }, i * 5000); // sends every 5 seconds
}