const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');

const linksHTML = `
                    <a href="partner.html" id="partner-link" class="hidden"
                        style="margin-right: 0.5rem; color: #a855f7; font-weight: bold; font-size: 0.85rem;"><ion-icon
                            name="create-outline"></ion-icon> แดชบอร์ดนักเขียน</a>
                    <a href="admin.html" id="admin-link" class="hidden"
                        style="margin-right: 0.5rem; color: #ffb703; font-weight: bold; font-size: 0.85rem;"><ion-icon
                            name="settings-outline"></ion-icon> จัดการ</a>
`;

fs.readdirSync(publicDir).forEach(file => {
    if (file.endsWith('.html')) {
        const filePath = path.join(publicDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Remove existing admin-link and partner-link to avoid duplicates
        content = content.replace(/<a\s+href="partner\.html"\s+id="partner-link"[\s\S]*?<\/a>/g, '');
        content = content.replace(/<a\s+href="admin\.html"\s+id="admin-link"[\s\S]*?<\/a>/g, '');
        
        // Inject right before logout-btn
        const logoutBtnIndex = content.indexOf('<button id="logout-btn"');
        if (logoutBtnIndex !== -1) {
            content = content.slice(0, logoutBtnIndex) + linksHTML + content.slice(logoutBtnIndex);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`Updated ${file}`);
        } else {
            console.log(`No logout-btn found in ${file}`);
        }
    }
});
