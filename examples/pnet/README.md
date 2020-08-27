# Private Networking
This example shows how to set up a private network of libp2p nodes.

## Setup
1. Install the modules in the libp2p root directory, `npm install`.

## Run
Running the example will cause two nodes with the same swarm key to be started and exchange basic information.

```
node index.js
```

### Using different keys
This example includes `TASK` comments that can be used to try the example with different swarm keys. This will
allow you to see how nodes will fail to connect if they are on different private networks and try to connect to
one another.

To change the swarm key of one of the nodes, look through `index.js` for comments starting with `TASK` to indicate
where lines are that pertain to changing the swarm key of node 2.

### Exploring the repos
Once you've run the example you can take a look at the repos in the `./tmp` directory to see how they differ, including
the swarm keys. You should see a `swarm.key` file in each of the repos and when the nodes are on the same private network
this contents of the `swarm.key` files should be the same.
