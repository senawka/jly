const { ShardingManager } = require('discord.js');
require('dotenv').config();

const manager = new ShardingManager('./src/index.js', {
    token: process.env.TOKEN,
    totalShards: 'auto',
});

manager.on('shardCreate', shard => {
    console.log(`Launched shard ${shard.id}`);
});

manager.spawn();