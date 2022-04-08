const { Router } = require('express')
const router = Router()

const checkAuth = require('../middlewares/check-auth')

const languagesController = require('../controllers/languages-controller')

router.use(checkAuth) // all routes below can be reached only if token is valid 
router.get('/', languagesController.fetchLanguages)
router.post('/', languagesController.createLanguage)
router.get('/:languageId', languagesController.fetchLanguageObj)
router.patch('/:languageId/wordsList', languagesController.saveWordsList)

router.post('/wordsPack', languagesController.createWordsPack)
router.patch('/:wordsPackId/wordLevelUp', languagesController.wordLevelUp)
router.patch('/:wordsPackId/wordLevelDown', languagesController.wordLevelDown)
router.post('/:wordsPackId/finish', languagesController.finishPack)

router.post('/:languageId/wordsSuggestion', languagesController.wordsSuggestion)
router.post('/:languageId/words', languagesController.words)
router.patch('/:languageId/words', languagesController.saveWord)
router.delete('/:languageId/words', languagesController.deleteWord)



router.delete('/:languageId', languagesController.deleteLanguage)

module.exports = router



