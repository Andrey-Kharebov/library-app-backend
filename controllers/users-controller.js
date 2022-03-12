const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../helpers/http-error')

const User = require('../models/user')

const getUsers = async (req, res, next) => {
  let users 

  try {
    users = await User.find({}, '-password')
  } catch (err) {
    const error = new HttpError('Fetching users failed, please try again later.', 500)
    return next(error)
  }

  res.status(200).json({ users })
}

const signup = async (req, res, next) => {
  const { name, email, password } = req.body

  let existingUser

  try {
    existingUser = await User.findOne({ email })
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later.', 500)
    return next(error)
  }

  if (existingUser) {
    const error = new HttpError('User already exists, please login instead.', 422)
    return next(error)
  }

  let hashedPassword // hashing new user's password
  try {
    hashedPassword = await bcrypt.hash(password, 12)
  } catch (err) {
    const error = new HttpError('Could not create user, please try again later.', 500)
    return next(error)
  }

  const newUser = new User({
    name, 
    email,
    password: hashedPassword
  })

  try {
    await newUser.save()
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again later.', 500)
    return next(error)
  }

  let token 
  // sign method returns a string and this string will be the token
  // 1 argument - values or data we want to encode into the token (payloads)
  // 2 argument - private key (only server knows)
  // 3 argument (optional) - expiration timer (if the token will be stolen, there will be a short time the hackers can do anything with it)
  try {
    token = jwt.sign( 
      { userId: newUser._id, email: newUser.email }, 
      'supersecret_dont_share', // should be the same for login & signup
      { expiresIn: '1h' }
    ) 
  } catch (err) { // error if creating token failed
    const error = new HttpError('Signing up failed, please try again later.', 500)
    return next(error)
  }

  res.status(200).json({ userId: newUser._id, email: newUser.email, token: token })
}

const login = async (req, res, next) => {
  const { email, password } = req.body
  let existingUser

  try {
    existingUser = await User.findOne({ email })
  } catch (err) {
    const error = new HttpError('Logging failed, please try again later.', 500)
    return next(error)
  }

  if (!existingUser) {
    const error = new HttpError('Invalid credentials, could not log you in.', 500)
    return next(error)
  }

  let isValidPassword = false 
  try { // login passwords & hashed BD password comparison
    isValidPassword = await bcrypt.compare(password, existingUser.password)
  } catch (err) { // error if something went wrong during the comparison
    const error = new HttpError('Invalid credentials, could not log you in.', 500)
    return next(error)
  }

  if (!isValidPassword) { // error if passwords are not equal
    const error = new HttpError('Invalid credentials, could not log you in.', 500)
    return next(error)
  }

  let token 
  // sign method returns a string and this string will be the token
  // 1 argument - values or data we want to encode into the token (payloads)
  // 2 argument - private key (only server knows)
  // 3 argument (optional) - expiration timer (if the token will be stolen, there will be a short time the hackers can do anything with it)
  try {
    token = jwt.sign( 
      { userId: existingUser._id, email: existingUser.email }, 
      'supersecret_dont_share', // should be the same for login & signup
      { expiresIn: '1h' }
    ) 
  } catch (err) { // error if creating token failed
    const error = new HttpError('Logging in failed, please try again later.', 500)
    return next(error)
  }

  res.json({ userId: existingUser._id, email: existingUser.email, token: token })
}

exports.getUsers = getUsers
exports.signup = signup
exports.login = login