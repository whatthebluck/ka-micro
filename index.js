const micro = require('micro')
const stripe = require('stripe')('sk_test_TrkNTx6ieFrACpGxHi0jHUmC')
const firebase = require("firebase-admin")
const { composeP } = require("ramda")
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
const createCharge = async token  =>
  stripe.charges.create({
    amount: 6000,
    currency: "usd",
    description: "Example charge",
    source: token,
  })


/**
 * Create or retrieve a user
 * @param email
 * @param password
 * @param firstName
 * @param lastName
 */
const createOrGetUser = async (email, password, firstName, lastName) => {
  const auth = firebase.auth()
  const displayName = firstName || (firstName && lastName) && `${firstName} ${lastName}`
  try {
    return await auth.getUserByEmail(email)
  } catch(e) {
    return await auth.createUser({ email, password, displayName })
  }
}


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

  const { token, email, password, firstName, lastName} = await json(req)

  res.setHeader('Access-Control-Allow-Origin', '*');

  if(req.url === '/user/create' && req.method === 'POST') {
    const user = await createOrGetUser(email, password, firstName, lastName)
    const createChargeAndAddToUser = composeP(addChargeToUser(user), createCharge)
    return createChargeAndAddToUser(token)
  }

  const statusCode = 404
  const data = { error: 'Not found' }
  return send(res, statusCode, data)

})


server.listen(3001)