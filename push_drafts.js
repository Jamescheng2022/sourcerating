const fs = require('fs');
const https = require('https');

// Load Config
const config = JSON.parse(fs.readFileSync('project/wechat_config.json', 'utf8'));
const { appId, appSecret, defaultThumbMediaId, author } = config;

// Article HTMLs (Relative to workspace root or provided absolute paths)
const files = [
    'project/daily_articles/article1_mexico.html',
    'project/daily_articles/article2_saudi.html',
    'project/daily_articles/article3_europe.html'
];

const titles = [
    '在特斯拉的家门口，中国工厂正在拔地而起',
    '在利雅得，AI正在说中国话',
    '这个德国冬天，是“佛山制造”救了欧洲人的命'
];

async function getAccessToken() {
    return new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                const json = JSON.parse(data);
                if (json.access_token) {
                    resolve(json.access_token);
                } else {
                    reject(new Error(`Failed to get token: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function addDraft(token, articles) {
    return new Promise((resolve, reject) => {
        const url = `https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`;
        const req = https.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify({ articles }));
        req.end();
    });
}

(async () => {
    try {
        console.log('Fetching access token...');
        const token = await getAccessToken();
        
        console.log('Preparing articles...');
        const articleData = files.map((file, i) => {
            const content = fs.readFileSync(file, 'utf8');
            // Extract body content (between <body> and </body>) or use full if simple
            // For WeChat, pure HTML is fine, but we should strip <html>/<body> if present
            const match = content.match(/<body>([\s\S]*)<\/body>/);
            const html = match ? match[1].trim() : content;
            
            return {
                title: titles[i],
                author: author,
                content: html,
                thumb_media_id: defaultThumbMediaId,
                need_open_comment: 1,
                only_fans_can_comment: 0
            };
        });

        console.log('Adding to draft box...');
        const result = await addDraft(token, articleData);
        console.log('Result:', JSON.stringify(result, null, 2));
        
        if (result.media_id) {
            console.log('SUCCESS: Draft added with media_id:', result.media_id);
        } else {
            console.error('FAILED: ', result);
            process.exit(1);
        }
    } catch (err) {
        console.error('CRITICAL ERROR:', err);
        process.exit(1);
    }
})();

