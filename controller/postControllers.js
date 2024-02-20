const Post = require("../models/postModel")
const User = require("../models/userModel")
const path = require('path')
const fs = require('fs')
const {v4: uuid} = require('uuid')
const HttpError = require('../models/errorModel')


// CREATE A POST
// POST : api/posts
//PROTECTED ROUTE
const createPost = async (req, res, next) => {
    try {
        let { title, category, desc } = req.body;
        if (!title || !category || !desc) {
            return next(new HttpError("Fill in all fields and choose thumbnail", 422));
        }

        const { thumbnail } = req.files;
        // Check file size
        if (thumbnail.size > 2000000) {
            return next(new HttpError('File too big. Must be under 2MB. Try again', 422));
        }

        let fileName = thumbnail.name;
        let splittedFileName = fileName.split('.');
        let fileExtension = splittedFileName.pop();
        let newFileName = `${splittedFileName.join('.')}_${uuid()}.${fileExtension}`;

        thumbnail.mv(path.join(__dirname, '..', '/uploads', newFileName), async (err) => {
            if (err) {
                return next(new HttpError(err));
            } else {
                try {
                    const newPost = await Post.create({ title, category, desc, thumbnail: newFileName, creator: req.user.id });
                    if (!newPost) {
                        return next(new HttpError("Post could not be created", 422));
                    }

                    // Find user and increase their post count by one
                    const currentUser = await User.findById(req.user.id);
                    const userPostCount = currentUser.posts + 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });

                    res.status(201).json(newPost);
                } catch (error) {
                    return next(new HttpError(error));
                }
            }
        });
    } catch (error) {
        return next(new HttpError(error));
    }
};


// Get all posts
// GET : api/posts
//UNPROTECTED ROUTE
const getPosts = async (req, res, next) => {
   try {
    const posts = await Post.find().sort({updatedAt: -1})
    res.status(200).json(posts);
   } catch (error) {
    return next(new HttpError(error));
   }
}

// GET SINGLE POST
// GET : api/posts/:id
//UNPROTECTED ROUTE
const getPost = async (req, res, next) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);
    if(!post){
        return next (new HttpError("Post not found.", 404))
    }
    res.status(200).json(post)
  } catch (error) {
    return next(new HttpError("Your post does not exist.", 404));
  }
}
// Get POST by category
// GET : api/posts/categories/:category
//PROTECTED ROUTE
const getCatPost = async (req, res, next) => {
  try {
    const {category} = req.params;
    const catPosts = await Post.find({category}).sort({createdAt: -1})
    res.status(200).json(catPosts)
  } catch (error) {
    return next(new HttpError(error));
  }
}

// Get author's POSTs
// GET : api/posts/users/:id
//UNPROTECTED ROUTE
const getUserPosts = async (req, res, next) => {
    try {
        const {id} = req.params;
        const posts = await Post.find({creator: id}).sort({createdAt: -1})
        res.status(200).json(posts);
    } catch (error) {
        return next(new HttpError(error));
    }
}

// EDIT POST
// PATCH : api/posts/:id
//PROTECTED ROUTE
const editPost = async (req, res, next) => {
    try {
        let fileName;
        let newFileName;
        let updatedPost;
        const postId = req.params.id;
        let {title, category, desc} = req.body;
        if(!title || !category || desc.length < 12 ){
            return next(new HttpError("Fill in all fields,", 422))
        }
        if(!req.files){
            updatedPost = await Post.findByIdAndUpdate(postId,{title, category, desc}, {new: true})
        }else{
            // get old post from DB
            const oldPost = await Post.findById(postId);
            if(req.user.id == oldPost.creator){
            //delete old thumbnail
            fs.unlink(path.join(__dirname, "..", "uploads", oldPost.thumbnail), async (err) =>{
                if(err){
                    return next(new HttpError(err));
                }
                
            })
            //upload new thumbnail
            const {thumbnail} = req.files;
            //check file size
            if(thumbnail.soze > 2000000){
                return next(new HttpError("File too big, should be less than 2MB."));
            }
            fileName = thumbnail.name;
            let splittedFileName = fileName.split('.');
            let fileExtension = splittedFileName.pop();
            newFileName = `${splittedFileName.join('.')}_${uuid()}.${fileExtension}`
            thumbnail.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
                if(err){
                    return next(new HttpError(err))
                }
    
             })
            
             updatedPost = await Post.findByIdAndUpdate(postId, {title, category, desc, thumbnail: newFileName}, {new: true})
        }
    }

        if(!updatedPost){
            return next(new HttpError("Couldn't update post.", 400))
        }

        res.status(200).json(updatedPost);
    } catch (error) {
        return next(new HttpError(error));
    }
}

// DELETE A POST
// Delete : api/posts/:id
//PROTECTED ROUTE
const deletePost = async (req, res, next) => {
    try {
        const postId = req.params.id;
        if (!postId) {
            return next(new HttpError("Post unavailable.", 400));
        }
        const post = await Post.findById(postId);
        if (!post) {
            return next(new HttpError("Post not found.", 404)); // Handle case where post is not found
        }
        const fileName = post.thumbnail;
        // user check - authorization
        if (req.user.id == post.creator) {
            //delete thumbnail from folder
            fs.unlink(path.join(__dirname, "..", "uploads", fileName), async (err) => {
                if (err) {
                    return next(new HttpError(err));
                } else {
                    await Post.findByIdAndDelete(postId);
                    //find user to reduce post count by 1
                    const currentUser = await User.findById(req.user.id);
                    const userPostCount = currentUser.posts - 1;
                    await User.findByIdAndUpdate(req.user.id, { posts: userPostCount });
                    res.json(`Post ${postId} deleted successfully.`);
                }
            });
        } else {
            return next(new HttpError("This is not your post to delete.", 403));
        }
    } catch (error) {
        return next(new HttpError(error));
    }
};


module.exports = {createPost, getPosts, getCatPost, getPost, getUserPosts, deletePost, editPost}