const { Router } = require('express')
const router = Router()

const usersController = require('../controllers/users-controller')

router.get('/', usersController.getUsers)
router.post('/signup', usersController.signup)
router.post('/login', usersController.login)

module.exports = router