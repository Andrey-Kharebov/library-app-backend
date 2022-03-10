const User = require('../models/user')

const getUsers = async (req, res, next) => {
  let users 

  try {
    users = await User.find({}, '-password')
  } catch (err) {
    const error = new Error('Fetching users failed, please try again later.', 500)
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
    const error = new Error('Signing up failed, please try again later.', 500)
    return next(error)
  }

  if (existingUser) {
    const error = new Error('User exists already, please login instead.', 422)
    return next(error)
  }

  const newUser = new User({
    name, 
    email,
    password
  })

  try {
    await newUser.save()
  } catch (err) {
    const error = new HttpError('Signing up failed, please try again', 500)
    return next(error)
  }

  res.status(200).json({ newUser })
}

const login = async (req, res, next) => {
  const { email, password } = req.body
  let existingUser

  try {
    existingUser = await User.findOne({ email })
  } catch (err) {
    const error = new Error('Logging failed, please try again later.', 500)
    return next(error)
  }

  if (!existingUser || existingUser.password !== password) {
    const error = new Error('Invalid credentials, could not log you in.', 401)
    return next(error)
  }

  res.json({ message: 'Logged in!' })
}

exports.getUsers = getUsers
exports.signup = signup
exports.login = login