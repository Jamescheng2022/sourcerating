const https = require('https');
const fs = require('fs');
const path = require('path');

const configPath = path.join(__dirname, 'wechat_config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

const articlesDir = path.join(__dirname, 'daily_articles');

const articles = [
  {
    title: '中国手机卖遍了全球，�?3%的利润被苹果一家拿走了',
    file: 'article_phone_profit.html'
  },
  {
    title: '中国修了全球70%的高铁，但只卖出去了一�?,
    file: 'article_highspeed_rail.html'
  },
  {
    title: '中国每年�?6万留学生去美国，为什么硅谷CEO全是印度�?,
    file: 'article_silicon_valley_ceo.html'
  }
];

function httpsRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { resolve(data); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

async function getToken() {
  const url = `/cgi-bin/token?grant_type=client_credential&appid=${config.appId}&secret=${config.appSecret}`;
  const options = { hostname: 'api.weixin.qq.com', path: url, method: 'GET' };
  const result = await httpsRequest(options);
  if (result.access_token) {
    console.log('Token obtained successfully');
    return result.access_token;
  }
  throw new Error('Failed to get token: ' + JSON.stringify(result));
}

async function addDraft(token) {
  const articleList = articles.map(a => {
    const content = fs.readFileSync(path.join(articlesDir, a.file), 'utf8');
    return {
      title: a.title,
      author: config.author || '智规GLOBAL',
      content: content,
      thumb_media_id: config.defaultThumbMediaId,
      need_open_comment: 1,
      only_fans_can_comment: 0
    };
  });

  const body = JSON.stringify({ articles: articleList });
  const bodyBuf = Buffer.from(body);
  
  const options = {
    hostname: 'api.weixin.qq.com',
    path: `/cgi-bin/draft/add?access_token=${token}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': bodyBuf.length
    }
  };

  const result = await httpsRequest(options, bodyBuf);
  return result;
}

async function main() {
  try {
    console.log('Getting access token...');
    const token = await getToken();
    
    console.log('Adding draft with 3 detective-model articles...');
    const result = await addDraft(token);
    console.log('Draft result:', JSON.stringify(result, null, 2));
    
    if (result.media_id) {
      console.log('SUCCESS! Draft added. media_id:', result.media_id);
    } else {
      console.log('FAILED:', JSON.stringify(result));
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();

