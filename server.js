const express = require('express');
const socketio = require('socket.io');
require('dotenv');


const app = express();
const port = process.env.SRV_PORT || 3000;

app.get('/ping',(req,res)=>res.send('alive'));

const server = app.listen(port,()=>console.log(`App listening on port ${port}`));