const {Router} = require('express')


const {createPost, getPosts, getPost, getCatPost, getUserPosts, editPost,  deletePost} = require("../controller/postControllers")
const authMW = require("../middleware/authMW")

const router = Router()


router.post('/', authMW,createPost)
router.get('/', getPosts)
router.get('/:id', getPost)
router.get('/categories/:category', getCatPost)
router.get('/users/:id', getUserPosts)
router.patch('/:id',authMW, editPost)
router.delete('/:id',authMW, deletePost)


module.exports = router