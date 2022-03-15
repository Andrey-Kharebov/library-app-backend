const HttpError = require('../helpers/http-error')

const User = require('../models/user')

const getLanguages = async (req, res, next) => {
  const id = req.userData.userId

  let user
  let languagesList 

  try {
    user = await User.findById(id).select('languages')
  } catch (err) {
    const error = new HttpError('Fetching languages failed, please try again later.', 500)
    return next(error)
  }

  languagesList = user.languages

  res.status(200).json({ languagesList })
}

const createLanguage = async (req, res, next) => {
  const id = req.userData.userId
  const { title } = req.body 
  
  if (title === '') {
    const error = new HttpError('Language title can\'t be empty!', 500)
    return next(error)
  }

  let user
  let existingLanguage 

  try {
    user = await User.findById(id).select('languages')
    existingLanguage = user.languages.find(l => l.toLowerCase() === title.toLowerCase())
  } catch (err) {
    const error = new HttpError('Fetching languages failed, please try again later.', 500)
    return next(error)
  } 

  if (existingLanguage) {
    const error = new HttpError('Language with this title is already exists.', 500)
    return next(error)
  }

  user.languages.push(title)

  try {
    user.save()
  } catch (err) {
    const error = new HttpError('Something went wrong, could not create lanugage', 500)
    return next(error)
  } 

  const languagesList = user.languages
 
  res.status(200).json({ languagesList })
}


exports.getLanguages = getLanguages
exports.createLanguage = createLanguage