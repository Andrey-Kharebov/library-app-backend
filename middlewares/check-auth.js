// Udemy Mern 12 - 179
const jwt = require('jsonwebtoken')

const HttpError = require('../helpers/http-error')

module.exports = (req, res, next) => {
  try {
    if (req.method === 'OPTIONS') { // when we use 'POST', then method will be OPTIONS / Udemy Mern 12 - 180
      return next()
    }
    // we allowed 'Authorization' header in CORS settings (not key sensitive)
    const token = req.headers.authorization.split(' ')[1] // Authorization 'Bearer TOKEN'
    
    if (!token) {
      throw new Error('Authentication failed!')
    }

    const decodedToken = jwt.verify(token, 'supersecret_dont_share')
    req.userData = { userId: decodedToken.userId }
    next()
  } catch (err) {
    const error = new HttpError('Authentication failed!', 403)
    return next(error)
  }
}
