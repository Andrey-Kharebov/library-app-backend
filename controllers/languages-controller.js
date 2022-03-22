const HttpError = require('../helpers/http-error')

const wordsListSeparator = require('../helpers/LanguagesHelpers/wordsListSeparator')
const wordsPackArrPreparer = require('../helpers/LanguagesHelpers/wordsPackArrPreparer')
const packedWordsRemover = require('../helpers/LanguagesHelpers/packedWordsRemover')

const User = require('../models/user')
const Language = require('../models/languages/language')
const Word = require('../models/languages/word' )
const WordsPack = require('../models/languages/wordsPack')

const getLanguages = async (req, res, next) => { 
  // returns languages list for main subs and full first language for first active main tab
  const id = req.userData.userId

  let languages = []
  let firstLanguage
  let wordsPacks

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
  
  if (firstLanguage) {
    try {
      wordsPacks = await WordsPack.find({ language: firstLanguage._id })
    } catch (err) {
      const error = new HttpError('Fetching words packs failed, please try again later.', 500)
      return next(error)
    }
  }

  if (wordsPacks) firstLanguage.wordsPacks = wordsPacks

  const languagesData = {
    languagesTitlesList: languages,
    languagesObjs: firstLanguage ? [firstLanguage] : []
  }

  res.status(200).json({ languagesData })
} 

const getLanguageById = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params

  let languageObj 
  let wordsPacks

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

  if (languageObj) {
    try {
      wordsPacks = await WordsPack.find({ language: languageObj._id })
    } catch (err) {
      const error = new HttpError('Fetching words packs failed, please try again later.', 500)
      return next(error)
    }
  }

  languageObj.wordsPacks = wordsPacks
  
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
    wordsPacks: [],
    creator: user._id,
    config: {
      lastWordsPackNumber: 0
    },
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
  let wordPacks

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
    await Word.deleteMany({ language: languageObj._id })
    await WordsPack.deleteMany({ language: languageObj._id })
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

const createWordsPack = async (req, res, next) => {
  const userId = req.userData.userId
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

  const wordsArr = wordsPackArrPreparer(wordsList, languageObj._id)

  if (wordsArr.length < 20) {
    const error = new HttpError('There must be at least 20 words in your wordsList to create a wordsPack', 404) 
    return next(error)
  }

  const updatedWordsPackNumber = (languageObj.config.lastWordsPackNumber + 0.1).toFixed(1)
  languageObj.config.lastWordsPackNumber = updatedWordsPackNumber
  
  const newWordsPack = new WordsPack({ 
    title: `${ languageObj.title } W. ${ updatedWordsPackNumber }`,
    words: wordsArr.map(w => {
      return {...w, level: 1}
    }),
    language: languageObj._id
  })

  languageObj.wordsList = packedWordsRemover(wordsList)
  languageObj.wordsPacks.push(newWordsPack)

  try {
    await Word.insertMany(wordsArr)
    await newWordsPack.save()
    await languageObj.save()
  } catch (err) {
    const error = new HttpError('Creating words pack failed, please try again later.', 404) 
    return next(error)
  }

  const languageData = {
    languageTitle: { _id: languageObj._id, title: languageObj.title },
    wordsList: languageObj.wordsList,
    wordsPack: newWordsPack
  }

  res.status(200).json({ languageData })
}

exports.getLanguages = getLanguages
exports.getLanguageById = getLanguageById
exports.createLanguage = createLanguage
exports.deleteLanguage = deleteLanguage
exports.saveWordsList = saveWordsList
exports.createWordsPack = createWordsPack