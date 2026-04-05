const https = require('https');
const fs = require('fs');

const APPID = 'wx30bb5a87832ca561';
const SECRET = '180617ce1cde7d3ea31fd7b767c171b9';
const OUT = 'C:\\Users\\cheng\\.accio\\accounts\\1749993920\\agents\\DID-F456DA-2B0D4C\\project\\wx_add_draft_result.txt';

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', e => resolve('ERROR:' + e.message));
  });
}

function httpsPost(url, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const bodyBuf = Buffer.from(JSON.stringify(body), 'utf8');
    const req = https.request({
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': bodyBuf.length
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', e => resolve('ERROR:' + e.message));
    req.write(bodyBuf);
    req.end();
  });
}

async function main() {
  const lines = [];
  
  // Get token
  const tokenResp = await httpsGet(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${APPID}&secret=${SECRET}`);
  const token = JSON.parse(tokenResp).access_token;
  lines.push('Token: OK');

  // Use existing thumb_media_id from the first image
  const thumbMediaId = 'IFNJumMtWp3vlg0h4z7QyhSa7KzsGVW0vBMS4_bh0QN_tAQFM20NowUTgue2oQTA';

  // Test adding a draft
  const testContent = '<p>这是一篇测试草稿，验证API连通性�?/p>';
  const draftBody = {
    articles: [{
      title: '【测试】API连通性验�?,
      author: '智规GLOBAL',
      content: testContent,
      thumb_media_id: thumbMediaId,
      need_open_comment: 0,
      only_fans_can_comment: 0
    }]
  };

  const addResp = await httpsPost(`https://api.weixin.qq.com/cgi-bin/draft/add?access_token=${token}`, draftBody);
  lines.push('ADD_DRAFT: ' + addResp);

  // If successful, delete the test draft
  try {
    const addData = JSON.parse(addResp);
    if (addData.media_id) {
      lines.push('Draft created with media_id: ' + addData.media_id);
      // Delete it
      const delResp = await httpsPost(`https://api.weixin.qq.com/cgi-bin/draft/delete?access_token=${token}`, {
        media_id: addData.media_id
      });
      lines.push('DELETE_DRAFT: ' + delResp);
    }
  } catch(e) {
    lines.push('Parse error: ' + e.message);
  }

  fs.writeFileSync(OUT, lines.join('\n'), 'utf8');
  console.log('Done');
}

main().catch(e => console.log('Fatal:', e.message));

