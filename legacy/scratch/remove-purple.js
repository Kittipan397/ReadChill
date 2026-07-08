const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const jsDir = path.join(publicDir, 'js');

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
            
            // Remove inline background-color for buttons
            content = content.replace(/background-color:\s*#a855f7;?/gi, '');
            content = content.replace(/background:\s*#a855f7;?/gi, '');
            
            // Replace color: #a855f7 with color: var(--text-primary)
            content = content.replace(/color:\s*#a855f7;?/gi, 'color: var(--text-primary);');
            
            // Fix admin.js specifically for the toggle button
            // style="background-color: ${isPartner ? 'var(--card-border)' : '#a855f7'}; color: ${isPartner ? 'var(--text-primary)' : '#fff'};"
            content = content.replace(/'#a855f7'/g, "'var(--text-primary)'");
            content = content.replace(/'#fff'/g, "'var(--bg-color)'");

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Cleaned purple from ${file}`);
            }
        }
    });
}

processDir(publicDir);
