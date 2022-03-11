const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const HttpError = require('./helpers/http-error')

const usersRoutes = require('./routes/users-routes')

const app = express()

app.use(bodyParser.json())

// CORS settings
app.use((req, res, next) => { 
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:9001') // '*'
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization') // '*'
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')
  next()
})

app.use('/api/users', usersRoutes)

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404)
  throw error
}) // if route 404

app.use((error, req, res, next) => { // this function will activates only in case of something from above went wrong
  if (res.headerSent) { // if we alredy sent 'res'
    return next(error)
  }

  res.status(error.code || 500).json({ message: error.message || 'An unknown error occured!' })
})

mongoose
  .connect('mongodb+srv://Andrey:w4oHzEqQbJlQZqN5@library-app-cluster.ojgsg.mongodb.net/libraryApp?retryWrites=true&w=majority')
  .then(() => {
    app.listen(9000)
    console.log('App started on PORT 9000')
  })
  .catch(err => {
    console.log(err)
  })