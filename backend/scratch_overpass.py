import requests

query = """[out:json];
area["name"="Kullu"]->.searchArea;
node["place"="village"](area.searchArea);
out max=10;"""

res = requests.post('https://overpass-api.de/api/interpreter', data=query, headers={'User-Agent': 'Mozilla/5.0'})
print(res.status_code)
if res.status_code == 200:
    print([x['tags'].get('name') for x in res.json().get('elements', [])])
else:
    print(res.text)
