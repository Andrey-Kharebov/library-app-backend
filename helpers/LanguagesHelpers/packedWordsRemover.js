const packedWordsRemover = wordsList => {
  let separatedWords = wordsList.trim().split('\n').filter(str => str !== '').splice(20).map((i, idx) => {
    return (idx + 1) % 5 === 0 
      ? `${i}\n\n`
      : `${i}\n`
  }).join('')

  return separatedWords
}

module.exports = packedWordsRemover