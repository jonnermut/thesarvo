import cf from 'cloudfront'

// The CloudFront Function in front of the site (viewer request; scripts/cloudfront-setup.sh publishes it with the thesarvo-redirects store).
const kvs = cf.kvs()

function redirect(to) {
  return { statusCode: 301, statusDescription: 'Moved Permanently', headers: { location: { value: to }, 'cache-control': { value: 'public, max-age=3600' } } }
}

async function find(key) {
  try {
    return await kvs.get(key)
  } catch (e) {
    return null
  }
}

async function handler(event) {
  var r = event.request
  var u = r.uri
  // www.thesarvo.com is the same site: send it to the bare address, path and query kept.
  if (r.headers.host && r.headers.host.value === 'www.thesarvo.com') {
    var q = Object.keys(r.querystring).map(function (k) { var v = r.querystring[k]; return v.multiValue ? v.multiValue.map(function (m) { return k + '=' + m.value }).join('&') : v.value === '' ? k : k + '=' + v.value }).join('&')
    return redirect('https://thesarvo.com' + u + (q ? '?' + q : ''))
  }
  // The mobile apps' old sync endpoints (scripts/legacy-app): fixed "nothing changed" answers.
  if (u.indexOf('/confluence/plugins/servlet/guide/index/') === 0) { r.uri = '/legacy-app/index.json'; return r }
  if (u.indexOf('/confluence/plugins/servlet/guide/sync/') === 0) { r.uri = '/legacy-app/sync.xml'; return r }
  // Old Confluence addresses (src/guide/content/redirects.ts builds the store): pages by title or id, attachments of guides; anything else goes home.
  if (u.indexOf('/confluence/') === 0 || u === '/confluence') {
    var m = /^\/confluence\/display\/([^/]+)\/(.+)$/.exec(u)
    if (m) {
      try { var title = decodeURIComponent(m[2].replace(/\+/g, ' ')).toLowerCase() } catch (e) { title = m[2].toLowerCase() }
      var to = await find('t:' + m[1].toLowerCase() + '/' + title)
      if (to) return redirect(to)
    }
    var id = r.querystring.pageId && r.querystring.pageId.value
    if (id) {
      var page = await find('p:' + id)
      if (page) return redirect(page)
    }
    var a = /^\/confluence\/download\/(?:attachments|thumbnails)\/(\d+)\/(.+)$/.exec(u)
    if (a && (await find('a:' + a[1]))) return redirect('/images/' + a[1] + '/' + a[2])
    return redirect('/g/')
  }
  if (u.endsWith('/')) r.uri += 'index.html'
  else if (u.split('/').pop().indexOf('.') === -1) r.uri += '/index.html'
  return r
}
