const express = require('express');
const router = express.Router();
const { 
  generateRecipes, 
  getRecipes, 
  getRecipeById 
} = require('../controllers/recipe.controller');

// Recipe routes - no middleware for now
router.post('/generate', generateRecipes);
router.get('/', getRecipes);
router.get('/:id', getRecipeById);

module.exports = router;