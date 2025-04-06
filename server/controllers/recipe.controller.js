const { GoogleGenerativeAI } = require('@google/generative-ai');
const Recipe = require('../models/Recipe');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Clean the AI response to extract JSON
const extractJsonFromResponse = (text) => {
  try {
    // Find content between square brackets
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    // If no brackets, try to parse the entire response
    return JSON.parse(text);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.log('Raw response:', text);
    throw new Error('Failed to parse recipe data from AI');
  }
};

// Function to generate an image for a recipe using Gemini
// Update the generateRecipeImage function in your recipe.controller.js:

async function generateRecipeImage(title, ingredients) {
  try {
    console.log('Generating image for:', title);
    
    // Extract main ingredient for better image relevance
    const mainIngredients = ingredients.slice(0, 2).map(ing => 
      ing.split(' ')[0].toLowerCase()
    ).join(',');
    
    // Use Unsplash source API for food images
    // This doesn't require any API key and provides high-quality food photos
    return `https://source.unsplash.com/featured/?food,${encodeURIComponent(mainIngredients)}`;
  } catch (error) {
    console.error('Failed to generate recipe image:', error);
    // Fallback to a simple random food image
    return `https://source.unsplash.com/random/600x400/?food`;
  }
}
// @desc    Generate recipes based on ingredients
// @route   POST /api/recipes/generate
// @access  Public
exports.generateRecipes = async (req, res) => {
  try {
    const { ingredients, servings, cuisine, dietaryPreferences } = req.body;
    
    // Validate inputs
    if (!ingredients || !Array.isArray(ingredients) || ingredients.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide at least one ingredient' 
      });
    }

    // Set up the model
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Format prompt for Gemini - include all required fields from your schema
    const prompt = `
    You are a professional chef. Create 5 different creative recipes using these ingredients: ${ingredients.join(', ')}. 
    Number of servings: ${servings || 2}. 
    ${cuisine ? `Cuisine type: ${cuisine}.` : ''}
    ${dietaryPreferences ? `Dietary restrictions: ${dietaryPreferences}.` : ''}
    
    Return the response as a JSON array with this exact structure:
    [
      {
        "title": "Recipe name",
        "description": "Brief description",
        "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
        "instructions": ["step 1", "step 2", "step 3"],
        "prepTime": number in minutes,
        "cookTime": number in minutes,
        "totalTime": number in minutes (sum of prepTime and cookTime),
        "servings": number of servings,
        "cuisine": "cuisine type",
        "difficulty": "Easy", "Medium", or "Hard",
        "nutritionalInfo": {
          "calories": number,
          "protein": number,
          "carbs": number,
          "fats": number,
          "fiber": number
        },
        "dietaryInfo": {
          "vegetarian": boolean,
          "vegan": boolean,
          "glutenFree": boolean,
          "dairyFree": boolean
        }
      }
    ]
    
    Include ONLY the JSON output, with no additional text.
    Make sure all properties are included and properly formatted.
    `;

    // Call Gemini API
    console.log('Calling Gemini API with ingredients:', ingredients);
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    // Extract and parse the JSON response
    let recipeData;
    try {
      recipeData = extractJsonFromResponse(text);
      
      // Process recipes and generate images
      const recipePromises = recipeData.map(async (recipe, index) => {
        // Calculate totalTime if needed
        const totalTime = recipe.totalTime || (recipe.prepTime + recipe.cookTime);
        
        // Ensure difficulty is one of the enum values
        const validDifficulty = ['Easy', 'Medium', 'Hard'].includes(recipe.difficulty) 
          ? recipe.difficulty 
          : 'Medium';
        
        // Process nutritional info
        const nutritionalInfo = {
          calories: recipe.nutritionalInfo?.calories || recipe.calories || 0,
          protein: recipe.nutritionalInfo?.protein || 0,
          carbs: recipe.nutritionalInfo?.carbs || 0,
          fats: recipe.nutritionalInfo?.fats || 0,
          fiber: recipe.nutritionalInfo?.fiber || 0
        };
        
        // Generate image for the recipe
        const imageUrl = await generateRecipeImage(recipe.title, recipe.ingredients);
        
        return {
          _id: `generated-${Date.now()}-${index}`,
          title: recipe.title,
          description: recipe.description,
          ingredients: recipe.ingredients,
          instructions: recipe.instructions,
          prepTime: recipe.prepTime,
          cookTime: recipe.cookTime,
          totalTime: totalTime,
          servings: recipe.servings || servings || 2,
          cuisine: recipe.cuisine || cuisine || 'Mixed',
          difficulty: validDifficulty,
          nutritionalInfo: nutritionalInfo,
          imageUrl: imageUrl
        };
      });
      
      // Wait for all recipes with images to be processed
      const recipes = await Promise.all(recipePromises);
      
      // Save recipes to database
      await Recipe.insertMany(recipes.map(recipe => ({
        ...recipe,
        // Remove the generated _id as MongoDB will create its own
        _id: undefined
      })));
      
      res.status(200).json({ success: true, recipes });
    } catch (error) {
      console.error('Error parsing or saving recipes:', error);
      
      // Provide more detailed error messages
      if (error.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Recipe validation failed',
          errors: Object.values(error.errors).map(e => e.message)
        });
      }
      
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate recipes', 
        error: error.message 
      });
    }
  } catch (error) {
    console.error('Recipe generation error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to generate recipes', 
      error: error.message 
    });
  }
};

// @desc    Get saved recipes
// @route   GET /api/recipes
// @access  Public
exports.getRecipes = async (req, res) => {
  try {
    const recipes = await Recipe.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, recipes });
  } catch (error) {
    console.error('Get recipes error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get recipe by ID
// @route   GET /api/recipes/:id
// @access  Public
exports.getRecipeById = async (req, res) => {
  try {
    const recipe = await Recipe.findById(req.params.id);
    
    if (!recipe) {
      return res.status(404).json({ success: false, message: 'Recipe not found' });
    }
    
    res.status(200).json({ success: true, recipe });
  } catch (error) {
    console.error('Get recipe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};