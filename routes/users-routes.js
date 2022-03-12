const { Router } = require('express')
const router = Router()

const checkAuth = require('../middlewares/check-auth')

const usersController = require('../controllers/users-controller')

router.post('/signup', usersController.signup)
router.post('/login', usersController.login)

router.use(checkAuth) // all routes below can be reached only if token is valid 
router.get('/', usersController.getUsers)

module.exports = router