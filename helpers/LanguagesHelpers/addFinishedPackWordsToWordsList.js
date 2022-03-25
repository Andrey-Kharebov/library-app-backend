const wordsListSeparator = require('./wordsListSeparator')

const addFinishedPackWordsToWordsList = (words, wordsList) => {
  console.log(wordsList)
  if (words.length === 0) return wordsList

  words.forEach(w => {
    wordsList += `\n${ w.word } - ${ w.translation } // ${ w.example }`
  })

  const updatedWordsList = wordsListSeparator(wordsList)

  return updatedWordsList
}


module.exports = addFinishedPackWordsToWordsList
