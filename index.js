const micro = require('micro')
const stripe = require('stripe')('sk_test_TrkNTx6ieFrACpGxHi0jHUmC')
const firebase = require("firebase-admin")
// const { composeP } = require("ramda")
const cert = require('./privateKey.json')

const { json, send } = micro

firebase.initializeApp({
  credential: firebase.credential.cert(cert),
  databaseURL: "https://koken-addons.firebaseio.com",
});


/**
 * Create a charge
 * @param token
 */
const createCharge = async token  => stripe.charges.create({
  amount: 6000,
  currency: "usd",
  description: "Example charge",
  source: token,
})

/**
 * Save the charge to the user
 * @param user
 */
const addChargeToUser = user => ({ id, amount, livemode, paid, status, description }) => {
  const chargeRef = firebase.database()
    .ref(`users/${user.uid}/charges/${id}`)
  chargeRef.set({ id, amount, livemode, paid, status, description })
  return { user, charge: id }
}


/**
 * server
 */
const server = micro(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*')

  if(req.url !== '/user/create' || req.method !== 'POST') {
    return send(res, 404, { message: 'Not found' })
  }

  const auth = firebase.auth()
  const { email, password, firstName, lastName} = await json(req)

  // TODO this won't work for just first names
  const displayName = firstName || (firstName && lastName) && `${firstName} ${lastName}`

  try {
    return await auth.createUser({ email, password, displayName })
  } catch(e) {
    return send(res, 400, e)
  }

})


server.listen(3001)