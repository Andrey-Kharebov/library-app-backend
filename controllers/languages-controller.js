const HttpError = require('../helpers/http-error')

const wordsListSeparator = require('../helpers/LanguagesHelpers/wordsListSeparator')
const wordsPackArrPreparer = require('../helpers/LanguagesHelpers/wordsPackArrPreparer')
const packedWordsRemover = require('../helpers/LanguagesHelpers/packedWordsRemover')
const addFinishedPackWordsToWordsList = require('../helpers/LanguagesHelpers/addFinishedPackWordsToWordsList')

const User = require('../models/user')
const Language = require('../models/languages/language')
const Word = require('../models/languages/word' )
const WordsPack = require('../models/languages/wordsPack')


const tryCatchHandler = async ({ operation, multipleOperations, next, errorText, errorCode }) => { 
  if (multipleOperations) {
    try {
      for (let i in multipleOperations) {
        await multipleOperations[i]()
      }
    } catch (err) {
      const error = new HttpError(errorText || 'Something went wrong, try again later.', errorCode || 500)
      return next(error)
    }
  } else {
    let data 

    try {
      data = await operation()
    } catch (err) {
      const error = new HttpError(errorText || 'Something went wrong, try again later.', errorCode || 500)
      return next(error)
    }
     
    return data 
  }
}

// Languages
const fetchLanguages = async (req, res, next) => {
  const id = req.userData.userId

  let langTitles
  let firstLanguage
  let wordsPacks

  const langTitlesOperation = async () => await Language.find({ creator: id }).select('title')
  langTitles = await tryCatchHandler({ operation: langTitlesOperation, next, errorText: 'Fetching languages failed, please try again later.', errorCode: 500 }) 

  if (langTitles) {
    const firstLanguageOperation = async () => await Language.findOne()
    firstLanguage = await tryCatchHandler({ operation: firstLanguageOperation, next, errorText: 'Fetching first language failed, please try again later.', errorCode: 500 })
  }

  if (firstLanguage) {
    const wordsPacksOperation = async () => await WordsPack.find({ language: firstLanguage._id })
    wordsPacks = await tryCatchHandler({ operation: wordsPacksOperation, next,  errorText: 'Fetching words packs failed, please try again later.', errorCode: 500 })
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

  const userOperation = async () => await User.findById(userId).select('languages')
  user = await tryCatchHandler({ operation: userOperation, next, errorText: 'Creating language failed, could not find a user with this id.', errorCode: 500 })

  const existingLanguageOperation = async () => await Language.findOne({ creator: userId, title: title })
  existingLanguage = await tryCatchHandler({ operation: existingLanguageOperation, next,  errorText: null, errorCode: 500 })

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

  const operations = {
    1: async () => await newLanguage.save(),
    2: async () => await user.save()
  }

  await tryCatchHandler({ multipleOperations: operations, next,  errorText: 'Something went wrong, could not create new lanugage', errorCode: 500 })
  
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

  const languageObjOperation = async () => await Language.findById(languageId)
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next,  errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

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

  const languageObjOperation = async () => await Language.findById(languageId).populate('creator')
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next,  errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 

  const operations = {
    1: async () => await languageObj.creator.languages.pull(languageObj),
    2: async () => await languageObj.creator.save(),
    3: async () => await Word.deleteMany({ language: languageObj._id }),
    4: async () => await WordsPack.deleteMany({ language: languageObj._id }),
    5: async () => await languageObj.remove()
  }

  await tryCatchHandler({
    multipleOperations: operations,
    next, 
    errorText: 'Something went wrong, could not delete language',
    errorCode: 500
  })

  res.status(200).json({ message: 'Has have been successfully deleted.' })
}

// WordsList & Packs
const saveWordsList = async (req, res, next) => {
  const { languageId } = req.params
  const { wordsList } = req.body

  let languageObj 

  const languageObjOperation = async () => await Language.findById(languageId)
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next, errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 

  languageObj.wordsList =  wordsListSeparator(wordsList)
  
  const operations = {
    1: async () => await languageObj.save(),
  }

  await tryCatchHandler({ multipleOperations: operations, next,  errorText: 'Words list updating failed, please try again later.', errorCode: 500 })

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

  const languageObjOperation = async () => await Language.findById(languageId).populate('creator')
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next,  errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find language for provided id.', 404) 
    return next(error)
  } 

  const dbwordsOperation = async () => await Word.find({ language: languageId })
  dbwords = await tryCatchHandler({ operation: dbwordsOperation, next, errorText: 'Fetching dbwords failed, please try again later.', errorCode: 500 })

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
  
  const wordsArrOperation = async () => await Word.insertMany(wordsArr)
  wordsArr = await tryCatchHandler({ operation: wordsArrOperation, next, errorText: 'Creating words failed, please try again later.', errorCode: 500 })

  const completedWordsArr = [...existingArray, ...wordsArr]

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

  const operations = {
    1: async () => await newWordsPack.save(),
    2: async () => await languageObj.save()
  }

  await tryCatchHandler({ multipleOperations: operations, next,  errorText: 'Creating words pack failed, please try again later.', errorCode: 500 })
  
  const langData = {
    langTitle: { _id: languageObj._id, title: languageObj.title },
    wordsList: languageObj.wordsList,
    wordsPack: newWordsPack,
    words: languageObj.words
  }

  res.status(200).json({ langData })
}

const wordLevelUp = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { wordId } = req.body

  let wordsPack 

  const wordsPackOperation = async () => await WordsPack.findById(wordsPackId)
  wordsPack = await tryCatchHandler({ operation: wordsPackOperation, next, errorText: 'Finding words pack failed, please try again later.', errorCode: 500 })

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

  const operations = {
    1: async () => await wordsPack.save()
  }

  await tryCatchHandler({ multipleOperations: operations, next, errorText: 'Words level up failed, please try again later.', errorCode: 500 })
  
  const langData = { wordsPack }

  res.status(200).json({ langData })
}

const wordLevelDown = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { wordId } = req.body

  let wordsPack 

  const wordsPackOperation = async () => await WordsPack.findById(wordsPackId)
  wordsPack = await tryCatchHandler({ operation: wordsPackOperation, next, errorText: 'Finding words pack failed, please try again later.', errorCode: 500 })

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
  
  const operations = {
    1: async () => await wordsPack.save()
  }

  await tryCatchHandler({ multipleOperations: operations, next, errorText: 'Words level down failed, please try again later.', errorCode: 500 })
  
  const langData = { wordsPack }

  res.status(200).json({ langData })
}

const finishPack = async (req, res, next) => {
  const userId = req.userData.userId
  const { wordsPackId } = req.params
  const { words } = req.body

  let wordsPack   

  const wordsPackOperation = async () => await WordsPack.findById(wordsPackId).populate('language')
  wordsPack = await tryCatchHandler({ operation: wordsPackOperation, next, errorText: 'Finding words pack failed, please try again later.', errorCode: 500 })

  if (!wordsPack) {
    const error = new HttpError('Could not find a words pack for the provided id.', 404) 
    return next(error)
  }   

  const updatedWordsList = addFinishedPackWordsToWordsList(words, wordsPack.language.wordsList)
  wordsPack.language.wordsList = updatedWordsList
  wordsPack.language.wordsPacks.pull(wordsPack)

  const operations = {
    1: async () => await wordsPack.language.save(),
    2: async () => await wordsPack.remove() 
  }

  await tryCatchHandler({ multipleOperations: operations, next, errorText: 'Finishing pack failed, try again later.', errorCode: 500 })

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

  const languageObjOperation = async () => await Language.findById(languageId).select('title')
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next, errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 500) 
    return next(error)
  } 
 
  const wordsOperation = async () => await Word.find({ language: languageId, word: { $regex: word } })
  words = await tryCatchHandler({ operation: wordsOperation, next, errorText: 'Finding words failed, please try again later.', errorCode: 500 }) 

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

  const languageObjOperation = async () => await Language.findById(languageId).select('title')
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next, errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 

  const dbwordOperation = async () => await Word.findById(word._id)
  dbword = await tryCatchHandler({ operation: dbwordOperation, next, errorText: 'Finding word failed, please try again later.', errorCode: 500 })

  if (!dbword) {
    const error = new HttpError('Could not find a word for the provided id.', 404) 
    return next(error)
  } 

  dbword.word = word.word
  dbword.translation = word.translation
  dbword.example = word.example

  const operations = {
    1: async () => await dbword.save()
  }

  await tryCatchHandler({ multipleOperations: operations, next, errorText: 'Could not save a word, try again later.', errorCode: 500 })
  
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

  let dbword 
  let languageObj

  const languageObjOperation = async () => await Language.findById(languageId).select('title')
  languageObj = await tryCatchHandler({ operation: languageObjOperation, next, errorText: 'Fetching language failed, please try again later.', errorCode: 500 })

  if (!languageObj) {
    const error = new HttpError('Could not find a language for the provided id.', 404) 
    return next(error)
  } 

  const dbwordOperation = async () => await Word.findById(word._id).populate('language')
  dbword = await tryCatchHandler({ operation: dbwordOperation, next, errorText: 'Finding word failed, please try again later.', errorCode: 500 })
  
  if (!dbword) {
    const error = new HttpError('Could not find a word for the provided id.', 404) 
    return next(error)
  } 

  dbword.language.words.pull(dbword)

  const operations = {
    1: async () => await dbword.language.save(),
    2: async () => await dbword.remove()
  }

  await tryCatchHandler({ multipleOperations: operations, next, errorText: 'Could not delete a word, try again later.', errorCode: 500 })

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