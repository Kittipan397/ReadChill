const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('http://localhost:4000')) {
                // Handle template literals `http://localhost:4000/...`
                content = content.replace(/`http:\/\/localhost:4000/g, '`${process.env.NEXT_PUBLIC_API_URL}');
                // Handle single/double quotes 'http://localhost:4000/...'
                content = content.replace(/['"]http:\/\/localhost:4000(.*?)[`'"]/g, '`${process.env.NEXT_PUBLIC_API_URL}$1`');
                
                fs.writeFileSync(fullPath, content);
                console.log(`Updated ${fullPath}`);
            }
        }
    }
}

processDir(path.join(__dirname, 'readchill-frontend', 'src'));
processDir(path.join(__dirname, 'readchill-admin', 'src'));
