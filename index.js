const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const app = express()

app.use(bodyParser.json())

// CORS settings
app.use((req, res, next) => { 
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9001') // '*'
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept') // '*'
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next()
})

mongoose
  .connect('mongodb+srv://Andrey:w4oHzEqQbJlQZqN5@library-app-cluster.ojgsg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority')
  .then(() => {
    app.listen(9000)
    console.log('App started on PORT 9000')
  })
  .catch(err => {
    console.log(err)
  })