const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const User = require('../models/Admin_User');
const jwt = require('jsonwebtoken');
const multer= require('multer')

const adminLayout = '../views/layouts/admin';
const loginLayout = '../views/layouts/login';
const jwtSecret = process.env.JWT_SECRET;

/**
 * Check Login
*/
const authMiddleware = (req, res, next ) => {
  const token = req.cookies.token;
  if(!token) {
    return res.status(401).json( { message: 'Unauthorized'} );
  }
  try {
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.userId;
    next();
  } catch(error) {
    res.status(401).json( { message: 'Unauthorized'} );
  }
}
/**
 * GET /
 * Admin - Login Page
*/
router.get('/admin', async (req, res) => {
  try {
    const locals = {
      title: "Admin",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
    res.render('admin/index', { locals, layout: loginLayout });
  } catch (error) {
    console.log(error);
  }
});

/**
 * POST /
 * Admin - Check Login
*/
router.post('/admin', async (req, res) => {
  try {
    const { username, password } = req.body; 
    const user = await User.findOne( { username } );

    if(!user) {
      return res.status(401).json( { message: 'Invalid user' } );
    }
    const isPasswordValid = await (password===user.password);

    if(!isPasswordValid) {
      return res.status(401).json( { message: 'Invalid password' } );
    }

    const token = jwt.sign({ userId: user._id}, jwtSecret );
    res.cookie('token', token, { httpOnly: true });
    res.redirect('/dashboard');

  } catch (error) {
    console.log(error);
  }
});
//-------------------------------------------------------------
// Render the registration page
router.get('/register', (req, res) => {

  try {
    const locals = {
      title: "Admin",
      description: "Simple Blog created with NodeJs, Express & MongoDb."
    }
    res.render('admin/register', { locals, layout: loginLayout });
  } catch (error) {
    console.log(error);
  }
});

// Handle form submission
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
      // Create a new user
      const newUser = new User({ username, email, password });
      await newUser.save();
      res.redirect('/admin'); // Redirect to login page after successful registration
  } catch (err) {
      console.error(err);
      res.status(500).send('An error occurred while registering the user.');
  }
});
//-------------------------------------------------------------
/**
 * GET /
 * Admin Dashboard
*/
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Dashboard',
      description: 'Simple Blog created with NodeJs, Express & MongoDb.'
    }

    const data = await Post.find();
    res.render('admin/dashboard', {
      locals,
      data,
      layout: adminLayout
    });
  } catch (error) {
    console.log(error);
  }
});
/**
 * GET /
 * Admin - Create New Post
*/
router.get('/add-post', authMiddleware, async (req, res) => {
  try {
    const locals = {
      title: 'Add Post',
      description: 'Simple Blog created with NodeJs, Express & MongoDb.'
    }
    const data = await Post.find();
    res.render('admin/add-post', {
      locals,
      layout: adminLayout
    });
  } catch (error) {
    console.log(error);
  }
});

//image upload
var storage=multer.diskStorage({
  destination: function(req,file,cb){
      cb(null,'./uploads')
  },
  filename: function(req,file,cb){
      //cb(null,file.originalname)
      cb(null,file.fieldname+"_"+Date.now()+"_"+file.originalname)
  }
})

var upload=multer({storage: storage}).single('image')

/**
 * POST /
 * Admin - Create New Post
*/
router.post('/add-post', authMiddleware, upload, async (req, res) => {
  try {
    // console.log('req.file:', req.file); // Log to debug the file upload

    if (!req.file) {
      return res.status(400).json({ error: 'Image upload failed' });
    }

    const newPost = new Post({
      title: req.body.title,
      body: req.body.body,
      image: req.file.filename,
      category: req.body.category
    });

    await newPost.save();
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error adding post:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * GET /
 * Admin - Create New Post
*/
router.get('/edit-post/:id', authMiddleware, async (req, res) => {
  try {

    const locals = {
      title: "Edit Post",
      description: "Free NodeJs User Management System",
    };

    const data = await Post.findOne({ _id: req.params.id });

    res.render('admin/edit-post', {
      locals,
      data,
      layout: adminLayout
    })

  } catch (error) {
    console.log(error);
  }

});


/**
 * PUT /
 * Admin - Create New Post
*/
router.put('/edit-post/:id', authMiddleware,upload, async (req, res) => {
  try {

    const updateData = {
  title: req.body.title,
  body: req.body.body,
  category: req.body.category,
  updatedAt: Date.now(),
};

if (req.file) {
  updateData.image = req.file.filename;
}

await Post.findByIdAndUpdate(req.params.id, updateData);

    res.redirect(`/dashboard`);

  } catch (error) {
    console.log(error);
  }

});
/**
 * DELETE /
 * Admin - Delete Post
*/
router.delete('/delete-post/:id', authMiddleware, async (req, res) => {

  try {
    await Post.deleteOne( { _id: req.params.id } );
    res.redirect('/dashboard');
  } catch (error) {
    console.log(error);
  }

});


/**
 * GET /
 * Admin Logout
*/
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  //res.json({ message: 'Logout successful.'});
  res.redirect('/');
});


module.exports = router;