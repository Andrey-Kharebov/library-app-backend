const HttpError = require('../helpers/http-error')

const User = require('../models/user')
const Language = require('../models/languages/language')
const wordsListSeparator = require('../helpers/LanguagesHelpers/wordsListSeparator')

const getLanguages = async (req, res, next) => { 
  // returns languages list for main subs and full first language for first active main tab
  const id = req.userData.userId

  let languages = []
  let firstLanguage

  try {
    languages = await Language.find({ creator: id }).select('title')
  } catch (err) {
    const error = new HttpError('Fetching languages failed, please try again later.', 500)
    return next(error)
  }


  if (languages) {
    try {
      firstLanguage = await Language.findOne()
    } catch (err) {
      const error = new HttpError('Fetching languages failed, please try again later.', 500)
      return next(error)
    }
  }
  

  const languagesData = {
    languagesTitlesList: languages,
    languagesObjs: firstLanguage ? [firstLanguage] : []
  }

  // console.log(languagesData)
  res.status(200).json({ languagesData })
} 

const getLanguageById = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params

  let languageObj 

  try {
    languageObj = await Language.findById(languageId)
  } catch (err) {
    const error = new HttpError('Fetching language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 
  
  res.status(200).json({ languageObj })
}

const createLanguage = async (req, res, next) => {
  // creates new language and returns it's title obj for languages list for main subs and full language obj

  const userId = req.userData.userId
  const { title } = req.body 

  if (title === '') {
    const error = new HttpError('Language title can\'t be empty!', 500)
    return next(error)
  } 

  let user
  let existingLanguage 

  try {
    user = await User.findById(userId).select('languages')
    existingLanguage = await Language.findOne({ creator: userId, title: title })
  } catch (err) {
    const error = new HttpError('Creating language failed, could not find a user with this id.', 500)
    return next(error)
  }

  if (existingLanguage) {
    const error = new HttpError('Language with this title is already exist, please use that one.', 422)
    return next(error)
  }

  const newLanguage = new Language({
    title,
    wordsList: '',
    creator: user._id
  })  

  user.languages.push(newLanguage)
  
  try {
    await newLanguage.save()
    await user.save()
  } catch (err) {
    const error = new HttpError('Something went wrong, could not create lanugage', 500)
    return next(error)
  } 

  const newLanguageData = {
    newLanguageTitle: { _id: newLanguage._id, title: newLanguage.title },
    newLanguageObj: newLanguage
  }

  res.status(200).json({ newLanguageData })
}

const deleteLanguage = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params
  
  let languageObj 

  try {
    languageObj = await Language.findById(languageId).populate('creator')
  } catch (err) {
    const error = new HttpError('Fetching language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 

  try {
    await languageObj.creator.languages.pull(languageObj)
    await languageObj.creator.save()
    await languageObj.remove()
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete language', 500)
    return next(error)
  }

  res.status(200).json({ message: 'Language have been successfully deleted.' })
}

const saveWordsList = async (req, res, next) => {
  const { languageId } = req.params
  const { wordsList } = req.body

  let languageObj 

  try {
    languageObj = await Language.findById(languageId)
  } catch (err) {
    const error = new HttpError('Finding language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 
  

  languageObj.wordsList =  wordsListSeparator(wordsList)
  
  try {
    await languageObj.save()
  } catch (err) {
    const error = new HttpError('Words list updating failed, please try again later.', 404) 
    return next(error)
  }

  const languageData = {
    languageTitle: { _id: languageObj._id, title: languageObj.title },
    wordsList: languageObj.wordsList
  }
  
  res.status(200).json({ languageData })
}

exports.getLanguages = getLanguages
exports.getLanguageById = getLanguageById
exports.createLanguage = createLanguage
exports.deleteLanguage = deleteLanguage
exports.saveWordsList = saveWordsList