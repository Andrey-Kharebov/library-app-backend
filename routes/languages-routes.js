const { Router } = require('express')
const router = Router()

const checkAuth = require('../middlewares/check-auth')

const languagesController = require('../controllers/languages-controller')

router.use(checkAuth) // all routes below can be reached only if token is valid 
router.get('/', languagesController.getLanguages)
router.get('/:languageId', languagesController.getLanguageById)
router.patch('/:languageId/wordsList', languagesController.saveWordsList)
router.post('/', languagesController.createLanguage)

module.exports = router



