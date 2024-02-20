const {Router} = require('express')

const {registerUser, getUser, changeAv, getAuthors, editUser, loginUser} = require("../controller/userControllers")
const authMW = require('../middleware/authMW')

const router = Router()

router.post('/register', registerUser)
router.post('/login', loginUser)
router.get('/:id', getUser)
router.get('/', getAuthors)
router.post('/change-av', authMW, changeAv)
router.patch('/edit-user', authMW, editUser)

module.exports = router