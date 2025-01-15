const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment=require('../models/comment')

const bodyParser = require('body-parser');
router.use(bodyParser.urlencoded({ extended: true })); 
router.use(bodyParser.json());

//login page require
const jwt = require('jsonwebtoken');
const jwtSecret = process.env.JWT_SECRET;
const User = require('../models/User');
const comment = require('../models/comment');

const UauthMiddleware = (req, res, next ) => {
  const token = req.cookies.token;
  if(!token) {
    //return res.status(401).json( { message: 'Unauthorized 1'} );
    return res.redirect('/login')
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch(error) {
    res.status(401).json( { message: 'Unauthorized'} );
  }
}

//User - Login Page
//get router
router.get('/login', async (req, res) => {
  try {
    const locals = {
      title: "Log In",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
    res.render('login', { 
      locals,
      currentRoute: '/login'
    });
  } catch (error) {
    console.log(error);
  }
});

//User - Login Page
//post router
router.post('/login', async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const user = await User.findOne( { username } );

    if(!user) {
      return res.status(401).json( { message: 'Invalid user' } );
    }

    const isemailValid = await (email===user.email);

    if(!isemailValid) {
      return res.status(401).json( { message: 'Invalid password' } );
    }

    const token = jwt.sign({ userId: user._id}, jwtSecret );
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/');

  } catch (error) {
    console.log(error);
  }
});
//register router
//GET 
router.get('/signup', (req, res) => {

  try {
    const locals = {
      title: "Sign Up",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
    res.render('singup', { locals,currentRoute: '/signup' });
  } catch (error) {
    console.log(error);
  }

});
//POST
router.post('/singup', async (req, res) => {
  const { username, email, year } = req.body;

  try {
      // Create a new user
      const newUser = new User({ username, email, year });
      await newUser.save();
      res.redirect('/login'); // Redirect to login page after successful registration
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while registering the user.');
  }
});
/**
 * GET /
 * HOME
*/
router.get('',UauthMiddleware, async (req, res) => {
  try {
    const locals = {
      title: "Home",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
    let perPage = 10;
    let page = req.query.page || 1;
    const data = await Post.aggregate([ { $sort: { createdAt: -1 } } ])
    .skip(perPage * page - perPage)
    .limit(perPage)
    .exec();

    // Count is deprecated - please use countDocuments
    // const count = await Post.count();
    const count = await Post.countDocuments({});
    const nextPage = parseInt(page) + 1;
    const hasNextPage = nextPage <= Math.ceil(count / perPage);

    res.render('index', { 
      locals,
      data,
      current: page,
      nextPage: hasNextPage ? nextPage : null,
      currentRoute: '/'
    });
  } catch (error) {
    console.log(error);
    }
});

/**
 * GET /
 * Post :id
*/

router.get('/post/:id', async (req, res) => {
  try {
    let slug = req.params.id;
    const data = await Post.findById({ _id: slug });
    const locals = {
      title: data.title,
      description: "Simple Blog created with NodeJs, Express & MongoDb.",
    }
    
    const comments = await Comment.find({ postId: req.params.id }).populate('userId');

 // Calculate total rating
 const totalRating = comments.reduce((sum, comment) => {
  return sum + (comment.rating || 0); // Default to 0 if rating is undefined
}, 0);

// Calculate average rating
const averageRating = comments.length > 0 
  ? (totalRating / comments.length).toFixed(1) 
  : 'No ratings yet';
    
    res.render('post', { 
      comments,
      locals,
      data,
      currentRoute: `/post/${slug}`,
      averageRating
    });
  } catch (error) {
    console.log(error);
  }

});


/**
 * POST /
 * Post - searchTerm
*/
router.post('/search', async (req, res) => {
  try {
    const locals = {
      title: "Seach",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }

    let searchTerm = req.body.searchTerm;
    const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9 ]/g, "")

    const data = await Post.find({
      $or: [
        { title: { $regex: new RegExp(searchNoSpecialChar, 'i') }},
        { body: { $regex: new RegExp(searchNoSpecialChar, 'i') }}
      ]
    });

    res.render("search", {
      data,
      locals,
      currentRoute: '/'
    });

  } catch (error) {
    console.log(error);
  }

});
//category router here-------------------------------------
// General categories route
router.get('/category', async (req, res) => {
  try {
    const locals = {
      title: "Category",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
      // Aggregate categories from posts
      const categories = await Post.distinct('category');
      res.render('categories', {
         categories,
         locals,
         currentRoute: '/category'
         });
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while fetching categories.');
  }
});

// Specific category route----------------------------------------
router.get('/category/:categoryName', async (req, res) => {
  const { categoryName } = req.params;

  try {
    const locals = {
      title: categoryName,
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
      // Find posts with the specified category
      const posts = await Post.find({ category: categoryName });
      res.render('category', { 
        categoryName,
         posts,
         locals,
         currentRoute: `/category/${categoryName}`
         });
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while fetching the category posts.');
  }
});

/**
 * GET /
 * About
*/
router.get('/about', (req, res) => {
  res.render('about', {
    currentRoute: '/about'
  });
});

/**
 * GET /
 * Contact
*/
router.get('/contact', (req, res) => {
  res.render('contact', {
    currentRoute: '/contact'
  });
});

//add comment route here-------------------------

router.post('/post/:id/add-comment',UauthMiddleware, async (req, res) => {
  try {
    //debug
    // console.log(req.userId);
      const rating=req.body.rating;
      const commentText = req.body.comment;
      if (commentText) {
          const comment = new Comment({
              userId: req.userId,
              text: commentText,
              postId: req.params.id,
              rating
          });
          await comment.save();
      }
      else{
        console.log("Comment is empty");
      }
      res.redirect(`/post/${req.params.id}`);
  } catch (err) {
      console.error(err);
      res.status(500).send("Server Error");
  }
});




module.exports = router;
