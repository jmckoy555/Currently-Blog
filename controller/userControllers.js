const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const fs = require('fs')
const path = require('path')
const {v4: uuid} = require('uuid')

const User = require('../models/userModel')
const HttpError = require('../models/errorModel')



//REGISTER THE USER
//POST : api/users/register
//UNPROTECTED
const registerUser = async (req, res, next) =>{
    try {
        const {name, email, password, password2} = req.body;
        if(!name || !email || !password ){
            return next(new HttpError("Fill in all fields.", 422))
        }

        const newEmail = email.toLowerCase()

        const emailExists = await User.findOne({email: newEmail})
        if(emailExists){
            return next(new HttpError("Email already exists.", 422))
        }

        if((password.trim()).length < 6){
            return next(new HttpError("Password should be at least 6 characters.", 422))
        }

        if(password != password2){
            return next(new HttpError("Password does not match.", 422))
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPass = await bcrypt.hash(password, salt);
        const newUser = await User.create({name, email: newEmail, password: hashedPass})
        res.status(201).json(`New user ${newUser.email} registered!`)

    } catch (error) {
        return next(new HttpError("User registration failed.", 422))
    }
}

//LOGIN THE USER
//POST : api/users/login
//UNPROTECTED
const loginUser = async (req, res, next) =>{
    try {
        const {email, password} =req.body
        if(!email || !password){
            return next(new HttpError('Fill in all fields,', 422))
        }
        const newEmail = email.toLowerCase();

        const user = await User.findOne({email:newEmail})
        if(!user){
            return next(new HttpError("Invalid email, Try again.", 422))
        }

        const comparePass = await bcrypt.compare(password,user.password )
        if(!comparePass){
            return next(new HttpError('Invalid password, try again.', 422))
        }


        //if all passes check then return a JWT token to log in to application
        const {_id: id, name} = user;
        const token = jwt.sign({id, name}, process.env.JWT_SECRET, {expiresIn: "1d"})


        res.status(200).json({token, id, name})
    } catch (error) {
        return next(new HttpError('Login Failed. Please check your email and password', 422))
    }
}



//USER PROFILE
//POST : api/users/:id
//PROTECTED
const getUser = async (req, res, next) =>{
   try {
    const {id} = req.params;
    const user = await User.findById(id).select('-password')
    if(!user){
        return next(new HttpError('User not found', 404))
    }
    res.status(200).json(user);
   } catch (error) {
    return next(new HttpError(error))
   }
}


//Change user avatar (PF PIC)
//POST : api/users/change-av
//PROTECTED
const changeAv = async (req, res, next) =>{
   try {
        if(!req.files.avatar){
            return next(new HttpError("Please choose an image", 422))
        }

        //Protected route - Auth Middleware - Find user from DB
        const user = await User.findById(req.user.id)
        //delete old avatar
        if(user.avatar){
            fs.unlink(path.join(__dirname, '..', 'uploads', user.avatar), (err) => {
                if(err){
                    return next(new HttpError(err))
                }
            })
        }

        const {avatar} = req.files;
        //check file size
         if(avatar.size > 500000){
            return next(new HttpError("Profile picture is too big. Should be less than 500kb"), 422)
         }

         let fileName;
         fileName = avatar.name;
         let splittedFileName = fileName.split('.')
         let fileExtension = splittedFileName.pop();
         let newFileName = `${splittedFileName.join('.')}_${uuid()}.${fileExtension}`
         avatar.mv(path.join(__dirname, '..', 'uploads', newFileName), async (err) => {
            if(err){
                return next(new HttpError(err))
            }

            const updatedAvatar = await User.findByIdAndUpdate(req.user.id, {avatar: newFileName}, {new: true})
            if(!updatedAvatar){
                return next(new HttpError("Avatar could not be changed. Try again!", 422))
            }
            res.status(200).json(updatedAvatar)
         })
   } catch (error) {
    return next(new HttpError(error))
   }
}


//EDIT USER DETAILS (from profile)
//POST : api/users/edit-user
//PROTECTED
const editUser = async (req, res, next) =>{
    try {
        const {name, email, currentPassword, newPassword, newPasswordConfirm} = req.body;
            if(!name || !email || !currentPassword || !newPasswordConfirm){
                return next(new HttpError("Fill in all fields.", 422))
            }

            //get user from database
            const user = await User.findById(req.user.id);
            if(!user){
                    return next (new HttpError("User not found.", 404))
                }
            
            //make sure new email doesn't already exist
            const emailExist = await User.findOne({email});
            //we want to update other details with/without changing the email (which is a unique id because we use it to login)
            if(emailExist && (emailExist._id != req.user.id)){
                return next(new HttpError("Email already exist.", 422))
            }
            //compare passwords/ current to db password
            const validateUserPassword = await bcrypt.compare(currentPassword, user.password);
            if(!validateUserPassword){
                return next(new HttpError("Invalid current password", 422))
            }
            // compare new passwords
            if(newPassword !== newPasswordConfirm){
                return next(new HttpError("Passwords do not match.", 422))
            }

            //hash new password
            const salt = await bcrypt.genSalt(10);
            const hash = await bcrypt.hash(newPassword, salt);

            //update user info
            const newInfo = await User.findByIdAndUpdate(req.user.id, {name, email, password: hash}, {new: true} )
            res.status(200).json(newInfo)
    } catch (error) {
        return next(new HttpError(error))
    }
}


//Retrieve all USERS
//POST : api/users/authors
//UNPROTECTED
const getAuthors = async (req, res, next) =>{
   try {
     const authors = await User.find().select('-password')
     res.json(authors);
   } catch (error) {
    return next(new HttpError(error))
   }
}

module.exports = {registerUser, getUser, changeAv, getAuthors, editUser, loginUser}