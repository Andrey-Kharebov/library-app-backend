const wordsListSeparator = wordsList => {
  let separatedWords = wordsList.trim().split('\n').filter(str => str !== '').map((i, idx) => {
    return (idx + 1) % 5 === 0 
      ? `${i.trim()}\n\n`
      : `${i.trim()}\n`
  }).join('')

  return separatedWords.trim()
}

module.exports = wordsListSeparator