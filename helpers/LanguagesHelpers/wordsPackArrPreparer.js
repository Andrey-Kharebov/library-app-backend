const wordsPackArrPreparer = (wordsList, languageId) => {
  const wordsArr = wordsList.trim().split('\n').filter(str => str !== '').splice(0, 20)
    .map((str, idx) => {
      return {
        word: str.split(' - ')[0],
        translation: str.split(' - ')[1].split(' // ')[0],
        example: str.split(' // ')[1],
        level: 0,
        language: languageId
      }
    })
  
  return wordsArr
}

module.exports = wordsPackArrPreparer
