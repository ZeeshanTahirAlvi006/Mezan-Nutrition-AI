import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import dotenv from 'dotenv';
import FoodItem from '../models/FoodItem.js';
import connectDB from '../config/db.js';

dotenv.config();

/**
 * @desc Imports a Kaggle CSV dataset into the Food database
 * Matches wide variety of Kaggle columns to our schema
 */
const importCsv = async (filePath) => {
  const results = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => {
        // Normalizing common Kaggle column names (Case-insensitive)
        const normalize = (keys, obj) => {
          for (let key of keys) {
            // Find key that contains our target string (e.g. "Calories (kcal)" matches "Calories")
            const found = Object.keys(obj).find(k => k.toLowerCase().includes(key.toLowerCase()));
            if (found) {
              const val = obj[found];
              if (val === 't' || val === 'trace') return 0;
              return parseFloat(val) || 0;
            }
          }
          return 0;
        };

        // Find the most likely "Name" column
        const nameKeys = ['food_item', 'food', 'item', 'description', 'name'];
        const nameFound = Object.keys(data).find(k => nameKeys.includes(k.toLowerCase()));
        const name = nameFound ? data[nameFound] : null;

        if (name && name.trim()) {
          results.push({
            name: name.trim(),
            calories: normalize(['calories', 'kcal', 'caloric value', 'energy'], data),
            protein: normalize(['protein', 'prot'], data),
            carbs: normalize(['carbohydrates', 'carbs', 'carb'], data),
            fats: normalize(['fat', 'fats', 'lipid'], data),
            sugar: normalize(['sugar', 'sugars'], data),
            sodium: normalize(['sodium', 'na'], data),
            category: data.category || data.group || data.Meal_Type || 'Kaggle Dataset'
          });
        }
      })
      .on('end', async () => {
        try {
          if (results.length === 0) {
            console.log(`⚠️ No valid data found in ${path.basename(filePath)}`);
            return resolve();
          }

          console.log(`🚀 Found ${results.length} items in ${path.basename(filePath)}. Importing...`);

          // Use bulk insert for performance
          const CHUNK_SIZE = 1000;
          for (let i = 0; i < results.length; i += CHUNK_SIZE) {
            const chunk = results.slice(i, i + CHUNK_SIZE);
            await FoodItem.insertMany(chunk, { ordered: false }).catch(e => {
              // Ignore duplicates if they happen
            });
          }

          resolve();
        } catch (err) {
          reject(err);
        }
      })
      .on('error', reject);
  });
};

const run = async () => {
  // Use provided path or search for "archive" folders automatically
  let datasetPath = process.argv[2];

  try {
    await connectDB();
    console.log('🔗 Connected to DB. Starting Master Training Session...');

    const searchFolders = (dir) => {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(searchFolders(fullPath));
        } else if (fullPath.toLowerCase().endsWith('.csv')) {
          results.push(fullPath);
        }
      });
      return results;
    };

    let csvFiles = [];
    if (datasetPath) {
      const absolute = path.resolve(datasetPath);
      if (fs.statSync(absolute).isDirectory()) {
        csvFiles = searchFolders(absolute);
      } else {
        csvFiles = [absolute];
      }
    } else {
      // Auto-discover "archive" folders in the workspace
      const workspaceRoot = path.join(process.cwd(), '..');
      console.log(`📂 Searching for datasets in: ${workspaceRoot}`);
      const allDirs = fs.readdirSync(workspaceRoot).map(d => path.join(workspaceRoot, d)).filter(d => fs.statSync(d).isDirectory() && d.toLowerCase().includes('archive'));

      allDirs.forEach(dir => {
        csvFiles = csvFiles.concat(searchFolders(dir));
      });
    }

    // SPECIAL CASE: Pakistani Recipe Dataset (archive 6)
    // We need to join recipes_master.csv with recipe_nutrition.csv
    const masterFile = csvFiles.find(f => f.includes('recipes_master.csv'));
    const nutritionFile = csvFiles.find(f => f.includes('recipe_nutrition.csv'));

    if (masterFile && nutritionFile) {
      console.log('🥘 Detected Recipe Dataset! Performing Smart Join...');
      const recipeNames = {};

      // Load names first
      await new Promise((resolve) => {
        fs.createReadStream(masterFile)
          .pipe(csv())
          .on('data', (data) => {
            if (data.recipe_id && data.recipe_name) {
              recipeNames[data.recipe_id] = {
                name: data.recipe_name,
                category: `${data.cuisine} ${data.category}`,
                halal: data.is_halal === 'True'
              };
            }
          })
          .on('end', resolve);
      });

      // Import with names
      const recipeResults = [];
      await new Promise((resolve) => {
        fs.createReadStream(nutritionFile)
          .pipe(csv())
          .on('data', (data) => {
            const master = recipeNames[data.recipe_id];
            if (master) {
              recipeResults.push({
                name: master.name,
                calories: parseFloat(data.calories) || 0,
                protein: parseFloat(data.protein_g) || 0,
                carbs: parseFloat(data.carbohydrates_g) || 0,
                fats: parseFloat(data.fat_g) || 0,
                sugar: parseFloat(data.sugar_g) || 0,
                sodium: parseFloat(data.sodium_mg) || 0,
                category: master.category + (master.halal ? ' (Halal)' : '')
              });
            }
          })
          .on('end', async () => {
            console.log(`🚀 Joined and importing ${recipeResults.length} recipes...`);
            await FoodItem.insertMany(recipeResults, { ordered: false }).catch(() => { });
            resolve();
          });
      });

      // Remove these from the standard processing list
      csvFiles = csvFiles.filter(f => f !== masterFile && f !== nutritionFile);
    }

    if (csvFiles.length === 0) {
      console.log('❌ No CSV datasets found to train from.');
      process.exit(0);
    }

    console.log(`📝 Found ${csvFiles.length} dataset(s). Starting batch import...`);

    for (const file of csvFiles) {
      console.log(`----------------------------------------`);
      console.log(`📄 Processing: ${path.relative(process.cwd(), file)}`);
      await importCsv(file);
    }

    console.log(`\n🎉 Training Complete! Your agents have been nourished with all available data.`);
    process.exit();
  } catch (err) {
    console.error('❌ Training Failed:', err.message);
    process.exit(1);
  }
};

run();
