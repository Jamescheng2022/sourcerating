import json
import urllib.request
import os

etfs = [
    {"code": "511260", "secid": "1.511260"},
    {"code": "518880", "secid": "1.518880"},
    {"code": "159941", "secid": "0.159941"},
    {"code": "510300", "secid": "1.510300"},
    {"code": "159915", "secid": "0.159915"},
    {"code": "159995", "secid": "0.159995"},
    {"code": "561910", "secid": "1.561910"},
    {"code": "515220", "secid": "1.515220"},
    {"code": "159985", "secid": "0.159985"},
    {"code": "512800", "secid": "1.512800"},
    {"code": "515030", "secid": "1.515030"}
]

def fetch_json(url):
    print(f"Fetching {url}")
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def main():
    result = {}
    for etf in etfs:
        code = etf["code"]
        secid = etf["secid"]
        
        # Daily
        daily_url = f"https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&fields1=f1&fields2=f51,f52,f53,f54,f55&klt=101&fqt=0&end=20990101&lmt=300"
        daily_data = fetch_json(daily_url)
        daily_closes = [float(k.split(',')[2]) for k in daily_data["data"]["klines"]]
        
        # Weekly
        weekly_url = f"https://push2his.eastmoney.com/api/qt/stock/kline/get?secid={secid}&fields1=f1&fields2=f51,f52,f53,f54,f55&klt=102&fqt=0&end=20990101&lmt=100"
        weekly_data = fetch_json(weekly_url)
        weekly_closes = [float(k.split(',')[2]) for k in weekly_data["data"]["klines"]]
        
        result[code] = {
            "daily_closes": daily_closes,
            "weekly_closes": weekly_closes
        }
    
    with open("closes_data.json", "w") as f:
        json.dump(result, f, indent=2)
    print("Saved to closes_data.json")

if __name__ == "__main__":
    main()

