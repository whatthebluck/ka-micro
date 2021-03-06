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
  res.setHeader('Access-Control-Allow-Headers', 'Authorization')

  const route = pathMatch()
  const {pathname} = parse(req.url)

  const getUserMatch = route('/user')
  const getUser = getUserMatch(pathname)

  const createChargeMatch = route('/charge/create')
  const createCharge = createChargeMatch(pathname)

  if(req.method === 'OPTIONS') return send(res, 200)

  if(getUser) {
    try {
      const token = req.headers.authorization.replace('Bearer ', '')
      return await firebase.auth().verifyIdToken(token)
    } catch(e) {
      return send(                                                            res, 400, e.message)
    }
  }

 if(createCharge) {
    const { token, user, product } = await json(req)

    try {
      // Charge the user's card:
      const charge = await stripe.charges.create({
        description: `Koken Addons ${product.name}`,
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
      return send(res, 400, e.message)
    }
  }

  return send(res, 404, { message: 'Not found' })

})


server.listen(3001)