const micro = require('micro')
const stripe = require('stripe')('sk_test_TrkNTx6ieFrACpGxHi0jHUmC')
const firebase = require("firebase-admin")
const { composeP, compose} = require("ramda")
const cert = require('./privateKey.json')

const { json, send } = micro

firebase.initializeApp( {
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
 */
const createOrGetUser = async (email, password) => {
  const auth = firebase.auth()
  try {
    return await auth.getUserByEmail(email)
  } catch(e) {
    return await auth.createUser({ email, password })
  }
}

/**
 * Save the charge to the user
 * @param user
 */
const addChargeToUser = user => charge => {


  const chargeRef = firebase.database()
    .ref(`users/${user.uid}/charges/${charge.id}`)

  const chargeValues = {
    amount: charge.amount,
    livemode: charge.livemode,
    paid: charge.paid,
    status: charge.status,
    description: charge.description,
  }

  // async
  chargeRef.set(chargeValues);

  return { user, charge }

}

const server = micro(async (req, res) => {

  res.setHeader('Access-Control-Allow-Origin', '*');

  const { token, email, password} = await json(req)

  const user = await createOrGetUser(email, password)

  if(req.url === '/user/create' && req.method === 'POST') {

    const user = await createOrGetUser(email, password)

    const createChargeAndAddToUser = composeP(addChargeToUser(user), createCharge)

    return createChargeAndAddToUser(token)

  }

  const statusCode = 404
  const data = { error: 'Not found' }
  return send(res, statusCode, data)

})

server.listen(3001)