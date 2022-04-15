const HttpError = require('../helpers/http-error')

const wordsListSeparator = require('../helpers/LanguagesHelpers/wordsListSeparator')
const wordsPackArrPreparer = require('../helpers/LanguagesHelpers/wordsPackArrPreparer')
const packedWordsRemover = require('../helpers/LanguagesHelpers/packedWordsRemover')
const addFinishedPackWordsToWordsList = require('../helpers/LanguagesHelpers/addFinishedPackWordsToWordsList')

const User = require('../models/user')
const Language = require('../models/languages/language')
const Word = require('../models/languages/word' )
const WordsPack = require('../models/languages/wordsPack')

// Languages
const fetchLanguages = async (req, res, next) => {
  // возвращает id и title всех соданных объектов языков + объект первого созданного языка целиком
  const id = req.userData.userId

  let langTitles
  let firstLanguage
  let wordsPacks

  try {
    langTitles = await Language.find({ creator: id }).select('title') // массив из объектов с _id и title
  } catch (err) {
    const error = new HttpError('Fetching languages failed, please try again later.', 500)
    return next(error)
  }

  if (langTitles) {
    try {
      firstLanguage = await Language.findOne() // объект первого созданного языка целиком
    } catch (err) { 
      const error = new HttpError('Fetching first language failed, please try again later.', 500)
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

  const langData = {
    langTitlesList: langTitles,
    langObjs: firstLanguage ? [firstLanguage] : []
  }

  res.status(200).json({ langData })
}

const createLanguage = async (req, res, next) => {
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
    const error = new HttpError('Language with provided title already exists, please use that one.', 500)
    return next(error)
  }
  
  const newLanguage = new Language({
    title,
    wordsList: '',
    words: [],
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
    const error = new HttpError('Something went wrong, could not create new lanugage', 500)
    return next(error)
  }

  const langData = {
    newLangTitle: { _id: newLanguage._id, title: newLanguage.title },
    newLangObj: newLanguage
  }

  res.status(200).json({ langData })
}

const fetchLanguageObj = async (req, res, next) => {
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

  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    langObj: languageObj
  }

  res.status(200).json({ langData })
}

const deleteLanguage = async (req, res, next) => { // Check before use
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

  res.status(200).json({ message: 'Has have been successfully deleted.' })
}

// WordsList & Packs
const saveWordsList = async (req, res, next) => {
  const { languageId } = req.params
  const { wordsList } = req.body

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

  languageObj.wordsList =  wordsListSeparator(wordsList)
    
  try {
    await languageObj.save()
  } catch (err) {
    const error = new HttpError('Words list updating failed, please try again later.', 404) 
    return next(error)
  }

  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    wordsList: languageObj.wordsList
  }

  res.status(200).json({ langData })
}

const createWordsPack = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId, wordsList } = req.body

  let languageObj 
  let dbwords

  try {
    languageObj = await Language.findById(languageId)
    dbwords = await Word.find({ language: languageId })
  } catch (err) {
    const error = new HttpError('Fetching language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 

  let wordsArr = wordsPackArrPreparer(wordsList, languageObj._id)
  
  if (wordsArr.length < 20) {
    const error = new HttpError('There must be at least 20 words in your wordsList to create a wordsPack', 404) 
    return next(error)
  }

  let existingArray = []

  wordsArr = wordsArr.map(w => {
    let existingWord = dbwords.find(dbw => dbw.word === w.word)
    if (existingWord) existingArray.push(existingWord)
    return existingWord ? null : w
  })
    .filter(w => w !== null) // removes all null's
    .filter((value, index, self) => 
      index === self.findIndex((i) => (
        i.word === value.word && i.translation === value.translation // removes all dublicates
      ))
    )

  existingArray = existingArray
    .filter((value, index, self) => 
      index === self.findIndex((i) => (
        i.word === value.word && i.translation === value.translation // removes all dublicates
      ))
    )
  
  try {
    wordsArr = await Word.insertMany(wordsArr)
  } catch (err) {
    const error = new HttpError('Creating words failed, please try again later.', 404) 
    return next(error)
  }

  const completedWordsArr = [...existingArray, ...wordsArr]
  console.log(wordsArr.length)
  console.log(existingArray.length)
  console.log(completedWordsArr.length)

  if (completedWordsArr.length < 20) {
    const error = new HttpError('There must be at least 20 UNIQUE words in your wordsList to create a wordsPack. Check for dublicates.', 404) 
    return next(error)
  }
  
  const updatedWordsPackNumber = (languageObj.config.lastWordsPackNumber + 0.1).toFixed(1)
  languageObj.config.lastWordsPackNumber = updatedWordsPackNumber

  const newWordsPack = new WordsPack({ 
    title: `${ languageObj.title } W. ${ updatedWordsPackNumber }`,
    words: completedWordsArr.map(w => {
      w.level = 1
      return w
    }),
    language: languageObj._id
  })

  languageObj.wordsList = packedWordsRemover(wordsList)
  languageObj.wordsPacks.push(newWordsPack)
  languageObj.words.push(...wordsArr.map(w => w._id))

  try {
    await newWordsPack.save()
    await languageObj.save()
  } catch (err) {
    const error = new HttpError('Creating words pack failed, please try again later.', 404) 
    return next(error)
  }
  
  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    wordsList: languageObj.wordsList,
    wordsPack: newWordsPack,
    words: languageObj.words
  }

  res.status(200).json({ langData })
  // res.status(200)
}

const wordLevelUp = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { wordId } = req.body

  let wordsPack 

  try {
    wordsPack = await WordsPack.findById(wordsPackId)
  } catch (err) {
    const error = new HttpError('Finding words pack failed, please try again later.', 500)
    return next(error)
  }

  if (!wordsPack) {
    const error = new HttpError('Could not find a words pack for the provided id.', 404) 
    return next(error)
  }

  wordsPack.words = wordsPack.words.map(w => {
    if (w._id.toString() === wordId) {
      w.level = w.level + 1
      return w 
    } else {
      return w
    }
  })
  
  try {
    await wordsPack.save()
  } catch (err) {
    console.log(err)
    const error = new HttpError('Words level up failed, please try again later.', 404) 
    return next(error)
  }
  
  const langData = {
    wordsPack
  }

  res.status(200).json({ langData })
}

const wordLevelDown = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { wordId } = req.body

  let wordsPack 

  try {
    wordsPack = await WordsPack.findById(wordsPackId)
  } catch (err) {
    const error = new HttpError('Finding words pack failed, please try again later.', 500)
    return next(error)
  }

  if (!wordsPack) {
    const error = new HttpError('Could not find a words pack for the provided id.', 404) 
    return next(error)
  } 

  wordsPack.words = wordsPack.words.map(w => {
    if (w._id.toString() === wordId) {
      w.level = w.level - 1
      return w 
    } else {
      return w
    }
  })
  
  try {
    await wordsPack.save()
  } catch (err) {
    console.log(err)
    const error = new HttpError('Words level up failed, please try again later.', 404) 
    return next(error)
  }
  
  const langData = {
    wordsPack
  }

  res.status(200).json({ langData })
}

const finishPack = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { words } = req.body

  let wordsPack 

  try {
    wordsPack = await WordsPack.findById(wordsPackId).populate('language')
  } catch (err) {
    const error = new HttpError('Finding words pack failed, please try again later.', 500)
    return next(error)
  }

  if (!wordsPack) {
    const error = new HttpError('Could not find a words pack for the provided id.', 404) 
    return next(error)
  }   

  const updatedWordsList = addFinishedPackWordsToWordsList(words, wordsPack.language.wordsList)
  wordsPack.language.wordsList = updatedWordsList
  wordsPack.language.wordsPacks.pull(wordsPack)

  try {
    await wordsPack.language.save()
    await wordsPack.remove()
  } catch (err) {
    const error = new HttpError('Finishing pack failed, try again later.', 404) 
    return next(error)
  }

  const langData = {
    langTitle: { _id: wordsPack.language._id, title: wordsPack.language.title },
    wordsPackId: wordsPack._id,
    wordsList: updatedWordsList
  }

  res.status(200).json({ langData })
}

// Words
const searchWords = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params
  const { word } = req.body
  
  let languageObj 
  let words 

  try {
    languageObj = await Language.findById(languageId).select('title')
  } catch (err) {
    const error = new HttpError('Finding language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 

  try {
    words = await Word.find({ language: languageId, word: { $regex: word } })
  } catch (err) {
    const error = new HttpError('Finding words failed, please try again later.', 500)
    return next(error)
  }

  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    words: words
  }

  res.status(200).json({ langData })
} 

const saveWord = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params
  const { word } = req.body

  let languageObj
  let dbword

  try {
    languageObj = await Language.findById(languageId).select('title')
  } catch (err) {
    const error = new HttpError('Finding language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 

  try {
    dbword = await Word.findById(word._id)
  } catch (err) {
    const error = new HttpError('Finding word failed, please try again later.', 500)
    return next(error)
  }

  if (!dbword) {
    const error = new HttpError('Could not find a word for the provided id.', 404) 
    return next(error)
  } 

  dbword.word = word.word
  dbword.translation = word.translation
  dbword.example = word.example
  
  try {
    await dbword.save()
  } catch (err) {
    const error = new HttpError('Finishing pack failed, try again later.', 404) 
    return next(error)
  }

  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    word: dbword
  }

  res.status(200).json({ langData })
}

const deleteWord = async (req, res, next) => {
  const userId = req.userData.userId
  const { languageId } = req.params
  const { word } = req.body

  console.log(languageId, word)
  let dbword 
  let languageObj

  try {
    languageObj = await Language.findById(languageId).select('title')
  } catch (err) {
    const error = new HttpError('Finding language failed, please try again later.', 500)
    return next(error)
  }

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 
  
  try {
    dbword = await Word.findById(word._id).populate('language')
  } catch (err) {
    const error = new HttpError('Finding word failed, please try again later.', 500)
    return next(error)
  }

  if (!dbword) {
    const error = new HttpError('Could not find a word for the provided id.', 404) 
    return next(error)
  } 

  dbword.language.words.pull(dbword)

  try {
    await dbword.language.save()
    await dbword.remove()
  } catch (err) {
    const error = new HttpError('Something went wrong, could not delete word', 500) 
    return next(error)
  }

  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    word: dbword
  }

  res.status(200).json({ langData })
}



exports.fetchLanguages = fetchLanguages
exports.createLanguage = createLanguage
exports.fetchLanguageObj = fetchLanguageObj
exports.deleteLanguage = deleteLanguage

exports.saveWordsList = saveWordsList
exports.createWordsPack = createWordsPack
exports.wordLevelUp = wordLevelUp
exports.wordLevelDown = wordLevelDown
exports.finishPack = finishPack

exports.searchWords = searchWords
exports.saveWord = saveWord
exports.deleteWord = deleteWord