const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const OUTPUT_DIR = path.join(__dirname, '../src/data');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'exercises.json');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

https.get(URL, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const db = JSON.parse(data);
      console.log(`Downloaded ${db.length} exercises.`);
      
      // Filter and map to a smaller object
      const slimDb = db.map(ex => ({
        id: ex.id,
        name: ex.name,
        equipment: ex.equipment,
        target: ex.primaryMuscles && ex.primaryMuscles.length > 0 ? ex.primaryMuscles[0] : (ex.category || 'misc')
      }));

      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(slimDb));
      console.log(`Saved slim database to ${OUTPUT_FILE}`);
      console.log(`File size: ${(fs.statSync(OUTPUT_FILE).size / 1024).toFixed(2)} KB`);

    } catch(e) {
      console.error('Error parsing JSON', e);
    }
  });
}).on('error', (e) => {
  console.error('Error fetching data', e);
});
