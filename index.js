const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const app = express()

app.use(bodyParser.json())

mongoose
  .connect('mongodb+srv://Andrey:w4oHzEqQbJlQZqN5@library-app-cluster.ojgsg.mongodb.net/myFirstDatabase?retryWrites=true&w=majority')
  .then(() => {
    app.listen(9000)
    console.log('App started on PORT 9000')
  })
  .catch(err => {
    console.log(err)
  })