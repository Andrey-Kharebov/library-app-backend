const { Router } = require('express')
const router = Router()

const usersController = require('../controllers/users-controller')

router.get('/', usersController.getUsers)
router.get('/signup', usersController.signup)
router.get('/login', usersController.login)

module.exports = router