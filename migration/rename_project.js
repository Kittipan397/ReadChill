const fs = require('fs');
const path = require('path');

const projectRoots = [
  path.join(__dirname, '../readchill-go-backend'),
  path.join(__dirname, '../readchill-frontend/src')
];

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  content = content.replace(/mangas/g, 'webtoons');
  content = content.replace(/Mangas/g, 'Webtoons');
  content = content.replace(/manga/g, 'webtoon');
  content = content.replace(/Manga/g, 'Webtoon');
  content = content.replace(/MANGA/g, 'WEBTOON');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated file: ${filePath}`);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      // Avoid node_modules, .git, etc
      if (!['node_modules', '.git', '.next', 'out'].includes(file)) {
        walkDir(filePath);
      }
    } else {
      if (filePath.endsWith('.go') || filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        replaceInFile(filePath);
      }
    }
  }
}

console.log('Starting string replacement...');
for (const root of projectRoots) {
  walkDir(root);
}

// Rename files and directories
function renamePaths() {
  const renames = [
    {
      from: path.join(__dirname, '../readchill-go-backend/internal/handlers/manga.go'),
      to: path.join(__dirname, '../readchill-go-backend/internal/handlers/webtoon.go')
    },
    {
      from: path.join(__dirname, '../readchill-frontend/src/app/manga'),
      to: path.join(__dirname, '../readchill-frontend/src/app/webtoon')
    },
    {
      from: path.join(__dirname, '../readchill-frontend/src/components/ui/MangaCard.tsx'),
      to: path.join(__dirname, '../readchill-frontend/src/components/ui/WebtoonCard.tsx')
    }
  ];

  for (const r of renames) {
    if (fs.existsSync(r.from)) {
      fs.renameSync(r.from, r.to);
      console.log(`Renamed: ${r.from} -> ${r.to}`);
    }
  }
}

renamePaths();
console.log('Replacement and renaming complete.');
