const fs = require('fs');
const https = require('https');

// Load Config
const config = JSON.parse(fs.readFileSync('project/wechat_config.json', 'utf8'));
const { appId, appSecret, defaultThumbMediaId, author } = config;

// Article HTMLs (Relative to workspace root or provided absolute paths)
const files = [
    'project/daily_articles/article4_uzbekistan.html',
    'project/daily_articles/article5_peru.html',
    'project/daily_articles/article6_brazil.html'
];

const titles = [
    '在撒马尔罕，骆驼铃声换成了电流声',
    '在安第斯山脉，矿井里的卡车没有人开',
    '在巴西雨林，快递也能跑出“中国速度�?
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
            // Extract body content (between <body> and </body>)
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

