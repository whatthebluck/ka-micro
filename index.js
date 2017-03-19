const micro = require('micro')
const firebase = require("firebase-admin")
const cert = require('./privateKey.json')
const pathMatch = require('path-match')
const { parse } = require('url')

const { json, send } = micro

firebase.initializeApp({
  credential: firebase.credential.cert(cert),
  databaseURL: "https://koken-addons.firebaseio.com",
});


/**
 * server
 */
const server = micro(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*')


  const route = pathMatch()
  const {pathname} = parse(req.url)

  const getUserMatch = route('/user')
  const getUser = getUserMatch(pathname)

  const createUserMatch = route('/user/create')
  const createUser = createUserMatch(pathname)

  if(getUser && req.method === 'GET') {
    try {
      const token = req.headers.authorization.replace('Bearer ', '')
      return await firebase.auth().verifyIdToken(token)
    } catch(e) {
      return send(res, 400, e)
    }
  }

  if(createUser && req.method === 'POST') {
    const auth = firebase.auth()
    const { email, password, firstName, lastName} = await json(req)

    // TODO this won't work for just first names
    const displayName = firstName || (firstName && lastName) && `${firstName} ${lastName}`

    try {
      return await auth.createUser({ email, password, displayName })
    } catch(e) {
      return send(res, 400, e)
    }
  }

  return send(res, 404, { message: 'Not found' })

})


server.listen(3001)