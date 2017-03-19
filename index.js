const micro = require('micro')
const firebase = require("firebase-admin")
const cert = require('./privateKey.json')
const pathMatch = require('path-match')
const { parse } = require('url')
const stripe = require('stripe')('sk_test_TrkNTx6ieFrACpGxHi0jHUmC')

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

  const createChargeMatch = route('/charge/create')
  const createCharge = createChargeMatch(pathname)

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

 if(createCharge && req.method === 'POST') {
    const { token, user, product } = await json(req)

    try {
      // Charge the user's card:
      const charge = await stripe.charges.create({
        description: product.excerpt,
        amount: product.price,
        currency: 'USD',
        source: token.id,
        statement_descriptor: `Koken Addons ${product.name}`
      })

      const db = firebase.database();
      const ref = db.ref(`users/${user.uid}/products/${product.id}`)
      const expiry = new Date().setFullYear(new Date().getFullYear() + 1)
      return ref.set({ charge: charge.id, expiry, product: product.id})
    } catch(e) {
      console.log(e)
      return send(res, 400, e)
    }
  }

  return send(res, 404, { message: 'Not found' })

})


server.listen(3001)