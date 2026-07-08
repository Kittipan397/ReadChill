const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

function processDir(directory) {
    fs.readdirSync(directory).forEach(file => {
        const filePath = path.join(directory, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'css' && file !== 'img') {
                processDir(filePath);
            }
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;
            
            // Replace yellow admin link color with text-primary
            content = content.replace(/color:\s*#ffb703;?/gi, 'color: var(--text-primary);');

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Cleaned yellow from ${file}`);
            }
        }
    });
}

processDir(publicDir);
